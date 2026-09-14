import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";
import CurrentFastCard from "./CurrentFastCard.jsx";

export default function FastingTodaySection({
  activeFast,
  visible,
  editorOpen,
  fastBusy,
  startDate,
  startTime,
  setStartDate,
  setStartTime,
  setEditorOpen,
  openEditor,
  startFast,
  updateFastStart,
  endFast,
  today,
  timeZone,
  styles,
  showStartAction = false,
}) {
  const { SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, inputStyle, bigButton } = styles;
  const [startGoalHours, setStartGoalHours] = useState("");
  const [pendingGoalMinutes, setPendingGoalMinutes] = useState(undefined);
  const [goalError, setGoalError] = useState("");

  useEffect(() => {
    if (!editorOpen || activeFast) return;
    setGoalError("");
  }, [editorOpen, activeFast]);

  useEffect(() => {
    function handleStartRequest() {
      if (!visible) return;
      openEditor();
    }
    window.addEventListener("with-start-fast-requested", handleStartRequest);
    return () => window.removeEventListener("with-start-fast-requested", handleStartRequest);
  }, [visible, openEditor]);

  useEffect(() => {
    if (!activeFast?.id || pendingGoalMinutes === undefined) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("fasting_entries")
        .update({ goal_minutes: pendingGoalMinutes })
        .eq("id", activeFast.id)
        .select("id,goal_minutes")
        .single();

      if (cancelled) return;
      if (error) {
        setGoalError("Your fast started, but we couldn’t save the time goal. You can add it from the Current Fast card.");
      } else {
        const savedGoal = data?.goal_minutes == null ? null : Number(data.goal_minutes);
        window.dispatchEvent(new CustomEvent("with-fast-goal-updated", { detail: { id: activeFast.id, goalMinutes: savedGoal } }));
      }
      setPendingGoalMinutes(undefined);
      setStartGoalHours("");
    })();

    return () => { cancelled = true; };
  }, [activeFast?.id, pendingGoalMinutes]);

  if (!visible) return null;

  async function startFastWithOptionalGoal() {
    let nextGoal = null;
    if (startGoalHours !== "") {
      const hours = Number(startGoalHours);
      if (!Number.isFinite(hours) || hours <= 0) {
        setGoalError("Leave the goal blank or enter a number greater than 0.");
        return;
      }
      nextGoal = Math.round(hours * 60);
    }

    setGoalError("");
    setPendingGoalMinutes(nextGoal);
    await startFast();
  }

  function cancelEditor() {
    setPendingGoalMinutes(undefined);
    setStartGoalHours("");
    setGoalError("");
    setEditorOpen(false);
  }

  const editorPanel = editorOpen ? (
    <div style={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "1rem", marginBottom: 20 }}>
      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 19, fontWeight: 600, marginBottom: 4 }}>{activeFast ? "Edit fast start" : "When did your fast start?"}</div>
      <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 14 }}>It defaults to right now. Backdating is completely fine.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div><div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".055em" }}>Date</div><input type="date" max={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} style={{ ...inputStyle, width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", padding: "10px 9px", fontSize: 15 }} /></div>
        <div><div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".055em" }}>Time</div><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} style={inputStyle} /></div>
      </div>

      {!activeFast && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".055em" }}>Time goal (optional)</div>
          <input type="number" min="0.25" step="0.25" inputMode="decimal" value={startGoalHours} onChange={(event) => setStartGoalHours(event.target.value)} placeholder="e.g. 16" style={inputStyle} />
          <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.4, marginTop: 5 }}>Leave this blank if you just want to track the fast without aiming for a duration.</div>
        </div>
      )}

      {goalError && <div style={{ color: WARN, fontSize: 11, marginBottom: 9 }}>{goalError}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button onClick={cancelEditor} disabled={fastBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, borderRadius: 7 }}>Cancel</button>
        <button onClick={activeFast ? updateFastStart : startFastWithOptionalGoal} disabled={fastBusy} style={{ ...bigButton(brand.teal, brand.inkOn), borderRadius: 7 }}>{fastBusy ? "Saving…" : activeFast ? "Save start" : "Start fast"}</button>
      </div>
    </div>
  ) : null;

  if (activeFast) {
    return (
      <>
        <CurrentFastCard
          activeFast={activeFast}
          fastBusy={fastBusy}
          openFastEditor={openEditor}
          endFast={endFast}
          timeZone={timeZone}
          styles={styles}
        />
        {editorPanel}
      </>
    );
  }

  if (showStartAction) {
    return (
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: TEXT, fontSize: 13, fontWeight: 800 }}><Timer size={15} strokeWidth={1.9} /> Fasting</div>
            <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.4, marginTop: 3 }}>Start one here whenever you want to track it.</div>
          </div>
          <button type="button" onClick={openEditor} disabled={fastBusy} style={{ background: "transparent", color: brand.tealDark, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>Start fast</button>
        </div>
        {editorPanel && <div style={{ marginTop: 10 }}>{editorPanel}</div>}
      </section>
    );
  }

  return editorPanel;
}
