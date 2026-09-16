import { useEffect, useState } from "react";
import LogTabBase from "./LogTabBase.jsx";
import CustomTrackersLogSection from "../components/CustomTrackersLogSection.jsx";
import FastingHistorySection from "../components/FastingHistorySection.jsx";
import FastingTodaySection from "../components/FastingTodaySection.jsx";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";
import { savedFoodCorrectionPayload } from "../savedFoodCorrections.js";
import { useOwnTrackerPreferences } from "../useOwnTrackerPreferences.js";

export default function LogTab(props) {
  const [logMode, setLogMode] = useState("basics");
  const [hasCustomTrackers, setHasCustomTrackers] = useState(false);
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
  const { BORDER, TEXT, TEXT_MUTED, SURFACE } = props.styles;

  useEffect(() => {
    let cancelled = false;

    async function checkCustomTrackers() {
      if (!props.activeCanEdit) {
        if (!cancelled) setHasCustomTrackers(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!profile?.id || cancelled) {
        if (!cancelled) setHasCustomTrackers(false);
        return;
      }

      const { data } = await supabase
        .from("custom_metrics")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("enabled", true)
        .limit(1);

      if (!cancelled) setHasCustomTrackers(Boolean(data?.length));
    }

    checkCustomTrackers();
    return () => { cancelled = true; };
  }, [props.activeCanEdit]);

  useEffect(() => {
    if (!hasCustomTrackers && logMode === "custom") setLogMode("basics");
  }, [hasCustomTrackers, logMode]);

  async function addFoodWithSavedCorrection() {
    const correction = savedFoodCorrectionPayload({
      selectedSavedFoodId: props.selectedSavedFoodId,
      quantity: props.foodQuantity,
      savedFoods: props.savedFoods,
      globalFoods: props.globalFoods,
      calories: props.foodCals,
      protein: props.foodProtein,
      carbs: props.foodCarbs,
      fat: props.foodFat,
      fiber: props.foodFiber,
    });

    if (correction) {
      const { error } = await supabase.rpc("with_update_owned_food_nutrition", {
        food_source_input: correction.source,
        food_id_input: correction.id,
        calories_input: correction.values.calories,
        protein_input: correction.values.protein,
        carbs_input: correction.values.carbs,
        fat_input: correction.values.fat,
        fiber_input: correction.values.fiber,
      });

      if (error) {
        console.error("Could not persist corrected food nutrition", error);
        window.alert("We couldn’t save that food correction, so nothing was logged. Try again.");
        return;
      }
      // A false result means this shared food belongs to someone else (or is
      // an external canonical food). The correction is still valid for this
      // person's log; it simply must not rewrite the shared base food.
    }

    await props.addFood?.();
  }

  const baseProps = {
    ...props,
    // Fasting now has one intentional Log entry below. Suppress the older
    // Food-tab fasting prompt/editor so the same action does not appear twice.
    activeFasts: {},
    fastPromptDismissedToday: true,
    fastEditorOpen: false,
    addFood: addFoodWithSavedCorrection,
  };

  const modeButton = (active) => ({
    border: `1px solid ${active ? brand.teal : BORDER}`,
    background: active ? brand.surfaceSoft : SURFACE,
    color: active ? TEXT : TEXT_MUTED,
    borderRadius: 999,
    minHeight: 32,
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
  });

  return (
    <>
      <style>{`.with-log-standard-shell > div:first-child { display: none; }`}</style>

      <div style={{ padding: "0.2rem 0.1rem 0.85rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>Log</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Add something to your day.</div>
      </div>

      {props.activeCanEdit && hasCustomTrackers && (
        <div role="tablist" aria-label="Log sections" style={{ display: "flex", alignItems: "center", gap: 4, width: "fit-content", padding: "0 0 9px", marginBottom: 2 }}>
          <button type="button" role="tab" aria-selected={logMode === "basics"} onClick={() => setLogMode("basics")} style={modeButton(logMode === "basics")}>Basics</button>
          <button type="button" role="tab" aria-selected={logMode === "custom"} onClick={() => setLogMode("custom")} style={modeButton(logMode === "custom")}>My Trackers</button>
        </div>
      )}

      {logMode === "custom" && props.activeCanEdit && hasCustomTrackers ? (
        <CustomTrackersLogSection
          activeCanEdit={props.activeCanEdit}
          today={props.today}
          initialDate={initialDate}
          styles={props.styles}
          standalone
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
