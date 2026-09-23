import { useEffect, useMemo, useState } from "react";
import { Check, Mail, RefreshCw, Save, Smartphone } from "lucide-react";
import { BrandLogo, brand } from "./brand.jsx";
import { supabase } from "./supabase.js";
import {
  EDITABLE_EMAIL_FIELDS,
  EMAIL_TEMPLATE_META,
  EMAIL_TEMPLATE_ORDER,
  emailPreviewModel,
  validateEmailDraft,
} from "./emailTemplates.js";

const cardStyle = {
  background: brand.surface,
  border: `1px solid ${brand.border}`,
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 3px 12px rgba(28,36,48,.04)",
};

const inputStyle = {
  width: "100%",
  minHeight: 42,
  borderRadius: 10,
  border: `1px solid ${brand.border}`,
  background: brand.surface,
  color: brand.text,
  padding: "9px 11px",
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: "'DM Sans', -apple-system, sans-serif",
};

const labelStyle = {
  color: brand.textMuted,
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".055em",
  marginBottom: 5,
};

const buttonStyle = {
  minHeight: 40,
  borderRadius: 10,
  border: "none",
  padding: "9px 13px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "'DM Sans', -apple-system, sans-serif",
};

function formatSync(value) {
  if (!value) return "Not synced from Admin yet";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function EmailPreview({ template, narrow }) {
  const preview = emailPreviewModel(template);
  const width = narrow ? 360 : 560;
  return (
    <div style={{ background: brand.teal, borderRadius: 14, padding: narrow ? 12 : 22, overflow: "auto" }}>
      <div style={{ width: "100%", maxWidth: width, margin: "0 auto", background: brand.bg, borderRadius: 18, overflow: "hidden", boxShadow: "0 10px 32px rgba(17,50,46,.18)" }}>
        <div style={{ padding: narrow ? "20px 20px 14px" : "24px 30px 18px", background: brand.teal }}>
          <div>
            <BrandLogo style={{ width: narrow ? 104 : 118, backgroundColor: "#fff" }} />
            <div style={{ marginTop: 8, fontFamily: "Arial, sans-serif", fontSize: 12, color: "rgba(255,255,255,.76)" }}>We’re in this together.</div>
          </div>
        </div>
        <div style={{ padding: narrow ? 20 : 30, fontFamily: "Arial, sans-serif", color: brand.text }}>
          <div style={{ display: "none" }}>{preview.preheader}</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: narrow ? 25 : 28, fontWeight: 700, lineHeight: 1.12, marginBottom: 16 }}>{preview.headline}</div>
          <div style={{ margin: "0 0 14px", lineHeight: 1.6, color: brand.textMuted }} dangerouslySetInnerHTML={{ __html: preview.bodyHtml }} />
          {preview.supporting && <div style={{ margin: "0 0 14px", lineHeight: 1.6, color: brand.text }} dangerouslySetInnerHTML={{ __html: preview.supportingHtml }} />}
          <div style={{ margin: "24px 0 0" }}>
            <span style={{ display: "inline-block", background: brand.teal, color: "#fff", padding: "13px 18px", borderRadius: 10, fontWeight: 700 }}>{preview.cta}</span>
          </div>
          {preview.systemNote && <p style={{ margin: "22px 0 0", lineHeight: 1.55, color: brand.textMuted, fontSize: 13 }}>{preview.systemNote}</p>}
          <p style={{ fontSize: 12, lineHeight: 1.5, color: brand.textSoft, margin: "22px 0 0" }}>If the button doesn’t work, use this link:<br /><span style={{ color: brand.tealDark, wordBreak: "break-all" }}>{preview.actionUrl}</span></p>
        </div>
      </div>
    </div>
  );
}

export default function EmailAdmin() {
  const [access, setAccess] = useState("loading");
  const [templates, setTemplates] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [narrowPreview, setNarrowPreview] = useState(false);

  async function loadTemplates(preferKey = null) {
    const { data, error: loadError } = await supabase
      .from("transactional_email_content")
      .select("template_key,internal_name,category,trigger_description,delivery_path,subject,preheader,headline,body_copy,cta_label,supporting_text,active,system_required,updated_at,last_synced_at,last_sync_error");
    if (loadError) throw loadError;
    const rows = EMAIL_TEMPLATE_ORDER
      .map((key) => (data || []).find((row) => row.template_key === key))
      .filter(Boolean);
    setTemplates(rows);
    const nextKey = preferKey || selectedKey || rows[0]?.template_key || null;
    setSelectedKey(nextKey);
    const selected = rows.find((row) => row.template_key === nextKey);
    if (selected) setDraft({ ...selected });
    return rows;
  }

  async function loadAdmin() {
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) { setAccess("signed_out"); return; }
    const { data: allowed, error: accessError } = await supabase.rpc("is_app_admin");
    if (accessError || !allowed) { setAccess("forbidden"); return; }
    setAccess("allowed");
    await loadTemplates();
  }

  useEffect(() => {
    loadAdmin().catch((loadError) => {
      setError(loadError.message || "Could not load email editorial settings.");
      setAccess("error");
    });
  }, []);

  const selected = useMemo(
    () => templates.find((row) => row.template_key === selectedKey) || null,
    [templates, selectedKey]
  );
  const meta = draft ? EMAIL_TEMPLATE_META[draft.template_key] : null;
  const hasUnsavedChanges = useMemo(() => {
    if (!draft || !selected) return false;
    return EDITABLE_EMAIL_FIELDS.some(([field]) => String(draft[field] || "") !== String(selected[field] || ""));
  }, [draft, selected]);

  function selectTemplate(key) {
    const next = templates.find((row) => row.template_key === key);
    if (!next) return;
    setSelectedKey(key);
    setDraft({ ...next });
    setMessage("");
    setError("");
  }

  function cancelChanges() {
    if (!selected) return;
    setDraft({ ...selected });
    setMessage("Changes discarded.");
    setError("");
  }

  async function syncTemplate(templateKey, quiet = false) {
    const row = templates.find((item) => item.template_key === templateKey) || draft;
    if (!row || row.delivery_path !== "supabase_auth") return true;
    if (draft?.template_key === templateKey && hasUnsavedChanges) {
      setError("Save your copy changes before syncing to Supabase Auth.");
      return false;
    }
    setSyncing(true);
    const { data, error: invokeError } = await supabase.functions.invoke("manage-transactional-email", {
      body: { action: "sync", templateKey },
    });
    setSyncing(false);
    if (invokeError || data?.error) {
      const detail = data?.error || invokeError?.message || "Supabase Auth sync is not configured.";
      if (!quiet) setError(`Copy saved in With, but Auth sync did not complete: ${detail}`);
      await loadTemplates(templateKey);
      return false;
    }
    if (!quiet) setMessage("Saved and synced to Supabase Auth.");
    await loadTemplates(templateKey);
    return true;
  }

  async function saveDraft() {
    const problems = validateEmailDraft(draft);
    if (problems.length) { setError(problems[0]); return; }
    setBusy(true); setMessage(""); setError("");
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      subject: draft.subject.trim(),
      preheader: String(draft.preheader || "").trim(),
      headline: draft.headline.trim(),
      body_copy: draft.body_copy.trim(),
      cta_label: draft.cta_label.trim(),
      supporting_text: String(draft.supporting_text || "").trim(),
      updated_by: userData?.user?.id || null,
      updated_at: new Date().toISOString(),
      last_sync_error: null,
    };
    const { error: saveError } = await supabase
      .from("transactional_email_content")
      .update(payload)
      .eq("template_key", draft.template_key);
    if (saveError) {
      setError(saveError.message || "Could not save this email.");
      setBusy(false);
      return;
    }
    await loadTemplates(draft.template_key);
    setBusy(false);
    if (draft.delivery_path === "supabase_auth") {
      setMessage("Saved in With. Sync to Supabase Auth when you’re ready to publish these changes.");
    } else {
      setMessage("Saved. Future invitations will use this copy.");
    }
  }

  if (access === "loading") return <div style={{ padding: 30, fontFamily: "'DM Sans', sans-serif" }}>Loading email editor…</div>;
  if (access === "signed_out") return <div style={{ padding: 30, fontFamily: "'DM Sans', sans-serif" }}>Sign in to With first, then return to /admin.</div>;
  if (access === "forbidden") return <div style={{ padding: 30, fontFamily: "'DM Sans', sans-serif" }}>This account does not have admin access.</div>;

  return (
    <div style={{ minHeight: "100vh", color: brand.text, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <style>{`
        *{box-sizing:border-box}
        .email-admin-grid{display:grid;grid-template-columns:minmax(220px,280px) minmax(0,1fr);gap:16px;align-items:start}
        .email-editor-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.95fr);gap:16px;align-items:start}
        @media(max-width:860px){.email-admin-grid,.email-editor-grid{grid-template-columns:1fr}}
      `}</style>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "18px 16px 60px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
          <div>
            <div style={{ ...labelStyle, color: brand.tealDark }}>Editorial</div>
            <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 32, lineHeight: 1.05, margin: 0 }}>Emails</h1>
            <p style={{ color: brand.textMuted, fontSize: 13, lineHeight: 1.55, margin: "7px 0 0" }}>Edit the words people receive. Layout, links, security logic and delivery stay controlled by With.</p>
          </div>
          <BrandLogo style={{ width: 104 }} />
        </header>

        {message && <div role="status" style={{ ...cardStyle, borderColor: brand.sage, marginBottom: 14, color: brand.tealDark, fontSize: 13 }}><Check size={15} style={{ verticalAlign: -3, marginRight: 6 }} />{message}</div>}
        {error && <div role="alert" style={{ ...cardStyle, borderColor: "#E8B5AF", marginBottom: 14, color: brand.warn, fontSize: 13 }}>{error}</div>}

        <div className="email-admin-grid">
          <aside style={cardStyle}>
            <div style={{ ...labelStyle, marginBottom: 10 }}>Supported emails</div>
            <div style={{ display: "grid", gap: 8 }}>
              {templates.map((template) => {
                const active = template.template_key === selectedKey;
                const itemMeta = EMAIL_TEMPLATE_META[template.template_key];
                return (
                  <button
                    key={template.template_key}
                    type="button"
                    onClick={() => selectTemplate(template.template_key)}
                    style={{
                      textAlign: "left",
                      border: `1px solid ${active ? brand.teal : brand.border}`,
                      background: active ? brand.surfaceSoft : brand.surface,
                      borderRadius: 12,
                      padding: 12,
                      color: brand.text,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{itemMeta?.label || template.internal_name}</div>
                    <div style={{ fontSize: 11, color: brand.textMuted, marginTop: 4 }}>{itemMeta?.delivery || template.delivery_path}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          {draft && (
            <main>
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
                      {[meta?.category, meta?.delivery, draft.system_required ? "System required" : null].filter(Boolean).map((tag) => (
                        <span key={tag} style={{ border: `1px solid ${brand.border}`, background: brand.surfaceSoft, borderRadius: 999, padding: "5px 8px", fontSize: 10, fontWeight: 800, color: brand.textMuted }}>{tag}</span>
                      ))}
                    </div>
                    <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 25, fontWeight: 600 }}>{draft.internal_name}</div>
                    <div style={{ color: brand.textMuted, fontSize: 13, lineHeight: 1.5, marginTop: 5, maxWidth: 620 }}>{draft.trigger_description}</div>
                  </div>
                  <div style={{ fontSize: 11, color: brand.textSoft, lineHeight: 1.45, textAlign: "right" }}>
                    <div>{draft.delivery_path === "supabase_auth" ? "Last Auth sync" : "Delivery"}</div>
                    <strong style={{ color: draft.last_sync_error ? brand.warn : brand.textMuted }}>
                      {draft.delivery_path === "supabase_auth" ? formatSync(draft.last_synced_at) : "Reads saved copy at send time"}
                    </strong>
                  </div>
                </div>
                {draft.last_sync_error && <div style={{ marginTop: 10, fontSize: 12, color: brand.warn }}>Last sync issue: {draft.last_sync_error}</div>}
              </div>

              <div className="email-editor-grid">
                <section style={cardStyle}>
                  {EDITABLE_EMAIL_FIELDS.map(([field, label]) => {
                    const multiline = field === "body_copy" || field === "supporting_text";
                    return (
                      <div key={field} style={{ marginBottom: 14 }}>
                        <div style={labelStyle}>{label}</div>
                        {multiline ? (
                          <>
                            <textarea
                              value={draft[field] || ""}
                              rows={field === "body_copy" ? 5 : 3}
                              onChange={(e) => setDraft((current) => ({ ...current, [field]: e.target.value }))}
                              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                            />
                            <div style={{ marginTop: 5, fontSize: 11, color: brand.textSoft, lineHeight: 1.45 }}>
                              Inline formatting: <code>{"<b>bold</b>"}</code>, <code>{"<i>italics</i>"}</code>, <code>{"<br>"}</code>. Other HTML is blocked.
                            </div>
                          </>
                        ) : (
                          <input
                            value={draft[field] || ""}
                            onChange={(e) => setDraft((current) => ({ ...current, [field]: e.target.value }))}
                            style={inputStyle}
                          />
                        )}
                      </div>
                    );
                  })}

                  <div style={{ background: brand.surfaceSoft, borderRadius: 12, padding: 12, marginBottom: 14 }}>
                    <div style={labelStyle}>Available variables</div>
                    {meta?.variables?.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {meta.variables.map((variable) => <code key={variable} style={{ fontSize: 11, background: brand.surface, border: `1px solid ${brand.border}`, borderRadius: 7, padding: "5px 7px" }}>{`{{${variable}}}`}</code>)}
                      </div>
                    ) : <div style={{ color: brand.textMuted, fontSize: 12 }}>This email does not expose editorial variables.</div>}
                  </div>

                  <div style={{ background: "#FAF8F3", border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
                    <div style={labelStyle}>System controlled</div>
                    <div style={{ color: brand.textMuted, fontSize: 12, lineHeight: 1.55 }}>
                      With controls the logo, layout/CSS, action URL, fallback link, variable escaping, footer structure and required security text. Body copy can use only the limited inline formatting shown above.
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button type="button" disabled={busy || syncing} onClick={saveDraft} style={{ ...buttonStyle, background: brand.teal, color: "#fff", opacity: busy ? .65 : 1, display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <Save size={15} /> {busy ? "Saving…" : "Save"}
                    </button>
                    <button type="button" disabled={busy || syncing} onClick={cancelChanges} style={{ ...buttonStyle, background: brand.surfaceSoft, color: brand.text, border: `1px solid ${brand.border}` }}>Cancel changes</button>
                    {draft.delivery_path === "supabase_auth" && (
                      <button
                        type="button"
                        disabled={busy || syncing || hasUnsavedChanges}
                        title={hasUnsavedChanges ? "Save your copy changes before syncing." : "Publish the saved copy to Supabase Auth."}
                        onClick={() => syncTemplate(draft.template_key)}
                        style={{ ...buttonStyle, background: brand.surface, color: brand.tealDark, border: `1px solid ${brand.border}`, display: "inline-flex", alignItems: "center", gap: 7, opacity: hasUnsavedChanges ? .55 : 1 }}
                      >
                        <RefreshCw size={15} /> {syncing ? "Syncing…" : hasUnsavedChanges ? "Save before syncing" : "Sync to Supabase Auth"}
                      </button>
                    )}
                  </div>
                </section>

                <section style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={labelStyle}>Preview</div>
                      <div style={{ fontSize: 12, color: brand.textMuted, lineHeight: 1.45 }}>Subject: <strong style={{ color: brand.text }}>{emailPreviewModel(draft).subject}</strong></div>
                      {draft.preheader && <div style={{ fontSize: 11, color: brand.textSoft, marginTop: 3 }}>Preheader: {emailPreviewModel(draft).preheader}</div>}
                    </div>
                    <button type="button" onClick={() => setNarrowPreview((value) => !value)} style={{ ...buttonStyle, minHeight: 34, padding: "6px 9px", background: brand.surfaceSoft, color: brand.text, border: `1px solid ${brand.border}`, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Smartphone size={14} /> {narrowPreview ? "Desktop" : "Mobile"}
                    </button>
                  </div>
                  <EmailPreview template={draft} narrow={narrowPreview} />
                </section>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
