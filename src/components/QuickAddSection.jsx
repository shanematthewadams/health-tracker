import { useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, Brain, Check, Coffee, Droplet, Dumbbell, Flame, Footprints, Heart, Leaf, Moon, Pencil, Scale, Smile, Sparkles, Star, Sun, Timer, Utensils, X } from "lucide-react";
import { brand, metricColors } from "../brand.jsx";
import { supabase } from "../supabase.js";
import { useCustomTrackerLogging } from "../useCustomTrackerLogging.js";
import CustomTrackerLogger from "./CustomTrackerLogger.jsx";

const STANDARD_OPTIONS = [
  { id: "food", label: "Food", icon: Utensils, color: metricColors.food },
  { id: "weight", label: "Weight", icon: Scale, color: metricColors.weight },
  { id: "activity", label: "Activity", icon: Activity, color: metricColors.activity },
  { id: "water", label: "Water", icon: Droplet, color: metricColors.water },
  { id: "steps", label: "Steps", icon: Footprints, color: metricColors.steps },
];

const ICONS = { sparkles: Sparkles, heart: Heart, brain: Brain, book_open: BookOpen, leaf: Leaf, moon: Moon, sun: Sun, smile: Smile, flame: Flame, coffee: Coffee, dumbbell: Dumbbell, footprints: Footprints, droplet: Droplet, timer: Timer, star: Star };

function dateLabel(date) {
  if (!date) return "";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function QuickAddSection({ quickAddIds, trackerEnabled, saveQuickAddIds, saving, error, openLog, selectedDate, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, SURFACE, SURFACE_2, inputStyle } = styles;
  const [editing, setEditing] = useState(false);
  const [draftIds, setDraftIds] = useState([]);
  const [limitNote, setLimitNote] = useState("");
  const [profileId, setProfileId] = useState(null);
  const [openCustomId, setOpenCustomId] = useState("");
  const [openStandardId, setOpenStandardId] = useState("");
  const [standardValue, setStandardValue] = useState("");
  const [activityName, setActivityName] = useState("");
  const [activityCalories, setActivityCalories] = useState("");
  const [standardSaving, setStandardSaving] = useState(false);
  const [standardError, setStandardError] = useState("");
  const [standardSuccess, setStandardSuccess] = useState("");
  const [waterShortcuts, setWaterShortcuts] = useState([8, 16, 24]);
  const today = new Date().toLocaleDateString("en-CA");
  const isToday = selectedDate === today;
  const custom = useCustomTrackerLogging(profileId, true, selectedDate);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || cancelled) return;
      const savedWater = session.user.user_metadata?.water_shortcuts;
      if (Array.isArray(savedWater) && savedWater.length === 3 && savedWater.every((value) => Number.isFinite(Number(value)) && Number(value) > 0)) {
        setWaterShortcuts(savedWater.map(Number));
      }
      const { data } = await supabase.from("profiles").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!cancelled) setProfileId(data?.id || null);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setOpenCustomId("");
    setOpenStandardId("");
    setStandardError("");
    setStandardSuccess("");
  }, [selectedDate]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("with-today-date-changed", { detail: { selectedDate } }));
  }, [selectedDate]);

  const customOptions = useMemo(() => custom.metrics.map((metric) => ({ id: `custom:${metric.id}`, label: metric.name, icon: ICONS[metric.icon_key] || Sparkles, color: brand.teal, metric })), [custom.metrics]);
  const availableOptions = useMemo(() => [...STANDARD_OPTIONS.filter((option) => trackerEnabled(option.id)), ...customOptions], [trackerEnabled, customOptions]);
  const visibleQuickAdd = useMemo(() => {
    const optionMap = Object.fromEntries(availableOptions.map((option) => [option.id, option]));
    return (quickAddIds || []).map((id) => optionMap[id]).filter(Boolean).slice(0, 5);
  }, [quickAddIds, availableOptions]);

  useEffect(() => {
    if (!editing) return;
    const availableIds = new Set(availableOptions.map((option) => option.id));
    setDraftIds((quickAddIds || []).filter((id) => availableIds.has(id)).slice(0, 5));
    setLimitNote("");
  }, [editing, availableOptions, quickAddIds]);

  function toggleDraft(id) {
    setDraftIds((current) => {
      if (current.includes(id)) { setLimitNote(""); return current.filter((item) => item !== id); }
      if (current.length >= 5) { setLimitNote("Quick Add holds five shortcuts. Remove one before adding another."); return current; }
      setLimitNote(""); return [...current, id];
    });
  }

  async function save() {
    const ok = await saveQuickAddIds(draftIds);
    if (ok) setEditing(false);
  }

  const openMetric = custom.metrics.find((metric) => metric.id === openCustomId);
  const openStandard = STANDARD_OPTIONS.find((option) => option.id === openStandardId);

  function openStandardLogger(id) {
    setOpenCustomId("");
    setOpenStandardId(id);
    setStandardValue("");
    setActivityName("");
    setActivityCalories("");
    setStandardError("");
    setStandardSuccess("");
  }

  function activate(option) {
    if (option.metric) {
      setOpenStandardId("");
      setOpenCustomId(option.metric.id);
      return;
    }
    if (option.id === "food") {
      openLog("food", selectedDate);
      return;
    }
    openStandardLogger(option.id);
  }

  function announceStandardSave(kind, row) {
    window.dispatchEvent(new CustomEvent("with-standard-quick-add-saved", {
      detail: { kind, row, entryDate: selectedDate },
    }));
  }

  async function saveStandard(kind, directValue = null) {
    if (!profileId || !selectedDate || standardSaving) return;
    setStandardSaving(true);
    setStandardError("");
    setStandardSuccess("");

    try {
      if (kind === "weight") {
        const value = Number(standardValue);
        if (!standardValue || !Number.isFinite(value) || value <= 0) throw new Error("Enter a real weight first.");
        const { data, error: saveError } = await supabase
          .from("weight_entries")
          .upsert({ profile_id: profileId, entry_date: selectedDate, weight: value }, { onConflict: "profile_id,entry_date" })
          .select("id,entry_date,weight")
          .single();
        if (saveError) throw saveError;
        announceStandardSave(kind, data);
        setStandardSuccess(`${value} lb logged`);
      } else if (kind === "steps") {
        const value = Number(standardValue);
        if (standardValue === "" || !Number.isInteger(value) || value < 0) throw new Error("Enter a valid step total.");
        const { data, error: saveError } = await supabase
          .from("step_entries")
          .upsert({ profile_id: profileId, entry_date: selectedDate, step_count: value }, { onConflict: "profile_id,entry_date" })
          .select("id,entry_date,step_count")
          .single();
        if (saveError) throw saveError;
        announceStandardSave(kind, data);
        setStandardSuccess(`${value.toLocaleString()} steps saved`);
      } else if (kind === "water") {
        const value = directValue == null ? Number(standardValue) : Number(directValue);
        if (!Number.isFinite(value) || value <= 0) throw new Error("Enter an amount greater than 0.");
        const { data, error: saveError } = await supabase
          .from("water_entries")
          .insert({ profile_id: profileId, entry_date: selectedDate, ounces: value })
          .select("id,entry_date,ounces")
          .single();
        if (saveError) throw saveError;
        announceStandardSave(kind, data);
        setStandardSuccess(`${value} oz added`);
      } else if (kind === "activity") {
        const name = activityName.trim();
        const calories = Number(activityCalories);
        if (!name) throw new Error("Add an activity name.");
        if (!activityCalories || !Number.isFinite(calories) || calories <= 0) throw new Error("Enter calories burned.");
        const { data, error: saveError } = await supabase
          .from("activity_entries")
          .insert({ profile_id: profileId, entry_date: selectedDate, name, calories_burned: calories })
          .select("id,entry_date,name,calories_burned")
          .single();
        if (saveError) throw saveError;
        announceStandardSave(kind, data);
        setStandardSuccess(`${name} added`);
      }

      window.setTimeout(() => {
        setOpenStandardId("");
        setStandardValue("");
        setActivityName("");
        setActivityCalories("");
        setStandardSuccess("");
      }, 450);
    } catch (saveError) {
      setStandardError(saveError?.message || "We couldn’t save that. Try again.");
    } finally {
      setStandardSaving(false);
    }
  }

  return (
    <section id="today-quick-add" style={{ marginBottom: 30 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".11em", fontWeight: 800, color: TEXT_MUTED }}>Quick add</div>
        <button type="button" onClick={() => setEditing((value) => !value)} style={{ border: "none", background: "transparent", color: brand.tealDark, padding: "3px 0", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800 }}>
          {!editing && <Pencil size={12} strokeWidth={2} />} {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {editing && (
        <div style={{ marginTop: 9, marginBottom: 11, background: SURFACE_2, borderRadius: 10, padding: 11 }}>
          <div style={{ color: TEXT, fontSize: 12, fontWeight: 800 }}>Choose up to five shortcuts.</div>
          <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, marginTop: 2 }}>Standard and personal trackers can live here. Fasting keeps its own Today controls.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginTop: 10 }}>
            {availableOptions.map(({ id, label, icon: Icon, color }) => {
              const selected = draftIds.includes(id);
              return <button key={id} type="button" aria-pressed={selected} onClick={() => toggleDraft(id)} style={{ minWidth: 0, border: `${selected ? 2 : 1}px solid ${selected ? brand.teal : BORDER}`, background: selected ? brand.surface : "transparent", borderRadius: 9, padding: "8px 2px 7px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: TEXT, fontSize: 10, fontWeight: 800 }}>
                <span style={{ position: "relative", display: "grid", placeItems: "center" }}><Icon size={15} color={color} strokeWidth={2} />{selected && <span style={{ position: "absolute", top: -6, right: -8, width: 12, height: 12, borderRadius: 99, background: brand.teal, display: "grid", placeItems: "center" }}><Check size={8} color={brand.inkOn} strokeWidth={3} /></span>}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{label}</span>
              </button>;
            })}
          </div>
          {!availableOptions.length && <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, marginTop: 9 }}>Turn on a tracker in Profile → My Trackers to make it available here.</div>}
          {limitNote && <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.4, marginTop: 7 }}>{limitNote}</div>}
          {(error || custom.error) && <div style={{ color: "#A64B43", fontSize: 10, lineHeight: 1.4, marginTop: 7 }}>{error || custom.error}</div>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10 }}><div style={{ color: TEXT_MUTED, fontSize: 10 }}>{draftIds.length} of 5 selected</div><button type="button" disabled={saving} onClick={save} style={{ border: "none", borderRadius: 8, background: brand.teal, color: brand.inkOn, padding: "8px 12px", fontSize: 11, fontWeight: 800, opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : "Save shortcuts"}</button></div>
        </div>
      )}

      {visibleQuickAdd.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${visibleQuickAdd.length}, 1fr)`, gap: 7, marginTop: 10 }}>
          {visibleQuickAdd.map((option) => { const Icon = option.icon; return <button key={option.id} onClick={() => activate(option)} style={{ background: "transparent", color: TEXT, border: `1px solid ${BORDER}`, borderTop: `3px solid ${option.color}`, borderRadius: 9, padding: "10px 3px 9px", boxShadow: "none", fontSize: 11, fontWeight: 800, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}><Icon style={{ width: 15, height: 15, color: option.color }} strokeWidth={2} /><span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{option.label}</span></button>; })}
        </div>
      ) : !editing ? <button type="button" onClick={() => setEditing(true)} style={{ width: "100%", marginTop: 9, border: `1px dashed ${BORDER}`, background: "transparent", borderRadius: 9, padding: "10px 12px", color: TEXT_MUTED, fontSize: 11, fontWeight: 700 }}>Choose your Quick Add shortcuts</button> : null}

      {openStandard && (
        <div role="dialog" aria-modal="true" aria-label={`Quick add ${openStandard.label}`} onClick={() => !standardSaving && setOpenStandardId("")} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(30,35,34,.28)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(100%, 520px)", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "14px 14px 16px", boxShadow: "0 18px 50px rgba(0,0,0,.16)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ color: TEXT_MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 800 }}>{isToday ? "Quick add" : `Quick add · ${dateLabel(selectedDate)}`}</div>
                <div style={{ color: TEXT, fontFamily: "'Newsreader', Georgia, serif", fontSize: 22, fontWeight: 600, marginTop: 2 }}>{openStandard.label}</div>
              </div>
              <button type="button" aria-label="Close" disabled={standardSaving} onClick={() => setOpenStandardId("")} style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: 3 }}><X size={17} /></button>
            </div>

            {openStandard.id === "weight" && <div><div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Weight (lb)</div><input autoFocus type="number" step="0.1" inputMode="decimal" placeholder="e.g. 182.4" value={standardValue} onChange={(event) => setStandardValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveStandard("weight"); }} style={{ ...inputStyle, marginBottom: 10 }} /><button type="button" disabled={standardSaving} onClick={() => saveStandard("weight")} style={{ width: "100%", border: "none", borderRadius: 9, background: brand.teal, color: brand.inkOn, padding: "11px 12px", fontSize: 12, fontWeight: 800 }}>{standardSaving ? "Saving…" : "Save weight"}</button></div>}

            {openStandard.id === "steps" && <div><div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Step total</div><input autoFocus type="number" inputMode="numeric" placeholder="e.g. 8500" value={standardValue} onChange={(event) => setStandardValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveStandard("steps"); }} style={{ ...inputStyle, marginBottom: 10 }} /><button type="button" disabled={standardSaving} onClick={() => saveStandard("steps")} style={{ width: "100%", border: "none", borderRadius: 9, background: brand.teal, color: brand.inkOn, padding: "11px 12px", fontSize: 12, fontWeight: 800 }}>{standardSaving ? "Saving…" : "Save steps"}</button></div>}

            {openStandard.id === "water" && <div><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>{waterShortcuts.map((amount) => <button key={amount} type="button" disabled={standardSaving} onClick={() => saveStandard("water", amount)} style={{ border: `1px solid ${BORDER}`, borderRadius: 9, background: SURFACE_2, color: TEXT, padding: "11px 4px", fontSize: 12, fontWeight: 800 }}>+{amount} oz</button>)}</div><div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Other amount (oz)</div><div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}><input type="number" inputMode="decimal" placeholder="oz" value={standardValue} onChange={(event) => setStandardValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveStandard("water"); }} style={inputStyle} /><button type="button" disabled={standardSaving} onClick={() => saveStandard("water")} style={{ border: "none", borderRadius: 9, background: brand.teal, color: brand.inkOn, padding: "10px 13px", fontSize: 12, fontWeight: 800 }}>{standardSaving ? "Adding…" : "Add"}</button></div></div>}

            {openStandard.id === "activity" && <div><div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Activity</div><input autoFocus type="text" placeholder="e.g. run, lifting, walk" value={activityName} onChange={(event) => setActivityName(event.target.value)} style={{ ...inputStyle, marginBottom: 10 }} /><div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Calories burned</div><input type="number" inputMode="numeric" value={activityCalories} onChange={(event) => setActivityCalories(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveStandard("activity"); }} style={{ ...inputStyle, marginBottom: 10 }} /><button type="button" disabled={standardSaving} onClick={() => saveStandard("activity")} style={{ width: "100%", border: "none", borderRadius: 9, background: brand.teal, color: brand.inkOn, padding: "11px 12px", fontSize: 12, fontWeight: 800 }}>{standardSaving ? "Saving…" : "Save activity"}</button></div>}

            {standardError && <div style={{ color: "#A64B43", fontSize: 11, marginTop: 9 }}>{standardError}</div>}
            {standardSuccess && <div style={{ color: brand.tealDark, fontSize: 11, fontWeight: 800, marginTop: 9 }}>{standardSuccess}</div>}
          </div>
        </div>
      )}

      {openMetric && (
        <div role="dialog" aria-modal="true" aria-label={`Log ${openMetric.name}`} onClick={() => setOpenCustomId("")} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(30,35,34,.28)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(100%, 520px)", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "14px 14px 16px", boxShadow: "0 18px 50px rgba(0,0,0,.16)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><div style={{ color: TEXT_MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 800 }}>{isToday ? "Quick add" : "Quick add to this day"}</div><button type="button" aria-label="Close" onClick={() => setOpenCustomId("")} style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: 3 }}><X size={17} /></button></div>
            <CustomTrackerLogger metric={openMetric} entry={custom.entries[openMetric.id]} entryDate={selectedDate} isToday={isToday} saving={custom.savingId === openMetric.id} onSave={async (metric, value) => { const ok = await custom.saveValue(metric, value); if (ok) setOpenCustomId(""); }} onDelete={custom.deleteValue} styles={styles} compact />
            {custom.error && <div style={{ color: "#A64B43", fontSize: 10, marginTop: 8 }}>{custom.error}</div>}
          </div>
        </div>
      )}
    </section>
  );
}
