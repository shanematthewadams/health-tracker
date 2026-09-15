import LogTabBase from "./LogTabBase.jsx";
import CustomTrackersLogSection from "../components/CustomTrackersLogSection.jsx";
import FastingHistorySection from "../components/FastingHistorySection.jsx";
import FastingTodaySection from "../components/FastingTodaySection.jsx";
import { useOwnTrackerPreferences } from "../useOwnTrackerPreferences.js";

export default function LogTab(props) {
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

  const baseProps = {
    ...props,
    // Fasting now has one intentional Log entry below. Suppress the older
    // Food-tab fasting prompt/editor so the same action does not appear twice.
    activeFasts: {},
    fastPromptDismissedToday: true,
    fastEditorOpen: false,
  };

  return (
    <>
      <LogTabBase {...baseProps} />
      <CustomTrackersLogSection
        activeCanEdit={props.activeCanEdit}
        today={props.today}
        initialDate={initialDate}
        styles={props.styles}
      />
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
  );
}
