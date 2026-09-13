import { useEffect, useMemo, useState } from "react";
import { Activity, Check, Droplet, Footprints, Pencil, Scale, Utensils } from "lucide-react";
import { brand, metricColors } from "../brand.jsx";

const QUICK_ADD_OPTIONS = [
  { id: "food", label: "Food", icon: Utensils, color: metricColors.food },
  { id: "weight", label: "Weight", icon: Scale, color: metricColors.weight },
  { id: "activity", label: "Activity", icon: Activity, color: metricColors.activity },
  { id: "water", label: "Water", icon: Droplet, color: metricColors.water },
  { id: "steps", label: "Steps", icon: Footprints, color: metricColors.steps },
];

export default function QuickAddSection({
  quickAddIds,
  trackerEnabled,
  saveQuickAddIds,
  saving,
  error,
  openLog,
  selectedDate,
  styles,
}) {
  const { BORDER, TEXT, TEXT_MUTED, SURFACE_2 } = styles;
  const [editing, setEditing] = useState(false);
  const [draftIds, setDraftIds] = useState([]);
  const [limitNote, setLimitNote] = useState("");

  const availableOptions = useMemo(
    () => QUICK_ADD_OPTIONS.filter((option) => trackerEnabled(option.id)),
    [trackerEnabled]
  );

  const visibleQuickAdd = useMemo(() => {
    const optionMap = Object.fromEntries(QUICK_ADD_OPTIONS.map((option) => [option.id, option]));
    return (quickAddIds || [])
      .map((id) => optionMap[id])
      .filter((option) => option && trackerEnabled(option.id))
      .slice(0, 5);
  }, [quickAddIds, trackerEnabled]);

  useEffect(() => {
    if (!editing) return;
    const availableIds = new Set(availableOptions.map((option) => option.id));
    setDraftIds((quickAddIds || []).filter((id) => availableIds.has(id)).slice(0, 5));
    setLimitNote("");
  }, [editing, availableOptions, quickAddIds]);

  function toggleDraft(id) {
    setDraftIds((current) => {
      if (current.includes(id)) {
        setLimitNote("");
        return current.filter((item) => item !== id);
      }
      if (current.length >= 5) {
        setLimitNote("Quick Add holds five shortcuts. Remove one before adding another.");
        return current;
      }
      setLimitNote("");
      return [...current, id];
    });
  }

  async function save() {
    const ok = await saveQuickAddIds(draftIds);
    if (ok) setEditing(false);
  }

  return (
    <section id="today-quick-add" style={{ marginBottom: 30 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".11em", fontWeight: 800, color: TEXT_MUTED }}>Quick add</div>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          style={{ border: "none", background: "transparent", color: brand.tealDark, padding: "3px 0", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800 }}
        >
          {!editing && <Pencil size={12} strokeWidth={2} />} {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {editing && (
        <div style={{ marginTop: 9, marginBottom: 11, background: SURFACE_2, borderRadius: 10, padding: 11 }}>
          <div style={{ color: TEXT, fontSize: 12, fontWeight: 800 }}>Choose up to five shortcuts.</div>
          <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, marginTop: 2 }}>Everything else stays available in Log. Fasting keeps its own Today controls.</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginTop: 10 }}>
            {availableOptions.map(({ id, label, icon: Icon, color }) => {
              const selected = draftIds.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleDraft(id)}
                  style={{
                    minWidth: 0,
                    border: `${selected ? 2 : 1}px solid ${selected ? brand.teal : BORDER}`,
                    background: selected ? brand.surface : "transparent",
                    borderRadius: 9,
                    padding: "8px 2px 7px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    color: TEXT,
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  <span style={{ position: "relative", display: "grid", placeItems: "center" }}>
                    <Icon size={15} color={color} strokeWidth={2} />
                    {selected && (
                      <span style={{ position: "absolute", top: -6, right: -8, width: 12, height: 12, borderRadius: 99, background: brand.teal, display: "grid", placeItems: "center" }}>
                        <Check size={8} color={brand.inkOn} strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{label}</span>
                </button>
              );
            })}
          </div>

          {!availableOptions.length && (
            <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, marginTop: 9 }}>Turn on a tracker in Profile → My Trackers to make it available here.</div>
          )}
          {limitNote && <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.4, marginTop: 7 }}>{limitNote}</div>}
          {error && <div style={{ color: "#A64B43", fontSize: 10, lineHeight: 1.4, marginTop: 7 }}>{error}</div>}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
            <div style={{ color: TEXT_MUTED, fontSize: 10 }}>{draftIds.length} of 5 selected</div>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              style={{ border: "none", borderRadius: 8, background: brand.teal, color: brand.inkOn, padding: "8px 12px", fontSize: 11, fontWeight: 800, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving…" : "Save shortcuts"}
            </button>
          </div>
        </div>
      )}

      {visibleQuickAdd.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${visibleQuickAdd.length}, 1fr)`, gap: 7, marginTop: 10 }}>
          {visibleQuickAdd.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => openLog(id, selectedDate)}
              style={{
                background: "transparent",
                color: TEXT,
                border: `1px solid ${BORDER}`,
                borderTop: `3px solid ${color}`,
                borderRadius: 9,
                padding: "10px 3px 9px",
                boxShadow: "none",
                fontSize: 11,
                fontWeight: 800,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Icon style={{ width: 15, height: 15, color }} strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      ) : !editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{ width: "100%", marginTop: 9, border: `1px dashed ${BORDER}`, background: "transparent", borderRadius: 9, padding: "10px 12px", color: TEXT_MUTED, fontSize: 11, fontWeight: 700 }}
        >
          Choose your Quick Add shortcuts
        </button>
      ) : null}
    </section>
  );
}
