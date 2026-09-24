import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Download, Pencil, Plus, Search, Sparkles, Star, Upload } from "lucide-react";
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
const THEME_IDS = THEMES.map(([id]) => id);

const PLACEMENTS = [
  ["weekly_reflection", "Weekly reflection"],
  ["preparing_with", "Preparing your With"],
  ["onboarding", "Onboarding"],
  ["homepage", "Homepage"],
];
const PLACEMENT_IDS = PLACEMENTS.map(([id]) => id);

const QUOTE_KINDS = [
  ["with_original", "With original"],
  ["public_domain", "Public domain"],
  ["attributed", "Attributed"],
];
const QUOTE_KIND_IDS = QUOTE_KINDS.map(([id]) => id);

const CSV_FIELDS = ["quote", "attribution", "quote_kind", "themes", "placements", "source_note", "source_url", "active", "featured_week"];

const EMPTY_DRAFT = {
  id: null,
  quote: "",
  attribution: "",
  quote_kind: "attributed",
  themes: ["ordinary_days"],
  placements: ["weekly_reflection"],
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
  return !Number.isNaN(date.getTime()) && date.getDay() === 1;
}

function kindLabel(kind) {
  return QUOTE_KINDS.find(([id]) => id === kind)?.[1] || kind;
}

function themeLabel(theme) {
  return THEMES.find(([id]) => id === theme)?.[1] || theme.replaceAll("_", " ");
}

function placementLabel(placement) {
  return PLACEMENTS.find(([id]) => id === placement)?.[1] || placement.replaceAll("_", " ");
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(field); field = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }

  row.push(field);
  if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
  if (rows.length < 2) return { headers: [], rows: [] };

  const headers = rows[0].map((header) => String(header || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""));
  const dataRows = rows.slice(1).map((cells, rowIndex) => ({
    __row: rowIndex + 2,
    ...Object.fromEntries(headers.map((header, columnIndex) => [header, cells[columnIndex] ?? ""])),
  }));
  return { headers, rows: dataRows };
}

function parseList(value) {
  return [...new Set(String(value || "").split(/[;|]/).map((item) => item.trim()).filter(Boolean))];
}

function parseActive(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return true;
  if (["true", "1", "yes", "active"].includes(normalized)) return true;
  if (["false", "0", "no", "paused", "inactive"].includes(normalized)) return false;
  return null;
}

function validateEditorialItem(item) {
  const problems = [];
  if (!item.quote) problems.push("missing quote");
  if (item.quote.length > 360) problems.push("quote exceeds 360 characters");
  if (!QUOTE_KIND_IDS.includes(item.quote_kind)) problems.push("invalid quote_kind");
  if (item.quote_kind !== "with_original" && !item.attribution) problems.push("missing attribution");
  if (!item.placements.length) problems.push("add at least one placement");
  const badThemes = item.themes.filter((theme) => !THEME_IDS.includes(theme));
  const badPlacements = item.placements.filter((placement) => !PLACEMENT_IDS.includes(placement));
  if (badThemes.length) problems.push(`invalid themes: ${badThemes.join("; ")}`);
  if (badPlacements.length) problems.push(`invalid placements: ${badPlacements.join("; ")}`);
  if (item.placements.includes("preparing_with") && item.quote.length > 90) problems.push("Preparing your With lines must be 90 characters or fewer");
  if (item.placements.includes("onboarding") && item.quote.length > 160) problems.push("onboarding lines must be 160 characters or fewer");
  if (item.active === null) problems.push("active must be true or false");
  if (item.featured_week && !isMonday(item.featured_week)) problems.push("featured_week must be a Monday");
  if (item.featured_week && !item.placements.includes("weekly_reflection")) problems.push("featured_week requires weekly_reflection placement");
  return problems;
}

export default function ReflectionQuotesAdmin() {
  const [access, setAccess] = useState("loading");
  const [quotes, setQuotes] = useState([]);
  const [draft, setDraft] = useState(null);
  const [importState, setImportState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [themeFilter, setThemeFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [returnFocusId, setReturnFocusId] = useState(null);

  async function loadQuotes() {
    const { data, error: quoteError } = await supabase
      .from("reflection_quotes")
      .select("id,quote,attribution,quote_kind,themes,placements,source_note,source_url,active,featured_week,created_at,updated_at")
      .order("active", { ascending: false })
      .order("created_at", { ascending: false });
    if (quoteError) throw quoteError;
    setQuotes(data || []);
    return data || [];
  }

  async function loadAdmin() {
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) { setAccess("signed_out"); return; }
    const { data: allowed, error: accessError } = await supabase.rpc("is_app_admin");
    if (accessError || !allowed) { setAccess("forbidden"); return; }
    setAccess("allowed");
    await loadQuotes();
  }

  useEffect(() => {
    loadAdmin().catch((loadError) => {
      setError(loadError.message || "Could not load editorial library.");
      setAccess("error");
    });
  }, []);

  const placementCounts = useMemo(() => Object.fromEntries(PLACEMENT_IDS.map((placement) => [
    placement,
    quotes.filter((quote) => quote.active && (quote.placements || []).includes(placement)).length,
  ])), [quotes]);

  const authors = useMemo(() => [...new Set(quotes.map((quote) => quote.attribution).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b)), [quotes]);

  const filteredQuotes = useMemo(() => {
    const query = normalizeKey(searchQuery);
    return quotes.filter((quote) => {
      const matchesSearch = !query || [quote.quote, quote.attribution, quote.source_note]
        .some((value) => normalizeKey(value).includes(query));
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" && quote.active)
        || (statusFilter === "paused" && !quote.active);
      const matchesTheme = themeFilter === "all" || (quote.themes || []).includes(themeFilter);
      const matchesAuthor = authorFilter === "all" || quote.attribution === authorFilter;
      return matchesSearch && matchesStatus && matchesTheme && matchesAuthor;
    });
  }, [quotes, searchQuery, statusFilter, themeFilter, authorFilter]);

  const selectedCount = selectedIds.size;
  const allFilteredSelected = filteredQuotes.length > 0
    && filteredQuotes.every((quote) => selectedIds.has(quote.id));

  useEffect(() => {
    if (draft || !returnFocusId) return;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector('[data-edit-quote-id="' + returnFocusId + '"]')?.focus();
      setReturnFocusId(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [draft, returnFocusId]);

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function toggleSelection(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    const filteredIds = new Set(filteredQuotes.map((quote) => quote.id));
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleSelectionMode() {
    setSelectionMode((current) => {
      if (current) clearSelection();
      return !current;
    });
  }

  function startNewQuote() {
    setMessage(""); setError(""); setImportState(null);
    setDraft({ ...EMPTY_DRAFT, themes: [...EMPTY_DRAFT.themes], placements: [...EMPTY_DRAFT.placements] });
  }

  function editQuote(quote) {
    setMessage(""); setError(""); setImportState(null);
    setDraft({
      ...quote,
      attribution: quote.attribution || "",
      source_note: quote.source_note || "",
      source_url: quote.source_url || "",
      featured_week: quote.featured_week || "",
      themes: [...(quote.themes || [])],
      placements: [...(quote.placements || ["weekly_reflection"])],
    });
  }

  function cancelDraft() {
    if (draft?.id) setReturnFocusId(draft.id);
    setDraft(null);
  }

  function toggleArrayValue(field, value) {
    setDraft((current) => {
      if (!current) return current;
      const values = current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value];
      return { ...current, [field]: values };
    });
  }

  async function clearFeaturedWeek(week, exceptId = null) {
    if (!week) return;
    let query = supabase.from("reflection_quotes").update({ featured_week: null, updated_at: new Date().toISOString() }).eq("featured_week", week);
    if (exceptId) query = query.neq("id", exceptId);
    const { error: clearError } = await query;
    if (clearError) throw clearError;
  }

  async function saveQuote() {
    if (!draft) return;
    const quoteText = String(draft.quote || "").trim();
    const attribution = String(draft.attribution || "").trim();
    const item = {
      ...draft,
      quote: quoteText,
      attribution: attribution || (draft.quote_kind === "with_original" ? "With" : ""),
    };
    const problems = validateEditorialItem(item);
    if (problems.length) { setError(problems[0]); return; }

    setBusy(true); setMessage(""); setError("");
    try {
      if (item.featured_week) await clearFeaturedWeek(item.featured_week, item.id);
      const payload = {
        quote: item.quote,
        attribution: item.attribution || null,
        quote_kind: item.quote_kind,
        themes: item.themes,
        placements: item.placements,
        source_note: String(item.source_note || "").trim() || null,
        source_url: String(item.source_url || "").trim() || null,
        active: Boolean(item.active),
        featured_week: item.featured_week || null,
        updated_at: new Date().toISOString(),
      };
      const writeQuery = item.id
        ? supabase.from("reflection_quotes").update(payload).eq("id", item.id)
        : supabase.from("reflection_quotes").insert(payload);
      const { data: savedItem, error: saveError } = await writeQuery
        .select("id,quote,attribution,quote_kind,themes,placements,source_note,source_url,active,featured_week,created_at,updated_at")
        .single();
      if (saveError) throw saveError;
      setQuotes((current) => {
        const reconciled = item.featured_week
          ? current.map((quote) => quote.id !== item.id && quote.featured_week === item.featured_week
            ? { ...quote, featured_week: null }
            : quote)
          : current;
        if (item.id) return reconciled.map((quote) => quote.id === savedItem.id ? savedItem : quote);
        return [savedItem, ...reconciled];
      });
      if (item.id) setReturnFocusId(item.id);
      setDraft(null);
      setMessage("Editorial item saved.");
    } catch (saveError) {
      setError(saveError.message || "Could not save that item.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(quote) {
    setBusy(true); setMessage(""); setError("");
    try {
      const { error: updateError } = await supabase.from("reflection_quotes").update({ active: !quote.active, updated_at: new Date().toISOString() }).eq("id", quote.id);
      if (updateError) throw updateError;
      setQuotes((current) => current.map((item) => item.id === quote.id
        ? { ...item, active: !quote.active, updated_at: new Date().toISOString() }
        : item));
      setMessage(!quote.active ? "Item activated." : "Item paused.");
    } catch (updateError) {
      setError(updateError.message || "Could not update that item.");
    } finally {
      setBusy(false);
    }
  }

  async function bulkSetActive(active) {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const updatedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("reflection_quotes")
        .update({ active, updated_at: updatedAt })
        .in("id", ids);
      if (updateError) throw updateError;
      setQuotes((current) => current.map((quote) => selectedIds.has(quote.id)
        ? { ...quote, active, updated_at: updatedAt }
        : quote));
      clearSelection();
      setMessage((active ? "Resumed " : "Paused ") + ids.length + (ids.length === 1 ? " item." : " items."));
    } catch (updateError) {
      setError(updateError.message || "Could not update the selected items.");
    } finally {
      setBusy(false);
    }
  }

  async function featureNextReflection(quote) {
    if (!(quote.placements || []).includes("weekly_reflection")) return;
    const week = currentWeekMonday();
    setBusy(true); setMessage(""); setError("");
    try {
      await clearFeaturedWeek(week, quote.id);
      const { error: updateError } = await supabase.from("reflection_quotes").update({ active: true, featured_week: week, updated_at: new Date().toISOString() }).eq("id", quote.id);
      if (updateError) throw updateError;
      const updatedAt = new Date().toISOString();
      setQuotes((current) => current.map((item) => {
        if (item.id === quote.id) return { ...item, active: true, featured_week: week, updated_at: updatedAt };
        if (item.featured_week === week) return { ...item, featured_week: null };
        return item;
      }));
      setMessage("Featured for the next weekly reflection (" + week + ").");
    } catch (updateError) {
      setError(updateError.message || "Could not feature that item.");
    } finally {
      setBusy(false);
    }
  }

  async function clearFeature(quote) {
    setBusy(true); setMessage(""); setError("");
    try {
      const { error: updateError } = await supabase.from("reflection_quotes").update({ featured_week: null, updated_at: new Date().toISOString() }).eq("id", quote.id);
      if (updateError) throw updateError;
      setQuotes((current) => current.map((item) => item.id === quote.id
        ? { ...item, featured_week: null, updated_at: new Date().toISOString() }
        : item));
      setMessage("Featured week cleared.");
    } catch (updateError) {
      setError(updateError.message || "Could not clear the featured week.");
    } finally {
      setBusy(false);
    }
  }

  function downloadSample() {
    const sample = [
      CSV_FIELDS.join(","),
      ["A week doesn’t have to be perfect to tell you something.", "With", "with_original", "patience;ordinary_days", "weekly_reflection;onboarding", "Original With editorial line.", "", "true", ""].map(escapeCsv).join(","),
      ["Small things add up.", "With", "with_original", "consistency", "preparing_with", "Original With editorial line.", "", "true", ""].map(escapeCsv).join(","),
    ].join("\n");
    downloadText("with-editorial-library-import-sample.csv", sample);
  }

  async function handleCsv(file) {
    setDraft(null); setMessage(""); setError("");
    if (!file) return;
    const parsed = parseCsv(await file.text());
    if (!parsed.headers.includes("quote") || !parsed.rows.length) {
      setError("That CSV needs a quote column and at least one data row.");
      setImportState(null);
      return;
    }

    const existingKeys = new Set(quotes.map((quote) => `${normalizeKey(quote.quote)}|${normalizeKey(quote.attribution)}`));
    const existingFeatured = new Set(quotes.map((quote) => quote.featured_week).filter(Boolean));
    const seenKeys = new Set();
    const seenFeatured = new Set();

    const preview = parsed.rows.map((raw) => {
      const value = (field) => String(raw[field] ?? "").trim();
      const quoteKind = value("quote_kind") || "attributed";
      const item = {
        __row: raw.__row,
        quote: value("quote"),
        attribution: value("attribution") || (quoteKind === "with_original" ? "With" : ""),
        quote_kind: quoteKind,
        themes: parseList(value("themes")),
        placements: parseList(value("placements")).length ? parseList(value("placements")) : ["weekly_reflection"],
        source_note: value("source_note"),
        source_url: value("source_url"),
        active: parseActive(value("active")),
        featured_week: value("featured_week"),
      };
      const problems = validateEditorialItem(item);
      const key = `${normalizeKey(item.quote)}|${normalizeKey(item.attribution)}`;
      const duplicate = existingKeys.has(key) || seenKeys.has(key);
      if (item.featured_week && (existingFeatured.has(item.featured_week) || seenFeatured.has(item.featured_week))) problems.push("featured_week is already assigned");
      if (!duplicate && !problems.length) {
        seenKeys.add(key);
        if (item.featured_week) seenFeatured.add(item.featured_week);
      }
      return { ...item, duplicate, problems };
    });

    setImportState({ filename: file.name, preview });
  }

  function downloadRejected() {
    const rejected = importState?.preview?.filter((row) => row.problems.length) || [];
    const headers = [...CSV_FIELDS, "import_error"];
    const lines = rejected.map((row) => headers.map((field) => {
      if (field === "themes" || field === "placements") return escapeCsv((row[field] || []).join(";"));
      if (field === "import_error") return escapeCsv(row.problems.join("; "));
      return escapeCsv(row[field] ?? "");
    }).join(","));
    downloadText("with-editorial-library-rejected.csv", [headers.join(","), ...lines].join("\n"));
  }

  async function importCsv() {
    const ready = importState?.preview?.filter((row) => !row.duplicate && !row.problems.length) || [];
    if (!ready.length) { setError("There are no valid new items to import."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      let imported = 0;
      for (let index = 0; index < ready.length; index += 100) {
        const payload = ready.slice(index, index + 100).map((row) => ({
          quote: row.quote,
          attribution: row.attribution || null,
          quote_kind: row.quote_kind,
          themes: row.themes,
          placements: row.placements,
          source_note: row.source_note || null,
          source_url: row.source_url || null,
          active: row.active,
          featured_week: row.featured_week || null,
        }));
        const { error: insertError } = await supabase.from("reflection_quotes").insert(payload);
        if (insertError) throw insertError;
        imported += payload.length;
      }
      const duplicateCount = importState.preview.filter((row) => row.duplicate).length;
      const rejectedCount = importState.preview.filter((row) => row.problems.length).length;
      await loadQuotes();
      setImportState(null);
      setMessage(`Imported ${imported} editorial items. ${duplicateCount} duplicates skipped; ${rejectedCount} rows need attention.`);
    } catch (importError) {
      setError(importError.message || "Could not import that CSV.");
    } finally {
      setBusy(false);
    }
  }

  if (access === "loading") return <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", color: brand.text }}>Loading editorial library…</div>;

  if (access === "signed_out" || access === "forbidden" || access === "error") {
    const copy = access === "signed_out"
      ? "Sign in to With first, then return to /admin."
      : access === "forbidden"
        ? "This account does not have admin access."
        : error || "Could not load editorial library.";
    return (
      <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24, background: brand.bg }}>
        <div style={{ ...cardStyle, maxWidth: 440 }}>
          <BrandLogo style={{ width: 116 }} />
          <h2>Editorial Library</h2>
          <p style={{ color: brand.textMuted }}>{copy}</p>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: brand.tealDark, fontWeight: 800 }}><ArrowLeft size={15} /> Back to With</a>
        </div>
      </div>
    );
  }

  const importRows = importState?.preview || [];
  const readyCount = importRows.filter((row) => !row.duplicate && !row.problems.length).length;
  const duplicateCount = importRows.filter((row) => row.duplicate).length;
  const rejectedCount = importRows.filter((row) => row.problems.length).length;

  return (
    <div style={{ minHeight: "100vh", background: brand.bg, color: brand.text, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 16px 60px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <BrandLogo style={{ width: 110, marginBottom: 8 }} />
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600 }}>Editorial Library</div>
            <div style={{ color: brand.textMuted, fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>Curate small pieces of With’s voice and choose where they can appear.</div>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <button type="button" onClick={startNewQuote} style={{ ...buttonStyle, display: "inline-flex", alignItems: "center", gap: 6, background: brand.teal, color: brand.inkOn }}><Plus size={15} /> Add item</button>
            <label style={{ ...buttonStyle, display: "inline-flex", alignItems: "center", gap: 6, background: brand.surfaceSoft, color: brand.text, border: `1px solid ${brand.border}` }}>
              <Upload size={15} /> Bulk CSV
              <input type="file" accept=".csv,text/csv" onChange={(event) => handleCsv(event.target.files?.[0])} style={{ display: "none" }} />
            </label>
            <button type="button" onClick={downloadSample} style={{ ...buttonStyle, display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", color: brand.tealDark, border: `1px solid ${brand.border}` }}><Download size={14} /> Sample CSV</button>
          </div>
        </header>

        {(message || error) && <div role={error ? "alert" : "status"} aria-live="polite" style={{ ...cardStyle, position: "fixed", right: 16, bottom: 16, left: 16, marginLeft: "auto", maxWidth: 520, zIndex: 30, borderColor: error ? brand.warn : brand.border, color: error ? brand.warn : brand.text, fontSize: 13 }}>{error || message}</div>}

        <div style={{ ...cardStyle, marginBottom: 14, background: brand.surfaceSoft }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, marginBottom: 5 }}><Sparkles size={16} color={brand.tealDark} /> Where the library appears</div>
          <div style={{ color: brand.textMuted, fontSize: 12, lineHeight: 1.55 }}>Weekly reflections use theme-aware stable rotation. Homepage, preparing, and onboarding moments use a quiet daily rotation and never inspect health data. A single item can be eligible for more than one placement.</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {PLACEMENTS.map(([id, label]) => <span key={id} style={{ background: brand.surface, border: `1px solid ${brand.border}`, borderRadius: 999, padding: "5px 8px", fontSize: 10, fontWeight: 800 }}>{label}: {placementCounts[id] || 0}</span>)}
          </div>
        </div>


        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
            <label>
              <div style={labelStyle}>Search</div>
              <div style={{ position: "relative" }}>
                <Search size={15} aria-hidden="true" style={{ position: "absolute", left: 11, top: 13, color: brand.textMuted }} />
                <input aria-label="Search quote or attribution" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Quote or attribution" style={{ ...inputStyle, paddingLeft: 34 }} />
              </div>
            </label>
            <label><div style={labelStyle}>Status</div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={inputStyle}><option value="all">All</option><option value="active">Active</option><option value="paused">Paused</option></select></label>
            <label><div style={labelStyle}>Theme</div><select value={themeFilter} onChange={(event) => setThemeFilter(event.target.value)} style={inputStyle}><option value="all">All themes</option>{THEMES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <label><div style={labelStyle}>Attribution</div><select value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value)} style={inputStyle}><option value="all">All attributions</option>{authors.map((author) => <option key={author} value={author}>{author}</option>)}</select></label>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
            <button type="button" onClick={toggleSelectionMode} style={{ ...buttonStyle, background: selectionMode ? brand.teal : brand.surfaceSoft, color: selectionMode ? brand.inkOn : brand.text, border: "1px solid " + (selectionMode ? brand.teal : brand.border) }}>{selectionMode ? "Done selecting" : "Select"}</button>
            {(searchQuery || statusFilter !== "all" || themeFilter !== "all" || authorFilter !== "all") && <button type="button" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setThemeFilter("all"); setAuthorFilter("all"); }} style={{ ...buttonStyle, background: "transparent", color: brand.textMuted, border: "1px solid " + brand.border }}>Clear filters</button>}
          </div>
        </div>

        {selectionMode && (
          <div role="region" aria-label="Bulk editorial actions" style={{ ...cardStyle, position: "sticky", bottom: 12, zIndex: 15, marginBottom: 14, background: brand.surfaceSoft, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <strong style={{ marginRight: "auto" }}>{selectedCount} selected</strong>
            <button type="button" disabled={!filteredQuotes.length} onClick={toggleSelectAllFiltered} style={{ ...buttonStyle, background: "transparent", color: brand.text, border: "1px solid " + brand.border }}>{allFilteredSelected ? "Clear filtered selection" : "Select all filtered"}</button>
            <button type="button" disabled={!selectedCount} onClick={clearSelection} style={{ ...buttonStyle, background: "transparent", color: brand.textMuted, border: "1px solid " + brand.border }}>Clear</button>
            <button type="button" disabled={busy || !selectedCount} onClick={() => bulkSetActive(false)} style={{ ...buttonStyle, background: brand.surface, color: brand.text, border: "1px solid " + brand.border }}>Pause selected</button>
            <button type="button" disabled={busy || !selectedCount} onClick={() => bulkSetActive(true)} style={{ ...buttonStyle, background: brand.teal, color: brand.inkOn }}>Resume selected</button>
          </div>
        )}

        {importState && (
          <div style={{ ...cardStyle, marginBottom: 14 }}>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 23, fontWeight: 600 }}>{importState.filename}</div>
            <div style={{ color: brand.textMuted, fontSize: 11, margin: "3px 0 12px" }}>Themes and placements may contain multiple values separated by semicolons.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
              {[["Ready", readyCount], ["Duplicates", duplicateCount], ["Need attention", rejectedCount]].map(([label, count]) => <div key={label} style={{ background: brand.surfaceSoft, borderRadius: 10, padding: 11 }}><div style={labelStyle}>{label}</div><div style={{ fontSize: 22, fontWeight: 800 }}>{count}</div></div>)}
            </div>
            <div style={{ overflowX: "auto", marginBottom: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead><tr>{["Row", "Quote", "Placements", "Status"].map((header) => <th key={header} style={{ textAlign: "left", padding: "7px 6px", borderBottom: `1px solid ${brand.border}` }}>{header}</th>)}</tr></thead>
                <tbody>{importRows.slice(0, 20).map((row) => <tr key={row.__row}><td style={{ padding: 6 }}>{row.__row}</td><td style={{ padding: 6, maxWidth: 400 }}>{row.quote}</td><td style={{ padding: 6 }}>{row.placements.join(", ")}</td><td style={{ padding: 6, color: row.problems.length ? brand.warn : brand.textMuted }}>{row.problems.length ? row.problems.join("; ") : row.duplicate ? "Duplicate" : "Ready"}</td></tr>)}</tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" disabled={busy || !readyCount} onClick={importCsv} style={{ ...buttonStyle, background: brand.teal, color: brand.inkOn, opacity: readyCount ? 1 : .55 }}>{busy ? "Importing…" : `Import ${readyCount} items`}</button>
              {rejectedCount > 0 && <button type="button" onClick={downloadRejected} style={{ ...buttonStyle, background: "transparent", color: brand.tealDark, border: `1px solid ${brand.border}` }}>Download rejected rows</button>}
              <button type="button" onClick={() => setImportState(null)} style={{ ...buttonStyle, background: "transparent", color: brand.textMuted, border: `1px solid ${brand.border}` }}>Cancel</button>
            </div>
          </div>
        )}

        {draft && !draft.id && (
          <div style={{ ...cardStyle, marginBottom: 14 }}>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 23, fontWeight: 600, marginBottom: 14 }}>{draft.id ? "Edit item" : "Add item"}</div>
            <div style={{ display: "grid", gap: 12 }}>
              <label>
                <div style={labelStyle}>Text</div>
                <textarea value={draft.quote} maxLength={360} rows={4} onChange={(event) => setDraft((current) => ({ ...current, quote: event.target.value }))} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} placeholder="A short thought that sounds like With." />
                <div style={{ color: brand.textMuted, fontSize: 10, marginTop: 4, textAlign: "right" }}>{draft.quote.length}/360</div>
              </label>

              <div>
                <div style={labelStyle}>Placements</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PLACEMENTS.map(([id, label]) => {
                    const selected = draft.placements.includes(id);
                    return <button key={id} type="button" onClick={() => toggleArrayValue("placements", id)} style={{ ...buttonStyle, minHeight: 32, padding: "5px 9px", borderRadius: 999, background: selected ? brand.surfaceSoft : "transparent", color: selected ? brand.text : brand.textMuted, border: `1px solid ${selected ? brand.teal : brand.border}` }}>{selected && <Check size={12} style={{ marginRight: 4, verticalAlign: -2 }} />}{label}</button>;
                  })}
                </div>
                {draft.placements.includes("preparing_with") && <div style={{ color: brand.textMuted, fontSize: 10, marginTop: 5 }}>Preparing your With items are limited to 90 characters.</div>}
                {draft.placements.includes("homepage") && <div style={{ color: brand.textMuted, fontSize: 10, marginTop: 5 }}>Homepage items rotate daily for signed-out visitors. Short, broadly human lines work best here.</div>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                <label><div style={labelStyle}>Kind</div><select value={draft.quote_kind} onChange={(event) => setDraft((current) => ({ ...current, quote_kind: event.target.value }))} style={inputStyle}>{QUOTE_KINDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
                <label><div style={labelStyle}>Attribution</div><input value={draft.attribution} onChange={(event) => setDraft((current) => ({ ...current, attribution: event.target.value }))} placeholder={draft.quote_kind === "with_original" ? "With" : "Author / speaker"} style={inputStyle} /></label>
                {draft.placements.includes("weekly_reflection") && <label><div style={labelStyle}>Featured week (Monday)</div><input type="date" value={draft.featured_week} onChange={(event) => setDraft((current) => ({ ...current, featured_week: event.target.value }))} style={inputStyle} /></label>}
              </div>

              <div>
                <div style={labelStyle}>Themes</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {THEMES.map(([id, label]) => {
                    const selected = draft.themes.includes(id);
                    return <button key={id} type="button" onClick={() => toggleArrayValue("themes", id)} style={{ ...buttonStyle, minHeight: 32, padding: "5px 9px", borderRadius: 999, background: selected ? brand.surfaceSoft : "transparent", color: selected ? brand.text : brand.textMuted, border: `1px solid ${selected ? brand.teal : brand.border}` }}>{selected && <Check size={12} style={{ marginRight: 4, verticalAlign: -2 }} />}{label}</button>;
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                <label><div style={labelStyle}>Source URL</div><input value={draft.source_url} onChange={(event) => setDraft((current) => ({ ...current, source_url: event.target.value }))} placeholder="Optional research/source link" style={inputStyle} /></label>
                <label><div style={labelStyle}>Source / rights note</div><input value={draft.source_note} onChange={(event) => setDraft((current) => ({ ...current, source_note: event.target.value }))} placeholder="e.g. Public domain; verified Project Gutenberg" style={inputStyle} /></label>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />Active in editorial library</label>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" disabled={busy} onClick={cancelDraft} style={{ ...buttonStyle, background: brand.surfaceSoft, color: brand.text, border: `1px solid ${brand.border}` }}>Cancel</button>
              <button type="button" disabled={busy} onClick={saveQuote} style={{ ...buttonStyle, background: brand.teal, color: brand.inkOn }}>{busy ? "Saving…" : "Save item"}</button>
            </div>
          </div>
        )}

        <div style={{ color: brand.textMuted, fontSize: 11, marginBottom: 10 }}>{filteredQuotes.length} of {quotes.length} {quotes.length === 1 ? "item" : "items"} · {quotes.filter((quote) => quote.active).length} active</div>

        <div style={{ display: "grid", gap: 10 }}>
          {filteredQuotes.map((quote) => {
            const isNext = quote.featured_week === currentWeekMonday();
            const weeklyEligible = (quote.placements || []).includes("weekly_reflection");
            if (draft?.id === quote.id) {
              return (
          <div key={quote.id} style={{ ...cardStyle }}>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 23, fontWeight: 600, marginBottom: 14 }}>{draft.id ? "Edit item" : "Add item"}</div>
            <div style={{ display: "grid", gap: 12 }}>
              <label>
                <div style={labelStyle}>Text</div>
                <textarea value={draft.quote} maxLength={360} rows={4} onChange={(event) => setDraft((current) => ({ ...current, quote: event.target.value }))} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} placeholder="A short thought that sounds like With." />
                <div style={{ color: brand.textMuted, fontSize: 10, marginTop: 4, textAlign: "right" }}>{draft.quote.length}/360</div>
              </label>

              <div>
                <div style={labelStyle}>Placements</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PLACEMENTS.map(([id, label]) => {
                    const selected = draft.placements.includes(id);
                    return <button key={id} type="button" onClick={() => toggleArrayValue("placements", id)} style={{ ...buttonStyle, minHeight: 32, padding: "5px 9px", borderRadius: 999, background: selected ? brand.surfaceSoft : "transparent", color: selected ? brand.text : brand.textMuted, border: `1px solid ${selected ? brand.teal : brand.border}` }}>{selected && <Check size={12} style={{ marginRight: 4, verticalAlign: -2 }} />}{label}</button>;
                  })}
                </div>
                {draft.placements.includes("preparing_with") && <div style={{ color: brand.textMuted, fontSize: 10, marginTop: 5 }}>Preparing your With items are limited to 90 characters.</div>}
                {draft.placements.includes("homepage") && <div style={{ color: brand.textMuted, fontSize: 10, marginTop: 5 }}>Homepage items rotate daily for signed-out visitors. Short, broadly human lines work best here.</div>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                <label><div style={labelStyle}>Kind</div><select value={draft.quote_kind} onChange={(event) => setDraft((current) => ({ ...current, quote_kind: event.target.value }))} style={inputStyle}>{QUOTE_KINDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
                <label><div style={labelStyle}>Attribution</div><input value={draft.attribution} onChange={(event) => setDraft((current) => ({ ...current, attribution: event.target.value }))} placeholder={draft.quote_kind === "with_original" ? "With" : "Author / speaker"} style={inputStyle} /></label>
                {draft.placements.includes("weekly_reflection") && <label><div style={labelStyle}>Featured week (Monday)</div><input type="date" value={draft.featured_week} onChange={(event) => setDraft((current) => ({ ...current, featured_week: event.target.value }))} style={inputStyle} /></label>}
              </div>

              <div>
                <div style={labelStyle}>Themes</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {THEMES.map(([id, label]) => {
                    const selected = draft.themes.includes(id);
                    return <button key={id} type="button" onClick={() => toggleArrayValue("themes", id)} style={{ ...buttonStyle, minHeight: 32, padding: "5px 9px", borderRadius: 999, background: selected ? brand.surfaceSoft : "transparent", color: selected ? brand.text : brand.textMuted, border: `1px solid ${selected ? brand.teal : brand.border}` }}>{selected && <Check size={12} style={{ marginRight: 4, verticalAlign: -2 }} />}{label}</button>;
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                <label><div style={labelStyle}>Source URL</div><input value={draft.source_url} onChange={(event) => setDraft((current) => ({ ...current, source_url: event.target.value }))} placeholder="Optional research/source link" style={inputStyle} /></label>
                <label><div style={labelStyle}>Source / rights note</div><input value={draft.source_note} onChange={(event) => setDraft((current) => ({ ...current, source_note: event.target.value }))} placeholder="e.g. Public domain; verified Project Gutenberg" style={inputStyle} /></label>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />Active in editorial library</label>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" disabled={busy} onClick={cancelDraft} style={{ ...buttonStyle, background: brand.surfaceSoft, color: brand.text, border: `1px solid ${brand.border}` }}>Cancel</button>
              <button type="button" disabled={busy} onClick={saveQuote} style={{ ...buttonStyle, background: brand.teal, color: brand.inkOn }}>{busy ? "Saving…" : "Save item"}</button>
            </div>
          </div>
              );
            }
            return (
              <div key={quote.id} style={{ ...cardStyle, opacity: quote.active ? 1 : 0.68 }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 14, alignItems: "start" }}>
                  <div>
                    {selectionMode && <label style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 10, fontSize: 12, fontWeight: 800, color: brand.textMuted }}><input type="checkbox" checked={selectedIds.has(quote.id)} onChange={() => toggleSelection(quote.id)} aria-label={"Select quote by " + (quote.attribution || "With")} /> Select</label>}
                    <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 20, lineHeight: 1.35 }}>“{quote.quote}”</div>
                    {quote.attribution && <div style={{ color: brand.textMuted, fontSize: 12, marginTop: 6 }}>— {quote.attribution}</div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                      <span style={{ background: brand.surfaceSoft, borderRadius: 999, padding: "4px 7px", fontSize: 10, fontWeight: 800 }}>{kindLabel(quote.quote_kind)}</span>
                      {(quote.placements || []).map((placement) => <span key={placement} style={{ background: brand.surfaceSoft, borderRadius: 999, padding: "4px 7px", fontSize: 10, fontWeight: 800, color: brand.tealDark }}>{placementLabel(placement)}</span>)}
                      {(quote.themes || []).map((theme) => <span key={theme} style={{ border: `1px solid ${brand.border}`, borderRadius: 999, padding: "3px 7px", fontSize: 10, color: brand.textMuted }}>{themeLabel(theme)}</span>)}
                      <span style={{ borderRadius: 999, padding: "4px 7px", fontSize: 10, fontWeight: 800, color: quote.active ? brand.tealDark : brand.textMuted, background: brand.surfaceSoft }}>{quote.active ? "Active" : "Paused"}</span>
                      {quote.featured_week && <span style={{ borderRadius: 999, padding: "4px 7px", fontSize: 10, fontWeight: 800, background: brand.surfaceSoft }}>{isNext ? "Featured next reflection" : `Featured ${quote.featured_week}`}</span>}
                    </div>
                    {(quote.source_note || quote.source_url) && <div style={{ color: brand.textMuted, fontSize: 10, lineHeight: 1.45, marginTop: 9 }}>{quote.source_note || "Source recorded"}{quote.source_url && <> · <a href={quote.source_url} target="_blank" rel="noreferrer" style={{ color: brand.tealDark }}>source</a></>}</div>}
                  </div>
                  {!selectionMode && <button type="button" data-edit-quote-id={quote.id} onClick={() => editQuote(quote)} style={{ ...buttonStyle, minWidth: 40, padding: 9, background: brand.surfaceSoft, color: brand.text, border: `1px solid ${brand.border}` }} aria-label={`Edit item by ${quote.attribution || "With"}`}><Pencil size={15} /></button>}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${brand.border}` }}>
                  <button type="button" disabled={busy} onClick={() => toggleActive(quote)} style={{ ...buttonStyle, minHeight: 34, padding: "6px 10px", background: "transparent", color: brand.text, border: `1px solid ${brand.border}` }}>{quote.active ? "Pause" : "Activate"}</button>
                  {weeklyEligible && <button type="button" disabled={busy} onClick={() => featureNextReflection(quote)} style={{ ...buttonStyle, minHeight: 34, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 5, background: isNext ? brand.surfaceSoft : "transparent", color: brand.text, border: `1px solid ${isNext ? brand.teal : brand.border}` }}><Star size={13} /> {isNext ? "Featured next" : "Feature next reflection"}</button>}
                  {quote.featured_week && <button type="button" disabled={busy} onClick={() => clearFeature(quote)} style={{ ...buttonStyle, minHeight: 34, padding: "6px 10px", background: "transparent", color: brand.textMuted, border: `1px solid ${brand.border}` }}>Clear feature</button>}
                </div>
              </div>
            );
          })}
        </div>

        {!quotes.length ? <div style={{ ...cardStyle, color: brand.textMuted, textAlign: "center", padding: 30 }}>No editorial items yet. This is where With’s tiny bits of humanity live instead of being scattered through the codebase like breadcrumbs.</div> : !filteredQuotes.length && <div style={{ ...cardStyle, color: brand.textMuted, textAlign: "center", padding: 30 }}>No editorial items match those filters.</div>}
      </div>
    </div>
  );
}
