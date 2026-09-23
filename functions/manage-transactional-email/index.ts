import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const TEMPLATE_MAP: Record<string, { subjectKey: string; contentKey: string; variables: Record<string, string> }> = {
  confirm_signup: {
    subjectKey: "mailer_subjects_confirmation",
    contentKey: "mailer_templates_confirmation_content",
    variables: {},
  },
  password_recovery: {
    subjectKey: "mailer_subjects_recovery",
    contentKey: "mailer_templates_recovery_content",
    variables: {},
  },
  email_change: {
    subjectKey: "mailer_subjects_email_change",
    contentKey: "mailer_templates_email_change_content",
    variables: {
      new_email: "{{ .NewEmail }}",
    },
  },
};

const SYSTEM_NOTES: Record<string, string> = {
  password_recovery: "If you didn’t request this, you can safely ignore this email.",
  email_change: "If you didn’t request this change, you can safely ignore this email.",
};

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function restoreAllowedInlineTags(value: string) {
  return String(value || "")
    .replace(/&lt;(\/?)(b|strong|i|em)&gt;/gi, (_full, slash, tag) => `<${slash}${String(tag).toLowerCase()}>`)
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>");
}

function replaceAllowedVariables(value: string, variables: Record<string, string>, escape = true, inline = false) {
  const escaped = escape ? escapeHtml(value) : String(value || "");
  const source = escape && inline ? restoreAllowedInlineTags(escaped) : escaped;
  const unknown = [...source.matchAll(/{{\s*([a-z0-9_]+)\s*}}/gi)]
    .map((match) => match[1])
    .filter((key) => !variables[key]);
  if (unknown.length) throw new Error(`Unsupported template variable: {{${unknown[0]}}}`);
  return source.replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (_full, key) => variables[key] || "");
}

function paragraph(value: string) {
  if (!value) return "";
  return `<p style="margin:0 0 14px;line-height:1.6;color:#171816;">${value.replaceAll("\n", "<br>")}</p>`;
}

function renderAuthHtml(row: Record<string, any>, variableMap: Record<string, string>) {
  const preheader = replaceAllowedVariables(row.preheader || "", variableMap);
  const headline = replaceAllowedVariables(row.headline || "", variableMap);
  const body = replaceAllowedVariables(row.body_copy || "", variableMap, true, true);
  const supporting = replaceAllowedVariables(row.supporting_text || "", variableMap, true, true);
  const cta = replaceAllowedVariables(row.cta_label || "", variableMap);
  const note = escapeHtml(SYSTEM_NOTES[row.template_key] || "");

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
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1F5E57;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700;">${cta}</a>
          </p>
          ${note ? `<p style="font-size:13px;line-height:1.55;color:#5D615F;margin:22px 0 0;">${note}</p>` : ""}
          <p style="font-size:12px;line-height:1.5;color:#8A8F94;margin:26px 0 0;">If the button doesn’t work, use this link:<br><a href="{{ .ConfirmationURL }}" style="color:#174E49;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

async function setSyncState(admin: any, templateKey: string, error: string | null) {
  await admin.from("transactional_email_content").update({
    last_synced_at: error ? null : new Date().toISOString(),
    last_sync_error: error,
  }).eq("template_key", templateKey);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ error: "Server configuration is incomplete." }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "You must be signed in." }, 401);

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (userError || !userData.user) return json({ error: "Your session is no longer valid." }, 401);

  const { data: appAdmin, error: adminError } = await admin
    .from("app_admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (adminError || !appAdmin) return json({ error: "Admin access required." }, 403);

  try {
    const body = await req.json();
    const action = String(body?.action || "");
    const templateKey = String(body?.templateKey || "");
    if (action !== "sync") return json({ error: "Unsupported action." }, 400);

    const config = TEMPLATE_MAP[templateKey];
    if (!config) return json({ error: "That email is not managed by Supabase Auth." }, 400);

    const { data: row, error: rowError } = await admin
      .from("transactional_email_content")
      .select("template_key,subject,preheader,headline,body_copy,cta_label,supporting_text")
      .eq("template_key", templateKey)
      .single();
    if (rowError || !row) return json({ error: "Email content could not be loaded." }, 404);

    const managementToken = Deno.env.get("WITH_SUPABASE_ACCESS_TOKEN");
    if (!managementToken) {
      const detail = "WITH_SUPABASE_ACCESS_TOKEN is not configured for Auth template sync.";
      await setSyncState(admin, templateKey, detail);
      return json({ error: detail }, 503);
    }

    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const subject = replaceAllowedVariables(row.subject, config.variables, false);
    const html = renderAuthHtml(row, config.variables);
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${managementToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        [config.subjectKey]: subject,
        [config.contentKey]: html,
      }),
    });

    if (!response.ok) {
      const detail = `Supabase Auth sync failed with status ${response.status}.`;
      await setSyncState(admin, templateKey, detail);
      return json({ error: detail }, 502);
    }

    await setSyncState(admin, templateKey, null);
    return json({ ok: true, templateKey });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Email sync failed." }, 400);
  }
});
