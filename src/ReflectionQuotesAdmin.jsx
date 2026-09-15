import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, Sparkles, Star } from "lucide-react";
import { BrandLogo, brand } from "./brand.jsx";
import { supabase } from "./supabase.js";

const THEMES = [
  ["consistency", "Consistency"],
  ["patience", "Patience"],
  ["change", "Change"],
  ["rest", "Rest"],
  ["resilience", "Resilience"],
  ["connection", "Connection"],
  ["attention", "Attention"],
  ["beginnings", "Beginnings"],
  ["ordinary_days", "Ordinary days"],
];

const QUOTE_KINDS = [
  ["with_original", "With original"],
  ["public_domain", "Public domain"],
  ["attributed", "Attributed"],
];

const EMPTY_DRAFT = {
  id: null,
  quote: "",
  attribution: "",
  quote_kind: "attributed",
  themes: ["ordinary_days"],
  source_note: "",
  source_url: "",
  active: true,
  featured_week: "",
};

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

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentWeekMonday() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return localDateString(date);
}

function isMonday(dateString) {
  if (!dateString) return true;
  const date = new Date(`${dateString}T12:00:00`);
  return date.getDay() === 1;
}

function kindLabel(kind) {
  return QUOTE_KINDS.find(([id]) => id === kind)?.[1] || kind;
}

function themeLabel(theme) {
  return THEMES.find(([id]) => id === theme)?.[1] || theme.replaceAll("_", " ");
}

export default function ReflectionQuotesAdmin() {
  const [access, setAccess] = useState("loading");
  const [quotes, setQuotes] = useState([]);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadQuotes() {
    const { data, error: quoteError } = await supabase
      .from("reflection_quotes")
      .select("id,quote,attribution,quote_kind,themes,source_note,source_url,active,featured_week,created_at,updated_at")
      .order("active", { ascending: false })
      .order("created_at", { ascending: false });
    if (quoteError) throw quoteError;
    setQuotes(data || []);
  }

  async function loadAdmin() {
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      setAccess("signed_out");
      return;
    }
    const { data: allowed, error: accessError } = await supabase.rpc("is_app_admin");
    if (accessError || !allowed) {
      setAccess("forbidden");
      return;
    }
    setAccess("allowed");
    await loadQuotes();
  }

  useEffect(() => {
    loadAdmin().catch((loadError) => {
      setError(loadError.message || "Could not load reflection quotes.");
      setAccess("error");
    });
  }, []);

  const featuredByWeek = useMemo(
    () => new Map(quotes.filter((quote) => quote.featured_week).map((quote) => [quote.featured_week, quote.id])),
    [quotes],
  );

  function startNewQuote() {
    setMessage("");
    setError("");
    setDraft({ ...EMPTY_DRAFT, themes: [...EMPTY_DRAFT.themes] });
  }

  function editQuote(quote) {
    setMessage("");
    setError("");
    setDraft({
      ...quote,
      attribution: quote.attribution || "",
      source_note: quote.source_note || "",
      source_url: quote.source_url || "",
      featured_week: quote.featured_week || "",
      themes: [...(quote.themes || [])],
    });
  }

  function toggleTheme(theme) {
    setDraft((current) => {
      if (!current) return current;
      const themes = current.themes.includes(theme)
        ? current.themes.filter((item) => item !== theme)
        : [...current.themes, theme];
      return { ...current, themes };
    });
  }

  async function clearFeaturedWeek(week, exceptId = null) {
    if (!week) return;
    let query = supabase
      .from("reflection_quotes")
      .update({ featured_week: null, updated_at: new Date().toISOString() })
      .eq("featured_week", week);
    if (exceptId) query = query.neq("id", exceptId);
    const { error: clearError } = await query;
    if (clearError) throw clearError;
  }

  async function saveQuote() {
    if (!draft) return;
    const quoteText = String(draft.quote || "").trim();
    const attribution = String(draft.attribution || "").trim();
    if (!quoteText) {
      setError("Quote text is required.");
      return;
    }
    if (draft.quote_kind !== "with_original" && !attribution) {
      setError("Add an attribution for public-domain and attributed quotes.");
      return;
    }
    if (draft.featured_week && !isMonday(draft.featured_week)) {
      setError("Featured week must be a Monday, because reflections summarize Monday through Sunday.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (draft.featured_week) await clearFeaturedWeek(draft.featured_week, draft.id);

      const payload = {
        quote: quoteText,
        attribution: attribution || (draft.quote_kind === "with_original" ? "With" : null),
        quote_kind: draft.quote_kind,
        themes: draft.themes,
        source_note: String(draft.source_note || "").trim() || null,
        source_url: String(draft.source_url || "").trim() || null,
        active: Boolean(draft.active),
        featured_week: draft.featured_week || null,
        updated_at: new Date().toISOString(),
      };

      if (draft.id) {
        const { error: saveError } = await supabase.from("reflection_quotes").update(payload).eq("id", draft.id);
        if (saveError) throw saveError;
      } else {
        const { error: saveError } = await supabase.from("reflection_quotes").insert(payload);
        if (saveError) throw saveError;
      }

      await loadQuotes();
      setDraft(null);
      setMessage("Reflection quote saved.");
    } catch (saveError) {
      setError(saveError.message || "Could not save that quote.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(quote) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("reflection_quotes")
        .update({ active: !quote.active, updated_at: new Date().toISOString() })
        .eq("id", quote.id);
      if (updateError) throw updateError;
      await loadQuotes();
      setMessage(!quote.active ? "Quote activated." : "Quote paused.");
    } catch (updateError) {
      setError(updateError.message || "Could not update that quote.");
    } finally {
      setBusy(false);
    }
  }

  async function featureNextReflection(quote) {
    const week = currentWeekMonday();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await clearFeaturedWeek(week, quote.id);
      const { error: updateError } = await supabase
        .from("reflection_quotes")
        .update({ active: true, featured_week: week, updated_at: new Date().toISOString() })
        .eq("id", quote.id);
      if (updateError) throw updateError;
      await loadQuotes();
      setMessage(`Featured for the next weekly reflection (${week}).`);
    } catch (updateError) {
      setError(updateError.message || "Could not feature that quote.");
    } finally {
      setBusy(false);
    }
  }

  async function clearFeature(quote) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("reflection_quotes")
        .update({ featured_week: null, updated_at: new Date().toISOString() })
        .eq("id", quote.id);
      if (updateError) throw updateError;
      await loadQuotes();
      setMessage("Featured week cleared.");
    } catch (updateError) {
      setError(updateError.message || "Could not clear the featured week.");
    } finally {
      setBusy(false);
    }
  }

  if (access === "loading") {
    return <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", color: brand.text }}>Loading quotes…</div>;
  }

  if (access === "signed_out" || access === "forbidden" || access === "error") {
    const copy = access === "signed_out"
      ? "Sign in to With first, then return to /admin."
      : access === "forbidden"
        ? "This account does not have admin access."
        : error || "Could not load reflection quotes.";
    return (
      <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24, background: brand.bg }}>
        <div style={{ ...cardStyle, maxWidth: 440 }}>
          <BrandLogo style={{ width: 116 }} />
          <h2>Reflection Quotes</h2>
          <p style={{ color: brand.textMuted }}>{copy}</p>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: brand.tealDark, fontWeight: 800 }}>
            <ArrowLeft size={15} /> Back to With
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: brand.bg, color: brand.text, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 16px 60px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <BrandLogo style={{ width: 110, marginBottom: 8 }} />
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600 }}>Reflection Quotes</div>
            <div style={{ color: brand.textMuted, fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>
              Curate the closing thought that appears at the end of weekly reflections.
            </div>
          </div>
          <button type="button" onClick={startNewQuote} style={{ ...buttonStyle, display: "inline-flex", alignItems: "center", gap: 6, background: brand.teal, color: brand.inkOn, whiteSpace: "nowrap" }}>
            <Plus size={15} /> Add quote
          </button>
        </header>

        {(message || error) && (
          <div style={{ ...cardStyle, marginBottom: 12, borderColor: error ? brand.warn : brand.border, color: error ? brand.warn : brand.text, fontSize: 13 }}>
            {error || message}
          </div>
        )}

        <div style={{ ...cardStyle, marginBottom: 14, background: brand.surfaceSoft }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, marginBottom: 4 }}>
            <Sparkles size={16} color={brand.tealDark} /> How selection works
          </div>
          <div style={{ color: brand.textMuted, fontSize: 12, lineHeight: 1.55 }}>
            A featured quote wins for its week. Otherwise With prefers a theme that fits the reflection and uses a stable rotation so the quote does not change every time someone reloads. The health data itself is never sent anywhere to choose the quote.
          </div>
        </div>

        {draft && (
          <div style={{ ...cardStyle, marginBottom: 14 }}>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 23, fontWeight: 600, marginBottom: 14 }}>
              {draft.id ? "Edit quote" : "Add quote"}
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <label>
                <div style={labelStyle}>Quote</div>
                <textarea
                  value={draft.quote}
                  maxLength={360}
                  rows={4}
                  onChange={(event) => setDraft((current) => ({ ...current, quote: event.target.value }))}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                  placeholder="A short thought worth carrying into the next week."
                />
                <div style={{ color: brand.textMuted, fontSize: 10, marginTop: 4, textAlign: "right" }}>{draft.quote.length}/360</div>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                <label>
                  <div style={labelStyle}>Kind</div>
                  <select value={draft.quote_kind} onChange={(event) => setDraft((current) => ({ ...current, quote_kind: event.target.value }))} style={inputStyle}>
                    {QUOTE_KINDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
                <label>
                  <div style={labelStyle}>Attribution</div>
                  <input
                    value={draft.attribution}
                    onChange={(event) => setDraft((current) => ({ ...current, attribution: event.target.value }))}
                    placeholder={draft.quote_kind === "with_original" ? "With" : "Author / speaker"}
                    style={inputStyle}
                  />
                </label>
                <label>
                  <div style={labelStyle}>Featured week (Monday)</div>
                  <input
                    type="date"
                    value={draft.featured_week}
                    onChange={(event) => setDraft((current) => ({ ...current, featured_week: event.target.value }))}
                    style={inputStyle}
                  />
                </label>
              </div>

              <div>
                <div style={labelStyle}>Themes</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {THEMES.map(([id, label]) => {
                    const selected = draft.themes.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleTheme(id)}
                        style={{
                          ...buttonStyle,
                          minHeight: 32,
                          padding: "5px 9px",
                          borderRadius: 999,
                          background: selected ? brand.surfaceSoft : "transparent",
                          color: selected ? brand.text : brand.textMuted,
                          border: `1px solid ${selected ? brand.teal : brand.border}`,
                        }}
                      >
                        {selected && <Check size={12} style={{ marginRight: 4, verticalAlign: -2 }} />}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                <label>
                  <div style={labelStyle}>Source URL</div>
                  <input value={draft.source_url} onChange={(event) => setDraft((current) => ({ ...current, source_url: event.target.value }))} placeholder="Optional research/source link" style={inputStyle} />
                </label>
                <label>
                  <div style={labelStyle}>Source / rights note</div>
                  <input value={draft.source_note} onChange={(event) => setDraft((current) => ({ ...current, source_note: event.target.value }))} placeholder="e.g. Public domain; verified Project Gutenberg" style={inputStyle} />
                </label>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
                <input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />
                Active in weekly reflections
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" disabled={busy} onClick={() => setDraft(null)} style={{ ...buttonStyle, background: brand.surfaceSoft, color: brand.text, border: `1px solid ${brand.border}` }}>
                Cancel
              </button>
              <button type="button" disabled={busy} onClick={saveQuote} style={{ ...buttonStyle, background: brand.teal, color: brand.inkOn }}>
                {busy ? "Saving…" : "Save quote"}
              </button>
            </div>
          </div>
        )}

        <div style={{ color: brand.textMuted, fontSize: 11, marginBottom: 10 }}>
          {quotes.length} {quotes.length === 1 ? "quote" : "quotes"} · {quotes.filter((quote) => quote.active).length} active
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {quotes.map((quote) => {
            const isNext = quote.featured_week === currentWeekMonday();
            return (
              <div key={quote.id} style={{ ...cardStyle, opacity: quote.active ? 1 : 0.68 }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 14, alignItems: "start" }}>
                  <div>
                    <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 20, lineHeight: 1.35 }}>
                      “{quote.quote}”
                    </div>
                    {quote.attribution && <div style={{ color: brand.textMuted, fontSize: 12, marginTop: 6 }}>— {quote.attribution}</div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                      <span style={{ background: brand.surfaceSoft, borderRadius: 999, padding: "4px 7px", fontSize: 10, fontWeight: 800 }}>{kindLabel(quote.quote_kind)}</span>
                      {(quote.themes || []).map((theme) => (
                        <span key={theme} style={{ border: `1px solid ${brand.border}`, borderRadius: 999, padding: "3px 7px", fontSize: 10, color: brand.textMuted }}>{themeLabel(theme)}</span>
                      ))}
                      <span style={{ borderRadius: 999, padding: "4px 7px", fontSize: 10, fontWeight: 800, color: quote.active ? brand.tealDark : brand.textMuted, background: brand.surfaceSoft }}>
                        {quote.active ? "Active" : "Paused"}
                      </span>
                      {quote.featured_week && (
                        <span style={{ borderRadius: 999, padding: "4px 7px", fontSize: 10, fontWeight: 800, color: brand.text, background: brand.surfaceSoft }}>
                          {isNext ? "Featured next reflection" : `Featured ${quote.featured_week}`}
                        </span>
                      )}
                    </div>
                    {(quote.source_note || quote.source_url) && (
                      <div style={{ color: brand.textMuted, fontSize: 10, lineHeight: 1.45, marginTop: 9 }}>
                        {quote.source_note || "Source recorded"}
                        {quote.source_url && <> · <a href={quote.source_url} target="_blank" rel="noreferrer" style={{ color: brand.tealDark }}>source</a></>}
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={() => editQuote(quote)} style={{ ...buttonStyle, minWidth: 40, padding: 9, background: brand.surfaceSoft, color: brand.text, border: `1px solid ${brand.border}` }} aria-label={`Edit quote by ${quote.attribution || "With"}`}>
                    <Pencil size={15} />
                  </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${brand.border}` }}>
                  <button type="button" disabled={busy} onClick={() => toggleActive(quote)} style={{ ...buttonStyle, minHeight: 34, padding: "6px 10px", background: "transparent", color: brand.text, border: `1px solid ${brand.border}` }}>
                    {quote.active ? "Pause" : "Activate"}
                  </button>
                  <button type="button" disabled={busy} onClick={() => featureNextReflection(quote)} style={{ ...buttonStyle, minHeight: 34, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 5, background: isNext ? brand.surfaceSoft : "transparent", color: brand.text, border: `1px solid ${isNext ? brand.teal : brand.border}` }}>
                    <Star size={13} /> {isNext ? "Featured next" : "Feature next reflection"}
                  </button>
                  {quote.featured_week && (
                    <button type="button" disabled={busy} onClick={() => clearFeature(quote)} style={{ ...buttonStyle, minHeight: 34, padding: "6px 10px", background: "transparent", color: brand.textMuted, border: `1px solid ${brand.border}` }}>
                      Clear feature
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!quotes.length && (
          <div style={{ ...cardStyle, color: brand.textMuted, textAlign: "center", padding: 30 }}>
            No reflection quotes yet. Add the first one here rather than making the app forage the internet for inspiration like a cursed desk calendar.
          </div>
        )}
      </div>
    </div>
  );
}
