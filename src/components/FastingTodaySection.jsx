import { brand, metricColors } from "../brand.jsx";
import CurrentFastCard from "./CurrentFastCard.jsx";

export default function FastingTodaySection({
  activeFast,
  visible,
  promptDismissed,
  editorOpen,
  fastBusy,
  startDate,
  startTime,
  setStartDate,
  setStartTime,
  setEditorOpen,
  dismissPrompt,
  openEditor,
  startFast,
  updateFastStart,
  endFast,
  today,
  timeZone,
  styles,
}) {
  if (!visible) return null;

  const { SURFACE_2, BORDER, TEXT, TEXT_MUTED, inputStyle, bigButton } = styles;
  const orange = metricColors.steps;

  return (
    <>
      {activeFast ? (
        <CurrentFastCard
          activeFast={activeFast}
          fastBusy={fastBusy}
          openFastEditor={openEditor}
          endFast={endFast}
          timeZone={timeZone}
          styles={styles}
        />
      ) : !promptDismissed ? (
        <section style={{ marginBottom: 28, paddingBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".11em", fontWeight: 800, color: TEXT_MUTED }}>A note for today</div>
              <div style={{ height: 3, width: 46, background: orange, marginTop: 7 }} />
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 19, fontWeight: 600, color: TEXT, marginTop: 10 }}>Fasting today?</div>
              <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>With can adjust your Today prompts while you fast.</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={dismissPrompt} disabled={fastBusy} style={{ background: "transparent", color: TEXT_MUTED, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "9px 10px", fontSize: 12, fontWeight: 700 }}>Not today</button>
              <button onClick={() => openEditor()} disabled={fastBusy} style={{ background: brand.surface, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "9px 12px", fontSize: 12, fontWeight: 700 }}>Start fast</button>
            </div>
          </div>
        </section>
      ) : null}

      {editorOpen && (
        <div style={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "1rem", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 19, fontWeight: 600, marginBottom: 4 }}>{activeFast ? "Edit fast start" : "When did your fast start?"}</div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 14 }}>It defaults to right now. Backdating is completely fine.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".055em" }}>Date</div><input type="date" max={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} style={{ ...inputStyle, width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", padding: "10px 9px", fontSize: 15 }} /></div>
            <div><div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".055em" }}>Time</div><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} style={inputStyle} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => setEditorOpen(false)} disabled={fastBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, borderRadius: 7 }}>Cancel</button>
            <button onClick={activeFast ? updateFastStart : startFast} disabled={fastBusy} style={{ ...bigButton(brand.teal, brand.inkOn), borderRadius: 7 }}>{fastBusy ? "Saving…" : activeFast ? "Save start" : "Start fast"}</button>
          </div>
        </div>
      )}
    </>
  );
}
