import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Pencil, Search, Upload } from "lucide-react";
import { BrandLogo, brand } from "./brand.jsx";
import { supabase } from "./supabase.js";

const REQUIRED_IMPORT_FIELDS = ["name", "serving_description", "calories", "fat", "carbs", "protein"];
const OPTIONAL_IMPORT_FIELDS = ["fiber", "brand", "gtin_upc"];
const IMPORT_FIELDS = [...REQUIRED_IMPORT_FIELDS, ...OPTIONAL_IMPORT_FIELDS];
const HEADER_ALIASES = {
  name: ["name", "food", "food_name", "product", "product_name", "description"],
  serving_description: ["serving_description", "serving", "serving_size", "serving_label", "portion", "portion_size"],
  calories: ["calories", "calorie", "kcal", "energy_kcal"],
  fat: ["fat", "fat_g", "total_fat", "total_fat_g"],
  carbs: ["carbs", "carb", "carbohydrates", "carbohydrate", "carbs_g", "carbohydrates_g"],
  protein: ["protein", "protein_g"],
  fiber: ["fiber", "fibre", "fiber_g", "dietary_fiber", "dietary_fiber_g"],
  brand: ["brand", "brand_name", "manufacturer"],
  gtin_upc: ["gtin_upc", "upc", "barcode", "gtin", "ean"],
};

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function normalizeFoodKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(field); field = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }
  row.push(field);
  if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((header, index) => String(header || `column_${index + 1}`).trim());
  return {
    headers,
    rows: rows.slice(1).map((cells, index) => ({
      __row: index + 2,
      ...Object.fromEntries(headers.map((header, columnIndex) => [header, cells[columnIndex] ?? ""])),
    })),
  };
}

function guessMapping(headers) {
  const normalized = headers.map((header) => ({ original: header, normalized: normalizeHeader(header) }));
  return Object.fromEntries(IMPORT_FIELDS.map((field) => {
    const aliases = HEADER_ALIASES[field] || [field];
    const match = normalized.find((item) => aliases.includes(item.normalized));
    return [field, match?.original || ""];
  }));
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadText(filename, text, type = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatDate(value) {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const pageStyle = { minHeight: "100vh", background: brand.bg, color: brand.text, fontFamily: "'DM Sans', -apple-system, sans-serif" };
const cardStyle = { background: brand.surface, border: `1px solid ${brand.border}`, borderRadius: 16, padding: 16, boxShadow: "0 3px 12px rgba(28,36,48,.04)" };
const inputStyle = { width: "100%", minHeight: 42, borderRadius: 10, border: `1px solid ${brand.border}`, background: brand.surface, color: brand.text, padding: "9px 11px", fontSize: 14, boxSizing: "border-box" };
const labelStyle = { color: brand.textMuted, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".055em", marginBottom: 5 };
const buttonStyle = { minHeight: 40, borderRadius: 10, border: "none", padding: "9px 13px", fontSize: 13, fontWeight: 800, cursor: "pointer" };

export default function AdminApp() {
  const [access, setAccess] = useState("loading");
  const [tab, setTab] = useState("accounts");
  const [accounts, setAccounts] = useState([]);
  const [foods, setFoods] = useState([]);
  const [foodSearch, setFoodSearch] = useState("");
  const [editingFood, setEditingFood] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [csvState, setCsvState] = useState(null);
  const [sourceName, setSourceName] = useState("");

  async function loadFoods() {
    const pageSize = 1000;
    const all = [];
    let from = 0;
    while (true) {
      const { data, error: foodError } = await supabase
        .from("global_foods")
        .select("id,name,brand,serving_label,serving_description,calories,fat,carbs,protein,fiber,gtin_upc,source_type,source_id,import_batch_id,updated_at")
        .order("name")
        .range(from, from + pageSize - 1);
      if (foodError) throw foodError;
      all.push(...(data || []));
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }
    setFoods(all);
    return all;
  }

  async function loadAdmin() {
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) { setAccess("signed_out"); return; }
    const { data: allowed, error: accessError } = await supabase.rpc("is_app_admin");
    if (accessError || !allowed) { setAccess("forbidden"); return; }
    setAccess("allowed");
    const [{ data: accountRows, error: accountError }] = await Promise.all([
      supabase.rpc("admin_account_directory"),
      loadFoods(),
    ]);
    if (accountError) throw accountError;
    setAccounts(accountRows || []);
  }

  useEffect(() => {
    loadAdmin().catch((loadError) => { setError(loadError.message || "Could not load admin."); setAccess("error"); });
  }, []);

  const filteredFoods = useMemo(() => {
    const q = normalizeFoodKey(foodSearch);
    if (!q) return foods.slice(0, 150);
    return foods.filter((food) => [food.name, food.brand, food.gtin_upc].some((value) => normalizeFoodKey(value).includes(q))).slice(0, 150);
  }, [foods, foodSearch]);

  async function sendPasswordReset(email) {
    if (!email) return;
    setBusy(true); setMessage(""); setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (resetError) setError(resetError.message);
    else setMessage(`Password reset sent to ${email}.`);
    setBusy(false);
  }

  async function saveFood() {
    if (!editingFood?.id) return;
    setBusy(true); setMessage(""); setError("");
    const numericFields = ["calories", "fat", "carbs", "protein", "fiber"];
    const payload = {
      name: String(editingFood.name || "").trim(),
      brand: String(editingFood.brand || "").trim() || null,
      serving_label: String(editingFood.serving_label || editingFood.serving_description || "1 serving").trim(),
      serving_description: String(editingFood.serving_description || editingFood.serving_label || "").trim() || null,
      gtin_upc: String(editingFood.gtin_upc || "").trim() || null,
      updated_at: new Date().toISOString(),
    };
    for (const field of numericFields) payload[field] = Number(editingFood[field] || 0);
    if (!payload.name) { setError("Name is required."); setBusy(false); return; }
    if (!payload.serving_description) { setError("Serving description is required."); setBusy(false); return; }
    const { error: saveError } = await supabase.from("global_foods").update(payload).eq("id", editingFood.id);
    if (saveError) setError(saveError.message);
    else { setMessage(`${payload.name} updated.`); setEditingFood(null); await loadFoods(); }
    setBusy(false);
  }

  function downloadSample() {
    const sample = [
      IMPORT_FIELDS.join(","),
      ["Example Food", "1 bar", "210", "8", "24", "10", "4", "Example Brand", "001234567890"].map(escapeCsv).join(","),
    ].join("\n");
    downloadText("with-global-food-import-sample.csv", sample);
  }

  async function handleCsv(file) {
    setMessage(""); setError("");
    if (!file) return;
    const parsed = parseCsv(await file.text());
    if (!parsed.headers.length || !parsed.rows.length) { setError("That CSV does not appear to contain a header row and data rows."); return; }
    setCsvState({ filename: file.name, ...parsed, mapping: guessMapping(parsed.headers), preview: null });
  }

  function analyzeCsv() {
    if (!csvState) return;
    const mapping = csvState.mapping;
    const missingMappings = REQUIRED_IMPORT_FIELDS.filter((field) => !mapping[field]);
    if (missingMappings.length) { setError(`Map the required fields first: ${missingMappings.join(", ")}.`); return; }
    setError("");

    const existingUpcs = new Set(foods.map((food) => String(food.gtin_upc || "").trim()).filter(Boolean));
    const existingKeys = new Set(foods.map((food) => [normalizeFoodKey(food.name), normalizeFoodKey(food.brand), normalizeFoodKey(food.serving_description || food.serving_label)].join("|")));
    const seenUpcs = new Set();
    const seenKeys = new Set();
    const rows = csvState.rows.map((raw) => {
      const value = (field) => String(raw[mapping[field]] ?? "").trim();
      const row = {
        __row: raw.__row,
        name: value("name"),
        serving_description: value("serving_description"),
        calories: value("calories"),
        fat: value("fat"),
        carbs: value("carbs"),
        protein: value("protein"),
        fiber: mapping.fiber ? value("fiber") : "",
        brand: mapping.brand ? value("brand") : "",
        gtin_upc: mapping.gtin_upc ? value("gtin_upc") : "",
      };
      const problems = [];
      if (!row.name) problems.push("missing name");
      if (!row.serving_description) problems.push("missing serving description");
      for (const field of ["calories", "fat", "carbs", "protein"]) {
        if (row[field] === "") problems.push(`missing ${field}`);
        else if (!Number.isFinite(Number(row[field])) || Number(row[field]) < 0) problems.push(`invalid ${field}`);
      }
      if (row.fiber !== "" && (!Number.isFinite(Number(row.fiber)) || Number(row.fiber) < 0)) problems.push("invalid fiber");
      const key = [normalizeFoodKey(row.name), normalizeFoodKey(row.brand), normalizeFoodKey(row.serving_description)].join("|");
      let duplicate = false;
      if (row.gtin_upc && (existingUpcs.has(row.gtin_upc) || seenUpcs.has(row.gtin_upc))) duplicate = true;
      if (existingKeys.has(key) || seenKeys.has(key)) duplicate = true;
      if (!problems.length && !duplicate) {
        if (row.gtin_upc) seenUpcs.add(row.gtin_upc);
        seenKeys.add(key);
      }
      return { ...row, problems, duplicate };
    });
    setCsvState((current) => ({ ...current, preview: rows }));
  }

  function downloadRejected() {
    const rows = csvState?.preview?.filter((row) => row.problems.length) || [];
    const headers = [...IMPORT_FIELDS, "import_error"];
    const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCsv(header === "import_error" ? row.problems.join("; ") : row[header])).join(","))].join("\n");
    downloadText("with-food-import-rejected.csv", csv);
  }

  async function importCsv() {
    const preview = csvState?.preview || [];
    const ready = preview.filter((row) => !row.problems.length && !row.duplicate);
    const duplicates = preview.filter((row) => row.duplicate && !row.problems.length).length;
    const rejected = preview.filter((row) => row.problems.length).length;
    if (!ready.length) { setError("There are no valid new rows to import."); return; }
    if (!sourceName.trim()) { setError("Add a source name before importing so we know where these foods came from."); return; }
    setBusy(true); setError(""); setMessage("");
    const { data: batch, error: batchError } = await supabase.from("food_import_batches").insert({
      source_name: sourceName.trim(), filename: csvState.filename, total_rows: preview.length,
      duplicate_rows: duplicates, rejected_rows: rejected,
    }).select("id").single();
    if (batchError) { setError(batchError.message); setBusy(false); return; }
    let imported = 0;
    try {
      for (let i = 0; i < ready.length; i += 250) {
        const chunk = ready.slice(i, i + 250).map((row) => ({
          name: row.name,
          serving_label: row.serving_description,
          serving_description: row.serving_description,
          calories: Number(row.calories),
          fat: Number(row.fat),
          carbs: Number(row.carbs),
          protein: Number(row.protein),
          fiber: row.fiber === "" ? 0 : Number(row.fiber),
          brand: row.brand || null,
          gtin_upc: row.gtin_upc || null,
          source_type: "admin_import",
          source_id: `${batch.id}:${row.__row}`,
          import_batch_id: batch.id,
        }));
        const { error: insertError } = await supabase.from("global_foods").insert(chunk);
        if (insertError) throw insertError;
        imported += chunk.length;
      }
      await supabase.from("food_import_batches").update({ status: "completed", imported_rows: imported, completed_at: new Date().toISOString() }).eq("id", batch.id);
      setMessage(`Imported ${imported.toLocaleString()} foods. ${duplicates.toLocaleString()} duplicates skipped; ${rejected.toLocaleString()} rows rejected.`);
      setCsvState(null); setSourceName(""); await loadFoods();
    } catch (importError) {
      await supabase.from("food_import_batches").update({ status: "partial", imported_rows: imported, completed_at: new Date().toISOString() }).eq("id", batch.id);
      setError(`Import stopped after ${imported.toLocaleString()} rows: ${importError.message}`);
    }
    setBusy(false);
  }

  if (access === "loading") return <div style={{ ...pageStyle, display: "grid", placeItems: "center" }}>Loading admin…</div>;
  if (access === "signed_out") return <div style={{ ...pageStyle, display: "grid", placeItems: "center", padding: 24 }}><div style={{ ...cardStyle, maxWidth: 440 }}><BrandLogo style={{ width: 116 }} /><h2>Admin</h2><p style={{ color: brand.textMuted }}>Sign in to With first, then return to /admin.</p><a href="/" style={{ color: brand.tealDark, fontWeight: 800 }}>Back to With</a></div></div>;
  if (access === "forbidden") return <div style={{ ...pageStyle, display: "grid", placeItems: "center", padding: 24 }}><div style={{ ...cardStyle, maxWidth: 440 }}><h2>Not available</h2><p style={{ color: brand.textMuted }}>This account does not have admin access.</p><a href="/" style={{ color: brand.tealDark, fontWeight: 800 }}>Back to With</a></div></div>;

  const preview = csvState?.preview || [];
  const validCount = preview.filter((row) => !row.problems.length && !row.duplicate).length;
  const duplicateCount = preview.filter((row) => row.duplicate && !row.problems.length).length;
  const rejectedCount = preview.filter((row) => row.problems.length).length;

  return (
    <div style={pageStyle}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,500;6..72,600;6..72,700&display=swap'); *{box-sizing:border-box} body{margin:0} button,input,select{font-family:inherit}`}</style>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 16px 60px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <div><BrandLogo style={{ width: 110, marginBottom: 8 }} /><div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600 }}>Admin</div><div style={{ color: brand.textMuted, fontSize: 13 }}>Support the system without rummaging through people’s health data.</div></div>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: brand.tealDark, fontWeight: 800, textDecoration: "none", fontSize: 13 }}><ArrowLeft size={15} /> With</a>
        </header>

        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {[['accounts','Accounts'], ['foods','Global Foods'], ['import','CSV Import']].map(([id,label]) => <button key={id} onClick={() => setTab(id)} style={{ ...buttonStyle, minHeight: 36, padding: "7px 12px", borderRadius: 999, background: tab === id ? brand.surfaceSoft : "transparent", color: tab === id ? brand.text : brand.textMuted, border: `1px solid ${tab === id ? brand.teal : brand.border}` }}>{label}</button>)}
        </div>

        {(message || error) && <div style={{ ...cardStyle, marginBottom: 14, borderColor: error ? brand.warn : brand.border, color: error ? brand.warn : brand.text, fontSize: 13 }}>{error || message}</div>}

        {tab === "accounts" && <div style={{ display: "grid", gap: 10 }}>
          {accounts.map((account) => <details key={account.user_id} style={cardStyle}>
            <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div><div style={{ fontWeight: 800 }}>{account.profile_name || account.email || "Unnamed account"}</div><div style={{ color: brand.textMuted, fontSize: 12, marginTop: 2 }}>{account.email}</div></div>
              <div style={{ color: brand.textMuted, fontSize: 11, textAlign: "right" }}>{(account.withs || []).length} With{(account.withs || []).length === 1 ? "" : "s"}<br />Last sign-in {formatDate(account.last_sign_in_at)}</div>
            </summary>
            <div style={{ borderTop: `1px solid ${brand.border}`, marginTop: 14, paddingTop: 14, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 10 }}>
                <div><div style={labelStyle}>Account created</div><div style={{ fontSize: 12 }}>{formatDate(account.created_at)}</div></div>
                <div><div style={labelStyle}>Email confirmed</div><div style={{ fontSize: 12 }}>{account.email_confirmed_at ? "Yes" : "No"}</div></div>
                <div><div style={labelStyle}>Standard trackers</div><div style={{ fontSize: 12 }}>{account.enabled_standard_trackers}</div></div>
                <div><div style={labelStyle}>Custom trackers</div><div style={{ fontSize: 12 }}>{account.enabled_custom_trackers}</div></div>
              </div>
              <div><div style={labelStyle}>With memberships</div>{(account.withs || []).length ? (account.withs || []).map((item) => <div key={item.id} style={{ fontSize: 12, padding: "5px 0" }}>{item.name} · {item.role} <span style={{ color: brand.textMuted }}>({item.id})</span></div>) : <div style={{ color: brand.textMuted, fontSize: 12 }}>No With memberships.</div>}</div>
              <div style={{ color: brand.textMuted, fontSize: 10, lineHeight: 1.5 }}>User ID: {account.user_id}<br />Profile ID: {account.profile_id || "none"}</div>
              <button disabled={busy} onClick={() => sendPasswordReset(account.email)} style={{ ...buttonStyle, width: "fit-content", background: brand.teal, color: brand.inkOn }}>Send password reset</button>
            </div>
          </details>)}
        </div>}

        {tab === "foods" && <>
          <div style={{ ...cardStyle, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Search size={16} color={brand.textMuted} /><input value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} placeholder="Search name, brand, or UPC" style={{ ...inputStyle, border: "none", padding: 0, minHeight: 32, background: "transparent" }} /></div>
          <div style={{ color: brand.textMuted, fontSize: 11, marginBottom: 10 }}>{foods.length.toLocaleString()} Global Foods · showing up to 150 matches</div>
          <div style={{ display: "grid", gap: 8 }}>{filteredFoods.map((food) => <div key={food.id} style={{ ...cardStyle, padding: 12, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}><div style={{ minWidth: 0 }}><div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{food.name}</div><div style={{ color: brand.textMuted, fontSize: 11, marginTop: 3 }}>{food.brand || "Generic"} · {food.serving_description || food.serving_label} · {Number(food.calories || 0)} cal · P {Number(food.protein || 0)}g · C {Number(food.carbs || 0)}g · F {Number(food.fat || 0)}g</div></div><button onClick={() => setEditingFood({ ...food })} style={{ ...buttonStyle, background: brand.surfaceSoft, color: brand.text, border: `1px solid ${brand.border}`, padding: 9 }} aria-label={`Edit ${food.name}`}><Pencil size={15} /></button></div>)}</div>
        </>}

        {editingFood && <div style={{ position: "fixed", inset: 0, background: "rgba(25,32,31,.35)", zIndex: 20, display: "grid", placeItems: "center", padding: 16 }}><div style={{ ...cardStyle, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}><div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 24, fontWeight: 600, marginBottom: 14 }}>Edit Global Food</div><div style={{ display: "grid", gap: 10 }}>{[["name","Name"],["brand","Brand"],["serving_description","Serving description"],["gtin_upc","UPC / barcode"]].map(([field,label]) => <label key={field}><div style={labelStyle}>{label}</div><input value={editingFood[field] ?? ""} onChange={(e) => setEditingFood((current) => ({ ...current, [field]: e.target.value }))} style={inputStyle} /></label>)}<div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>{[["calories","Calories"],["fat","Fat (g)"],["carbs","Carbs (g)"],["protein","Protein (g)"],["fiber","Fiber (g)"]].map(([field,label]) => <label key={field}><div style={labelStyle}>{label}</div><input type="number" min="0" step="0.1" value={editingFood[field] ?? 0} onChange={(e) => setEditingFood((current) => ({ ...current, [field]: e.target.value }))} style={inputStyle} /></label>)}</div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}><button disabled={busy} onClick={() => setEditingFood(null)} style={{ ...buttonStyle, background: brand.surfaceSoft, color: brand.text, border: `1px solid ${brand.border}` }}>Cancel</button><button disabled={busy} onClick={saveFood} style={{ ...buttonStyle, background: brand.teal, color: brand.inkOn }}>{busy ? "Saving…" : "Save changes"}</button></div></div></div>}

        {tab === "import" && <div style={{ display: "grid", gap: 12 }}>
          <div style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 14 }}><div><div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 23, fontWeight: 600 }}>Import Global Foods</div><div style={{ color: brand.textMuted, fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>Name, serving description, calories, fat, carbs, and protein are required. Fiber, brand, and UPC can be blank.</div></div><button onClick={downloadSample} style={{ ...buttonStyle, display: "inline-flex", gap: 6, alignItems: "center", background: brand.surfaceSoft, color: brand.text, border: `1px solid ${brand.border}`, whiteSpace: "nowrap" }}><Download size={14} /> Sample CSV</button></div><label><div style={labelStyle}>Source name</div><input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. Trader Joe’s catalog, September 2026" style={inputStyle} /></label><label style={{ display: "block", marginTop: 12 }}><div style={labelStyle}>CSV file</div><div style={{ border: `1px dashed ${brand.teal}`, borderRadius: 12, padding: 18, textAlign: "center", background: brand.surfaceSoft }}><Upload size={20} style={{ marginBottom: 6 }} /><input type="file" accept=".csv,text/csv" onChange={(e) => handleCsv(e.target.files?.[0])} /></div></label></div>
          {csvState && <div style={cardStyle}><div style={{ fontWeight: 800, marginBottom: 3 }}>{csvState.filename}</div><div style={{ color: brand.textMuted, fontSize: 11, marginBottom: 14 }}>{csvState.rows.length.toLocaleString()} data rows</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>{IMPORT_FIELDS.map((field) => <label key={field}><div style={labelStyle}>{field.replaceAll("_", " ")}{REQUIRED_IMPORT_FIELDS.includes(field) ? " *" : ""}</div><select value={csvState.mapping[field] || ""} onChange={(e) => setCsvState((current) => ({ ...current, mapping: { ...current.mapping, [field]: e.target.value }, preview: null }))} style={inputStyle}><option value="">Not mapped</option>{csvState.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div><button onClick={analyzeCsv} style={{ ...buttonStyle, marginTop: 14, background: brand.teal, color: brand.inkOn }}>Validate import</button></div>}
          {preview.length > 0 && <div style={cardStyle}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}><div style={{ background: brand.surfaceSoft, borderRadius: 10, padding: 12 }}><div style={labelStyle}>Ready</div><div style={{ fontSize: 24, fontWeight: 800 }}>{validCount.toLocaleString()}</div></div><div style={{ background: brand.surfaceSoft, borderRadius: 10, padding: 12 }}><div style={labelStyle}>Duplicates</div><div style={{ fontSize: 24, fontWeight: 800 }}>{duplicateCount.toLocaleString()}</div></div><div style={{ background: brand.surfaceSoft, borderRadius: 10, padding: 12 }}><div style={labelStyle}>Need attention</div><div style={{ fontSize: 24, fontWeight: 800 }}>{rejectedCount.toLocaleString()}</div></div></div>{rejectedCount > 0 && <button onClick={downloadRejected} style={{ ...buttonStyle, background: "transparent", color: brand.tealDark, border: `1px solid ${brand.border}`, marginBottom: 12 }}>Download rejected rows</button>}<div style={{ overflowX: "auto", marginBottom: 14 }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}><thead><tr>{["Row","Name","Serving","Calories","Status"].map((header) => <th key={header} style={{ textAlign: "left", padding: "7px 6px", borderBottom: `1px solid ${brand.border}`, color: brand.textMuted }}>{header}</th>)}</tr></thead><tbody>{preview.slice(0, 12).map((row) => <tr key={row.__row}><td style={{ padding: 6 }}>{row.__row}</td><td style={{ padding: 6 }}>{row.name}</td><td style={{ padding: 6 }}>{row.serving_description}</td><td style={{ padding: 6 }}>{row.calories}</td><td style={{ padding: 6 }}>{row.problems.length ? row.problems.join("; ") : row.duplicate ? "duplicate" : "ready"}</td></tr>)}</tbody></table></div><button disabled={busy || validCount === 0} onClick={importCsv} style={{ ...buttonStyle, width: "100%", background: brand.teal, color: brand.inkOn, opacity: busy || validCount === 0 ? .55 : 1 }}>{busy ? "Importing…" : `Import ${validCount.toLocaleString()} foods`}</button></div>}
        </div>}
      </div>
    </div>
  );
}
