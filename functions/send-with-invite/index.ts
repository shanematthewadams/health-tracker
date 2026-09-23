import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const DEFAULT_INVITE_COPY = {
  subject: "{{inviter_name}} invited you to With",
  preheader: "Join {{with_name}} on With.",
  headline: "{{inviter_name}} invited you to join {{with_name}}.",
  body_copy: "With is a private place to take care of yourself alongside people you trust.",
  cta_label: "Join on With",
  supporting_text: "Joining shares the experience, not your health data or targets.",
};

const escapeHtml = (value: string) => String(value || "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function restoreAllowedInlineTags(value: string) {
  return String(value || "")
    .replace(/&lt;(\/?)(b|strong|i|em)&gt;/gi, (_full, slash, tag) => `<${slash}${String(tag).toLowerCase()}>`)
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>");
}

function interpolateInline(value: string, data: Record<string, string>) {
  const source = restoreAllowedInlineTags(escapeHtml(value));
  return source.replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (_full, key) => escapeHtml(data[key] ?? ""));
}

function interpolate(value: string, data: Record<string, string>, html = false) {
  const source = html ? escapeHtml(value) : String(value || "");
  return source.replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (_full, key) => {
    const replacement = data[key] ?? "";
    return html ? escapeHtml(replacement) : replacement;
  });
}

function paragraph(value: string) {
  if (!value) return "";
  return `<p style="margin:0 0 14px;line-height:1.6;color:#171816;">${value.replaceAll("\n", "<br>")}</p>`;
}

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

function renderInviteHtml(copy: Record<string, string>, data: Record<string, string>) {
  const preheader = interpolate(copy.preheader, data, true);
  const headline = interpolate(copy.headline, data, true);
  const body = interpolateInline(copy.body_copy, data);
  const supporting = interpolateInline(copy.supporting_text, data);
  const cta = interpolate(copy.cta_label, data, true);
  const safeInviteUrl = escapeHtml(data.action_url);
  const safeEmail = escapeHtml(data.recipient_email);
  const safeDays = escapeHtml(data.expires_days);

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#1F5E57;font-family:Arial,Helvetica,sans-serif;color:#171816;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <div style="padding:28px 14px;">
      <div style="max-width:560px;margin:0 auto;background:#FCFBF8;border-radius:20px;overflow:hidden;box-shadow:0 14px 40px rgba(17,50,46,.18);">
        <div style="padding:24px 30px 18px;background:#1F5E57;color:#fff;">
          <img src="https://www.imwith.me/with-logo-email.svg" width="118" alt="With" style="display:block;border:0;width:118px;max-width:100%;height:auto;">
          <div style="margin-top:8px;font-size:12px;color:rgba(255,255,255,.76);">We’re in this together.</div>
        </div>
        <div style="padding:30px;">
          <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;line-height:1.12;margin-bottom:16px;">${headline}</div>
          ${paragraph(body)}
          ${supporting ? paragraph(supporting) : ""}
          <p style="margin:26px 0 0;">
            <a href="${safeInviteUrl}" style="display:inline-block;background:#1F5E57;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700;">${cta}</a>
          </p>
          <p style="font-size:13px;line-height:1.55;color:#5D615F;margin:22px 0 0;">This invitation was sent to ${safeEmail} and expires in ${safeDays} days.</p>
          <p style="font-size:12px;line-height:1.5;color:#8A8F94;margin:26px 0 0;">If the button doesn’t work, use this link:<br><a href="${safeInviteUrl}" style="color:#174E49;word-break:break-all;">${safeInviteUrl}</a></p>
        </div>
      </div>
    </div>
  </body>
</html>`;
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

    // Temporary compatibility keeps the deployed function safe while the staging
    // client finishes moving from legacy invite codes to stable With IDs.
    if (!householdId && legacyInviteCode) {
      const { data: householdByCode } = await admin
        .from("households")
        .select("id")
        .eq("invite_code", legacyInviteCode)
        .maybeSingle();
      householdId = householdByCode?.id || "";
    }
    if (!householdId) return json({ error: "Choose a With first." }, 400);

    const { data: membership, error: memberError } = await admin
      .from("household_members")
      .select("household_id")
      .eq("household_id", householdId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (memberError || !membership?.household_id) return json({ error: "That With could not be found for your account." }, 403);

    const [{ data: household }, { data: profile }, { data: emailCopy }] = await Promise.all([
      admin.from("households").select("name").eq("id", householdId).single(),
      admin.from("profiles").select("name").eq("user_id", userData.user.id).maybeSingle(),
      admin.from("transactional_email_content")
        .select("subject,preheader,headline,body_copy,cta_label,supporting_text")
        .eq("template_key", "with_invitation")
        .eq("active", true)
        .maybeSingle(),
    ]);
    if (!household) return json({ error: "Your With could not be found." }, 404);

    const inviteToken = randomToken();
    const tokenHash = await sha256(inviteToken);
    const expiresInDays = 30;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await admin
      .from("household_invitations")
      .select("id")
      .eq("household_id", householdId)
      .eq("email", recipientEmail)
      .eq("status", "pending")
      .maybeSingle();
    let inviteId = existing?.id || null;

    if (inviteId) {
      const { error } = await admin
        .from("household_invitations")
        .update({
          token_hash: tokenHash,
          invited_by_user_id: userData.user.id,
          created_at: new Date().toISOString(),
          expires_at: expiresAt,
          accepted_at: null,
        })
        .eq("id", inviteId);
      if (error) throw error;
    } else {
      const { data: created, error } = await admin
        .from("household_invitations")
        .insert({
          household_id: householdId,
          email: recipientEmail,
          token_hash: tokenHash,
          invited_by_user_id: userData.user.id,
          expires_at: expiresAt,
        })
        .select("id")
        .single();
      if (error) throw error;
      inviteId = created.id;
    }

    const inviterName = String(profile?.name || "Someone");
    const withName = String(household.name || "their With");
    const inviteUrl = new URL(safeOrigin(req));
    inviteUrl.searchParams.set("invite", inviteToken);
    inviteUrl.searchParams.set("inviter", inviterName);

    const copy = { ...DEFAULT_INVITE_COPY, ...(emailCopy || {}) };
    const variables = {
      inviter_name: inviterName,
      with_name: withName,
      recipient_email: recipientEmail,
      expires_days: String(expiresInDays),
      action_url: inviteUrl.toString(),
    };
    const subject = interpolate(copy.subject, variables).replace(/[\r\n]+/g, " ").trim() || `${inviterName} invited you to With`;

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
        html: renderInviteHtml(copy, variables),
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
