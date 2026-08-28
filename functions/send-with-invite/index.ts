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

    const subject = `${inviterName} invited you to With`;
    const html = `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0">Track your health with ${safeInviter}.</div>
      <div style="margin:0;padding:28px 14px;background:#1F5E57;font-family:Arial,sans-serif;color:#171816;">
        <div style="max-width:560px;margin:0 auto;background:#FCFBF8;border-radius:20px;overflow:hidden;box-shadow:0 14px 40px rgba(17,50,46,.18);">
          <div style="padding:28px 30px 18px;background:#1F5E57;color:#fff;">
            <div style="font-family:Georgia,serif;font-size:32px;font-weight:700;line-height:1;">With</div>
            <div style="margin-top:7px;font-size:12px;color:rgba(255,255,255,.76);">We’re in this together.</div>
          </div>
          <div style="padding:30px;">
            <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;line-height:1.12;margin-bottom:16px;">${safeInviter} invited you to With.</div>
            <p style="margin:0 0 14px;line-height:1.6;color:#5D615F;">With is a simple, private place to take care of your health alongside people you trust.</p>
            <p style="margin:0 0 14px;line-height:1.6;color:#5D615F;">Track the things that matter to you, like nutrition, movement, water and weight, while ${safeInviter} works toward their own goals too.</p>
            <p style="margin:0 0 24px;line-height:1.6;color:#171816;"><strong>Your goals are yours. Their goals are theirs.</strong> You’re just doing life alongside each other.</p>
            <a href="${safeInviteUrl}" style="display:inline-block;background:#1F5E57;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700;">Join ${safeInviter} on With</a>
            <p style="font-size:12px;line-height:1.5;color:#8A8F94;margin:26px 0 0;">If the button doesn’t work, use this link:<br><a href="${safeInviteUrl}" style="color:#174E49;word-break:break-all;">${safeInviteUrl}</a></p>
          </div>
        </div>
      </div>
    `;
    const text = `Track your health with ${inviterName}.

${inviterName} invited you to With.

With is a simple, private way to track your health alongside the people you care about.

Track the things that matter to you, like nutrition, movement, water and weight, while ${inviterName} works toward their own goals too.

Your goals are yours. Their goals are theirs. You’re just doing it alongside each other.

Join ${inviterName} on With: ${inviteUrl}

With
We’re in this together.`;

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
