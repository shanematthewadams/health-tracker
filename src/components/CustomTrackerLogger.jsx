import { useEffect, useState } from "react";
import { brand } from "../brand.jsx";

function dateLabel(date) {
  if (!date) return "";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function currentValue(metric, entry) {
  if (!entry) return "";
  if (metric.value_type === "yes_no") return entry.boolean_value;
  return entry.numeric_value == null ? "" : String(entry.numeric_value);
}

export default function CustomTrackerLogger({ metric, entry, entryDate, isToday, saving, onSave, onDelete, styles, compact = false }) {
  const { BORDER, TEXT, TEXT_MUTED, SURFACE_2, inputStyle } = styles;
  const [value, setValue] = useState(currentValue(metric, entry));
  const [localError, setLocalError] = useState("");

  useEffect(() => { setValue(currentValue(metric, entry)); setLocalError(""); }, [metric?.id, entry?.id, entry?.updated_at, entryDate]);

  async function saveNumeric() {
    const number = Number(value);
    if (value === "" || !Number.isFinite(number)) { setLocalError("Enter a number first."); return; }
    if ((metric.value_type === "count" || metric.value_type === "rating") && !Number.isInteger(number)) { setLocalError("Use a whole number here."); return; }
    if (metric.value_type === "rating" && (number < 1 || number > 5)) { setLocalError("Choose a rating from 1 to 5."); return; }
    setLocalError("");
    await onSave(metric, number);
  }

  const heading = `${metric.name}${!isToday ? ` · ${dateLabel(entryDate)}` : ""}`;
  const unit = metric.value_type === "duration" ? "minutes" : metric.unit || "";

  return (
    <div style={{ background: compact ? "transparent" : SURFACE_2, border: compact ? "none" : `1px solid ${BORDER}`, borderRadius: 11, padding: compact ? 0 : 12 }}>
      <div style={{ color: TEXT, fontSize: 13, fontWeight: 800, marginBottom: 8 }}>{heading}</div>

      {metric.value_type === "yes_no" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[true, false].map((choice) => {
            const selected = value === choice;
            return <button key={String(choice)} type="button" disabled={saving} onClick={async () => { setValue(choice); await onSave(metric, choice); }} style={{ border: `${selected ? 2 : 1}px solid ${selected ? brand.teal : BORDER}`, background: selected ? brand.surfaceSoft : "transparent", borderRadius: 9, padding: "10px", color: TEXT, fontWeight: 800 }}>{choice ? "Yes" : "No"}</button>;
          })}
        </div>
      ) : metric.value_type === "rating" ? (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
            {[1,2,3,4,5].map((rating) => {
              const selected = Number(value) === rating;
              return <button key={rating} type="button" aria-label={`${metric.name}: ${rating} of 5`} disabled={saving} onClick={async () => { setValue(String(rating)); setLocalError(""); await onSave(metric, rating); }} style={{ aspectRatio: "1", borderRadius: 999, border: `${selected ? 2 : 1}px solid ${selected ? brand.teal : BORDER}`, background: selected ? brand.teal : "transparent", color: selected ? brand.inkOn : TEXT, fontWeight: 800, fontSize: 12 }}>{rating}</button>;
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: TEXT_MUTED, fontSize: 10, marginTop: 6 }}><span>{metric.rating_low_label || "Low"}</span><span>{metric.rating_high_label || "High"}</span></div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: unit ? "minmax(0,1fr) auto auto" : "minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
          <input type="number" inputMode="decimal" step={metric.value_type === "count" ? "1" : "any"} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveNumeric(); }} placeholder="0" style={{ ...inputStyle, minWidth: 0 }} />
          {unit && <span style={{ color: TEXT_MUTED, fontSize: 11 }}>{unit}</span>}
          <button type="button" disabled={saving} onClick={saveNumeric} style={{ border: "none", borderRadius: 8, background: brand.teal, color: brand.inkOn, padding: "9px 11px", fontSize: 11, fontWeight: 800 }}>{saving ? "Saving…" : entry ? "Update" : "Save"}</button>
        </div>
      )}

      {localError && <div style={{ color: "#A64B43", fontSize: 10, marginTop: 7 }}>{localError}</div>}
      {entry && onDelete && <button type="button" disabled={saving} onClick={() => onDelete(metric.id)} style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: "8px 0 0", fontSize: 10, fontWeight: 700 }}>Clear this day</button>}
    </div>
  );
}
