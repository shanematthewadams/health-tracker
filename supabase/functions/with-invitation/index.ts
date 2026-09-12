import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function authToken(req: Request) {
  const header = req.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function safeOrigin(req: Request) {
  const requested = req.headers.get("Origin") || "";
  try {
    const url = new URL(requested);
    const host = url.hostname.toLowerCase();
    if (host === "imwith.me" || host.endsWith(".imwith.me") || host.includes("netlify.app")) {
      return url.origin;
    }
  } catch {
    // Fall through to production.
  }
  return "https://imwith.me";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM_EMAIL") || "With <hello@imwith.me>";
    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "inspect") {
      const token = String(body?.token || "").trim();
      if (!token) return json({ error: "INVITE_INVALID" }, 400);

      const tokenHash = await sha256(token);
      const { data: invite, error } = await admin
        .from("household_invitations")
        .select("id, household_id, email, status, expires_at, invited_by_user_id")
        .eq("token_hash", tokenHash)
        .maybeSingle();

      if (error) throw error;
      if (!invite) return json({ error: "INVITE_INVALID" }, 404);
      if (invite.status === "accepted") return json({ error: "INVITE_ALREADY_USED" }, 409);
      if (invite.status !== "pending") return json({ error: "INVITE_NOT_ACTIVE" }, 409);

      if (new Date(invite.expires_at).getTime() <= Date.now()) {
        await admin.from("household_invitations").update({ status: "expired" }).eq("id", invite.id);
        return json({ error: "INVITE_EXPIRED" }, 410);
      }

      const [{ data: household }, { data: inviterProfile }] = await Promise.all([
        admin.from("households").select("name").eq("id", invite.household_id).maybeSingle(),
        invite.invited_by_user_id
          ? admin.from("profiles").select("name").eq("user_id", invite.invited_by_user_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return json({
        ok: true,
        email: invite.email,
        householdName: household?.name || "this With",
        inviterName: inviterProfile?.name || "",
        expiresAt: invite.expires_at,
      });
    }

    const token = authToken(req);
    if (!token) return json({ error: "AUTH_REQUIRED" }, 401);

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "AUTH_REQUIRED" }, 401);
    const user = userData.user;

    if (action === "create") {
      const email = normalizeEmail(body?.email);
      if (!email || !email.includes("@")) return json({ error: "INVALID_EMAIL" }, 400);

      const { data: membership, error: membershipError } = await admin
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership?.household_id) return json({ error: "NO_WITH" }, 403);

      const { data: existing } = await admin
        .from("household_invitations")
        .select("id")
        .eq("household_id", membership.household_id)
        .eq("email", email)
        .eq("status", "pending")
        .maybeSingle();

      const inviteToken = randomToken();
      const tokenHash = await sha256(inviteToken);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      let inviteId: string;
      if (existing?.id) {
        const { data: updated, error: updateError } = await admin
          .from("household_invitations")
          .update({
            token_hash: tokenHash,
            invited_by_user_id: user.id,
            created_at: new Date().toISOString(),
            expires_at: expiresAt,
            accepted_at: null,
          })
          .eq("id", existing.id)
          .select("id")
          .single();
        if (updateError) throw updateError;
        inviteId = updated.id;
      } else {
        const { data: created, error: createError } = await admin
          .from("household_invitations")
          .insert({
            household_id: membership.household_id,
            email,
            token_hash: tokenHash,
            invited_by_user_id: user.id,
            expires_at: expiresAt,
          })
          .select("id")
          .single();
        if (createError) throw createError;
        inviteId = created.id;
      }

      const [{ data: household }, { data: inviterProfile }] = await Promise.all([
        admin.from("households").select("name").eq("id", membership.household_id).maybeSingle(),
        admin.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
      ]);

      const inviterName = inviterProfile?.name || "Someone";
      const householdName = household?.name || "their With";
      const joinUrl = new URL(safeOrigin(req));
      joinUrl.searchParams.set("invite", inviteToken);

      if (!resendApiKey) {
        await admin.from("household_invitations").delete().eq("id", inviteId);
        return json({ error: "EMAIL_NOT_CONFIGURED" }, 500);
      }

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: resendFrom,
          to: [email],
          subject: `${inviterName} invited you to With`,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px;color:#162321"><div style="font-size:32px;font-weight:700;margin-bottom:20px">With</div><h1 style="font-size:26px;line-height:1.2;margin:0 0 12px">${inviterName} invited you to join ${householdName}.</h1><p style="font-size:16px;line-height:1.6;color:#53615f;margin:0 0 22px">Your health stays yours. With gives you a private place to take care of yourself alongside people you trust.</p><a href="${joinUrl.toString()}" style="display:inline-block;background:#1f5e57;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Join on With</a><p style="font-size:12px;line-height:1.5;color:#7b8785;margin-top:22px">This invitation was sent to ${email} and expires in 30 days.</p></div>`,
        }),
      });

      if (!emailResponse.ok) {
        const detail = await emailResponse.text();
        await admin.from("household_invitations").delete().eq("id", inviteId);
        console.error("Resend invite failed", detail);
        return json({ error: "EMAIL_SEND_FAILED" }, 502);
      }

      return json({ ok: true, email, expiresAt });
    }

    if (action === "accept") {
      const inviteToken = String(body?.token || "").trim();
      const profileName = String(body?.profileName || "").trim();
      if (!inviteToken) return json({ error: "INVITE_INVALID" }, 400);
      if (!profileName) return json({ error: "PROFILE_NAME_REQUIRED" }, 400);

      const tokenHash = await sha256(inviteToken);
      const { data, error } = await admin.rpc("accept_household_invitation", {
        invitation_token_hash: tokenHash,
        authenticated_user_id: user.id,
        authenticated_email: user.email || "",
        profile_name: profileName,
      });

      if (error) {
        const raw = String(error.message || "");
        const codes = [
          "INVITE_INVALID",
          "INVITE_ALREADY_USED",
          "INVITE_NOT_ACTIVE",
          "INVITE_EXPIRED",
          "INVITE_EMAIL_MISMATCH",
          "ALREADY_IN_ANOTHER_WITH",
          "PROFILE_NAME_TAKEN",
          "PROFILE_NAME_REQUIRED",
          "PROFILE_NAME_TOO_LONG",
        ];
        const code = codes.find((item) => raw.includes(item)) || "INVITE_ACCEPT_FAILED";
        return json({ error: code }, 409);
      }

      return json({ ok: true, result: data?.[0] || null });
    }

    return json({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: "INVITATION_REQUEST_FAILED" }, 500);
  }
});
