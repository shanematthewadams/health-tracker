import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeOrigin(req: Request) {
  try {
    const url = new URL(req.headers.get("Origin") || "");
    const host = url.hostname.toLowerCase();
    if (host === "imwith.me" || host.endsWith(".imwith.me") || host.endsWith(".netlify.app")) return url.origin;
  } catch {}
  return "https://imwith.me";
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
    if (!supabaseUrl || !serviceRole || !resendApiKey) return json({ error: "Invite email is not configured yet." }, 500);

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData.user) return json({ error: "Your session is no longer valid." }, 401);

    const body = await req.json();
    const recipientEmail = String(body?.email || "").trim().toLowerCase();
    let householdId = String(body?.householdId || "").trim();
    const legacyInviteCode = String(body?.inviteCode || "").trim().toUpperCase();
    if (!recipientEmail || !recipientEmail.includes("@")) return json({ error: "Enter a valid email address." }, 400);
    if (recipientEmail === String(userData.user.email || "").toLowerCase()) return json({ error: "You’re already in this With." }, 400);

    if (!householdId && legacyInviteCode) {
      const { data: householdByCode } = await admin.from("households").select("id").eq("invite_code", legacyInviteCode).maybeSingle();
      householdId = householdByCode?.id || "";
    }
    if (!householdId) return json({ error: "Choose a With first." }, 400);

    const { data: membership, error: memberError } = await admin.from("household_members").select("household_id").eq("household_id", householdId).eq("user_id", userData.user.id).maybeSingle();
    if (memberError || !membership?.household_id) return json({ error: "That With could not be found for your account." }, 403);

    const [{ data: household }, { data: profile }] = await Promise.all([
      admin.from("households").select("name").eq("id", householdId).single(),
      admin.from("profiles").select("name").eq("user_id", userData.user.id).maybeSingle(),
    ]);
    if (!household) return json({ error: "Your With could not be found." }, 404);

    const inviteToken = randomToken();
    const tokenHash = await sha256(inviteToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await admin.from("household_invitations").select("id").eq("household_id", householdId).eq("email", recipientEmail).eq("status", "pending").maybeSingle();
    let inviteId = existing?.id || null;

    if (inviteId) {
      const { error } = await admin.from("household_invitations").update({ token_hash: tokenHash, invited_by_user_id: userData.user.id, created_at: new Date().toISOString(), expires_at: expiresAt, accepted_at: null }).eq("id", inviteId);
      if (error) throw error;
    } else {
      const { data: created, error } = await admin.from("household_invitations").insert({ household_id: householdId, email: recipientEmail, token_hash: tokenHash, invited_by_user_id: userData.user.id, expires_at: expiresAt }).select("id").single();
      if (error) throw error;
      inviteId = created.id;
    }

    const inviterName = String(profile?.name || "Someone");
    const withName = String(household.name || "their With");
    const inviteUrl = new URL(safeOrigin(req));
    inviteUrl.searchParams.set("invite", inviteToken);
    inviteUrl.searchParams.set("inviter", inviterName);
    const safeInviter = escapeHtml(inviterName);
    const safeWithName = escapeHtml(withName);
    const safeInviteUrl = escapeHtml(inviteUrl.toString());
    const safeEmail = escapeHtml(recipientEmail);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: `${inviterName} invited you to With`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px;color:#162321"><div style="font-size:32px;font-weight:700;margin-bottom:20px">With</div><h1 style="font-size:26px;line-height:1.2;margin:0 0 12px">${safeInviter} invited you to join ${safeWithName}.</h1><p style="font-size:16px;line-height:1.6;color:#53615f;margin:0 0 22px">Your health stays yours. You only log once. This With is another private group of people sharing the experience with you.</p><a href="${safeInviteUrl}" style="display:inline-block;background:#1f5e57;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Join on With</a><p style="font-size:12px;line-height:1.5;color:#7b8785;margin-top:22px">This invitation was sent to ${safeEmail} and expires in 30 days.</p></div>`,
      }),
    });

    if (!resendResponse.ok) {
      if (inviteId) await admin.from("household_invitations").delete().eq("id", inviteId);
      return json({ error: "The invite email could not be sent." }, 502);
    }

    return json({ ok: true, householdId, email: recipientEmail, expiresAt });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "The invite email could not be sent." }, 400);
  }
});