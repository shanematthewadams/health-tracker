import { useState } from "react";
import LogTabBase from "./LogTabBase.jsx";
import CustomTrackersLogSection from "../components/CustomTrackersLogSection.jsx";
import FastingHistorySection from "../components/FastingHistorySection.jsx";
import FastingTodaySection from "../components/FastingTodaySection.jsx";
import { brand } from "../brand.jsx";
import { useOwnTrackerPreferences } from "../useOwnTrackerPreferences.js";

export default function LogTab(props) {
  const [logMode, setLogMode] = useState("basics");
  const initialDate = {
    food: props.foodDate,
    weight: props.weightDate,
    activity: props.actDate,
    water: props.waterDate,
    steps: props.stepsDate,
  }[props.logTab] || props.today;
  const { trackerEnabled } = useOwnTrackerPreferences(props.activeCanEdit);
  const activeFast = props.activeFasts?.[props.activeUser] || null;
  const fastingEnabled = trackerEnabled("fasting");
  const { BORDER, TEXT, TEXT_MUTED, SURFACE, SURFACE_2 } = props.styles;

  const baseProps = {
    ...props,
    // Fasting now has one intentional Log entry below. Suppress the older
    // Food-tab fasting prompt/editor so the same action does not appear twice.
    activeFasts: {},
    fastPromptDismissedToday: true,
    fastEditorOpen: false,
  };

  const modeButton = (active) => ({
    flex: 1,
    border: `1px solid ${active ? brand.teal : BORDER}`,
    background: active ? brand.surfaceSoft : SURFACE,
    color: active ? TEXT : TEXT_MUTED,
    borderRadius: 999,
    minHeight: 38,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
  });

  return (
    <>
      <style>{`.with-log-standard-shell > div:first-child { display: none; }`}</style>

      <div style={{ padding: "0.2rem 0.1rem 0.85rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>Log</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Add something to your day.</div>
      </div>

      {props.activeCanEdit && (
        <div role="tablist" aria-label="Log sections" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "0 0 10px", marginBottom: 2 }}>
          <button type="button" role="tab" aria-selected={logMode === "basics"} onClick={() => setLogMode("basics")} style={modeButton(logMode === "basics")}>Basics</button>
          <button type="button" role="tab" aria-selected={logMode === "custom"} onClick={() => setLogMode("custom")} style={modeButton(logMode === "custom")}>My Trackers</button>
        </div>
      )}

      {logMode === "custom" && props.activeCanEdit ? (
        <CustomTrackersLogSection
          activeCanEdit={props.activeCanEdit}
          today={props.today}
          initialDate={initialDate}
          styles={props.styles}
          standalone
          showEmptyState
        />
      ) : (
        <>
          <div className="with-log-standard-shell">
            <LogTabBase {...baseProps} />
          </div>
          {props.activeCanEdit && fastingEnabled && !activeFast && (
            <FastingTodaySection
              activeFast={null}
              visible
              editorOpen={props.fastEditorOpen}
              fastBusy={props.fastBusy}
              startDate={props.fastStartDate}
              startTime={props.fastStartTime}
              setStartDate={props.setFastStartDate}
              setStartTime={props.setFastStartTime}
              setEditorOpen={props.setFastEditorOpen}
              openEditor={props.openFastEditor}
              startFast={props.startFast}
              updateFastStart={props.updateFastStart}
              endFast={props.endFast}
              today={props.today}
              timeZone={props.timeZone}
              styles={props.styles}
              showStartAction
            />
          )}
          <FastingHistorySection
            activeCanEdit={props.activeCanEdit}
            styles={props.styles}
          />
        </>
      )}
    </>
  );
}
