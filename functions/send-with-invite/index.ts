import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "You must be signed in." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("WITH_INVITE_FROM_EMAIL") || "With <invites@imwith.me>";

    if (!supabaseUrl || !serviceRole || !resendApiKey) {
      return json({ error: "Invite email is not configured yet." }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Your session is no longer valid." }, 401);

    const body = await req.json();
    const recipientEmail = String(body?.email || "").trim().toLowerCase();
    const inviteCode = String(body?.inviteCode || "").trim().toUpperCase();
    const inviteUrl = String(body?.inviteUrl || "").trim();

    if (!recipientEmail || !recipientEmail.includes("@")) return json({ error: "Enter a valid email address." }, 400);
    if (!inviteCode || !inviteUrl) return json({ error: "Invite information is missing." }, 400);
    if (recipientEmail === String(userData.user.email || "").toLowerCase()) {
      return json({ error: "You’re already in this With." }, 400);
    }

    const { data: membership, error: memberError } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (memberError || !membership?.household_id) return json({ error: "Your With could not be found." }, 403);

    const { data: household, error: householdError } = await admin
      .from("households")
      .select("name, invite_code")
      .eq("id", membership.household_id)
      .single();
    if (householdError || !household) return json({ error: "Your With could not be found." }, 404);
    if (String(household.invite_code || "").toUpperCase() !== inviteCode) {
      return json({ error: "That invite code does not belong to your With." }, 403);
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("name")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const inviterName = String(profile?.name || "Someone");
    const withName = String(household.name || "their With");
    const safeInviter = escapeHtml(inviterName);
    const safeWithName = escapeHtml(withName);
    const safeInviteUrl = escapeHtml(inviteUrl);

    // Placeholder copy for now. Replace the wording once final invite copy is supplied.
    const subject = `${inviterName} invited you to join ${withName} on With`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#252422;line-height:1.55">
        <h1 style="font-size:28px;margin-bottom:8px">You’re invited to With.</h1>
        <p><strong>${safeInviter}</strong> invited you to join <strong>${safeWithName}</strong>.</p>
        <p>With is a private place to take care of your own health alongside people you trust. Your goals and health information stay yours.</p>
        <p style="margin:28px 0">
          <a href="${safeInviteUrl}" style="display:inline-block;background:#F06A24;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Join this With</a>
        </p>
        <p style="font-size:13px;color:#746F68">If the button doesn’t work, use this link:<br><a href="${safeInviteUrl}">${safeInviteUrl}</a></p>
      </div>
    `;
    const text = `${inviterName} invited you to join ${withName} on With. Join here: ${inviteUrl}`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject,
        html,
        text,
      }),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) {
      return json({ error: resendData?.message || "The invite email could not be sent." }, 502);
    }

    return json({ ok: true, id: resendData?.id || null });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "The invite email could not be sent." }, 400);
  }
});
