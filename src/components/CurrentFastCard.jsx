import { useEffect, useMemo, useState } from "react";
import { Pencil, Timer } from "lucide-react";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";

function durationLabel(totalMinutes) {
  const total = Math.max(0, Math.floor(Number(totalMinutes) || 0));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function startLabel(startedAt, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startedAt));
}

export default function CurrentFastCard({ activeFast, fastBusy, openFastEditor, endFast, timeZone, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, SURFACE, SURFACE_2, WARN, inputStyle, bigButton } = styles;
  const [now, setNow] = useState(Date.now());
  const [goalMinutes, setGoalMinutes] = useState(activeFast?.goal_minutes == null ? null : Number(activeFast.goal_minutes));
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalHours, setGoalHours] = useState(activeFast?.goal_minutes ? String(Number(activeFast.goal_minutes) / 60) : "");
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalError, setGoalError] = useState("");

  useEffect(() => {
    if (!activeFast?.id) return undefined;
    setNow(Date.now());
    setGoalMinutes(activeFast.goal_minutes == null ? null : Number(activeFast.goal_minutes));
    setGoalHours(activeFast.goal_minutes ? String(Number(activeFast.goal_minutes) / 60) : "");
    setEditingGoal(false);
    setGoalError("");
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [activeFast?.id, activeFast?.goal_minutes]);

  const elapsedMinutes = useMemo(() => {
    if (!activeFast?.started_at) return 0;
    return Math.max(0, Math.floor((now - new Date(activeFast.started_at).getTime()) / 60000));
  }, [activeFast?.started_at, now]);

  if (!activeFast) return null;

  const hasGoal = Number.isFinite(goalMinutes) && goalMinutes > 0;
  const progress = hasGoal ? Math.min(100, elapsedMinutes / goalMinutes * 100) : 0;
  const remaining = hasGoal ? goalMinutes - elapsedMinutes : null;
  const goalStatus = !hasGoal
    ? "No time goal set"
    : remaining > 0
      ? `${durationLabel(remaining)} remaining to your ${durationLabel(goalMinutes)} goal`
      : remaining === 0
        ? `${durationLabel(goalMinutes)} goal reached`
        : `${durationLabel(goalMinutes)} goal reached · ${durationLabel(Math.abs(remaining))} beyond it`;

  async function saveGoal() {
    let nextGoal = null;
    if (goalHours !== "") {
      const hours = Number(goalHours);
      if (!Number.isFinite(hours) || hours <= 0) {
        setGoalError("Leave the goal blank or enter a number greater than 0.");
        return;
      }
      nextGoal = Math.round(hours * 60);
    }

    setGoalBusy(true);
    setGoalError("");
    const { data, error } = await supabase
      .from("fasting_entries")
      .update({ goal_minutes: nextGoal })
      .eq("id", activeFast.id)
      .select("id,goal_minutes")
      .single();

    if (error) {
      setGoalError("We couldn’t save that fasting goal. Try again.");
    } else {
      const savedGoal = data?.goal_minutes == null ? null : Number(data.goal_minutes);
      setGoalMinutes(savedGoal);
      setGoalHours(savedGoal ? String(savedGoal / 60) : "");
      setEditingGoal(false);
      window.dispatchEvent(new CustomEvent("with-fast-goal-updated", { detail: { id: activeFast.id, goalMinutes: savedGoal } }));
    }
    setGoalBusy(false);
  }

  return (
    <section style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "1rem 1.05rem", marginBottom: 22, boxShadow: "0 3px 12px rgba(28,36,48,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Timer size={15} color={brand.teal} strokeWidth={2} />
          <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".11em" }}>Current fast</div>
        </div>
        <button type="button" onClick={() => openFastEditor(activeFast)} disabled={fastBusy} style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: 5, display: "grid", placeItems: "center" }} aria-label="Edit fast start">
          <Pencil size={15} strokeWidth={1.8} />
        </button>
      </div>

      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 34, lineHeight: 1, fontWeight: 600, color: TEXT, marginTop: 15 }}>{durationLabel(elapsedMinutes)}</div>
      <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginTop: 6 }}>Started {startLabel(activeFast.started_at, timeZone)}</div>

      {hasGoal && (
        <div style={{ marginTop: 16 }}>
          <div style={{ height: 6, borderRadius: 999, overflow: "hidden", background: SURFACE_2 }}>
            <div style={{ width: `${progress}%`, height: "100%", background: brand.teal, transition: "width .2s ease" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
        <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.4 }}>{goalStatus}</div>
        {!editingGoal && (
          <button type="button" onClick={() => setEditingGoal(true)} style={{ border: "none", background: "transparent", color: brand.tealDark, padding: 0, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{hasGoal ? "Edit goal" : "Set goal"}</button>
        )}
      </div>

      {editingGoal && (
        <div style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 10, marginTop: 12 }}>
          <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>Time goal in hours</div>
          <input type="number" min="0.25" step="0.25" inputMode="decimal" value={goalHours} onChange={(event) => setGoalHours(event.target.value)} placeholder="No goal" style={inputStyle} />
          <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.4, marginTop: 6 }}>Optional. Leave it blank if you just want to track the fast without aiming for a duration.</div>
          {goalError && <div style={{ color: WARN, fontSize: 11, marginTop: 7 }}>{goalError}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 9 }}>
            <button type="button" disabled={goalBusy} onClick={() => { setEditingGoal(false); setGoalError(""); setGoalHours(goalMinutes ? String(goalMinutes / 60) : ""); }} style={{ ...bigButton(SURFACE, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
            <button type="button" disabled={goalBusy} onClick={saveGoal} style={{ ...bigButton(brand.teal, brand.inkOn), opacity: goalBusy ? 0.65 : 1 }}>{goalBusy ? "Saving…" : "Save goal"}</button>
          </div>
        </div>
      )}

      <button type="button" onClick={endFast} disabled={fastBusy || goalBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, marginTop: 14 }}>{fastBusy ? "Ending…" : "End fast"}</button>
    </section>
  );
}
