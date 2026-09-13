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

export default function QuickAddSection({ quickAddIds, trackerEnabled, saveQuickAddIds, saving, error, openLog, selectedDate, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, SURFACE, SURFACE_2 } = styles;
  const [editing, setEditing] = useState(false);
  const [draftIds, setDraftIds] = useState([]);
  const [limitNote, setLimitNote] = useState("");
  const [profileId, setProfileId] = useState(null);
  const [openCustomId, setOpenCustomId] = useState("");
  const today = new Date().toLocaleDateString("en-CA");
  const isToday = selectedDate === today;
  const custom = useCustomTrackerLogging(profileId, true, selectedDate);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || cancelled) return;
      const { data } = await supabase.from("profiles").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!cancelled) setProfileId(data?.id || null);
    })();
    return () => { cancelled = true; };
  }, []);

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

  async function save() { const ok = await saveQuickAddIds(draftIds); if (ok) setEditing(false); }
  const openMetric = custom.metrics.find((metric) => metric.id === openCustomId);

  function activate(option) {
    if (option.metric) { setOpenCustomId(option.metric.id); return; }
    openLog(option.id, selectedDate);
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
