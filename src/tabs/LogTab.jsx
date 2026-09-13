import LogTabBase from "./LogTabBase.jsx";
import CustomTrackersLogSection from "../components/CustomTrackersLogSection.jsx";
import FastingHistorySection from "../components/FastingHistorySection.jsx";

export default function LogTab(props) {
  const initialDate = {
    food: props.foodDate,
    weight: props.weightDate,
    activity: props.actDate,
    water: props.waterDate,
    steps: props.stepsDate,
  }[props.logTab] || props.today;

  return (
    <>
      <LogTabBase {...props} />
      <CustomTrackersLogSection
        activeCanEdit={props.activeCanEdit}
        today={props.today}
        initialDate={initialDate}
        styles={props.styles}
      />
      <FastingHistorySection
        activeCanEdit={props.activeCanEdit}
        styles={props.styles}
      />
    </>
  );
}
