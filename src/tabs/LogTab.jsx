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
  const fastingVisible = trackerEnabled("fasting") || Boolean(activeFast);

  return (
    <>
      <LogTabBase {...props} />
      <CustomTrackersLogSection
        activeCanEdit={props.activeCanEdit}
        today={props.today}
        initialDate={initialDate}
        styles={props.styles}
      />
      {props.activeCanEdit && (
        <FastingTodaySection
          activeFast={activeFast}
          visible={fastingVisible}
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
