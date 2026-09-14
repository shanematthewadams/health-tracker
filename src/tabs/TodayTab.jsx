import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import TodayTabBase from "./TodayTabBase.jsx";
import CustomTodayLoggedSection from "../components/CustomTodayLoggedSection.jsx";
import SharedActiveFastCard from "../components/SharedActiveFastCard.jsx";

function shiftDate(dateStr, delta) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function replaceDateEntry(list, date, nextEntry) {
  const next = (list || []).filter((entry) => entry.date !== date);
  next.push(nextEntry);
  next.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return next;
}

function appendUnique(list, nextEntry) {
  const current = list || [];
  if (current.some((entry) => entry.id === nextEntry.id)) return current;
  return [...current, nextEntry].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function applyQuickAddRow(data, activeUser, detail) {
  const bucket = data?.[activeUser];
  const row = detail?.row;
  const kind = detail?.kind;
  if (!bucket || !row || !kind) return false;

  if (kind === "weight") {
    bucket.weights = replaceDateEntry(bucket.weights, row.entry_date, {
      id: row.id,
      date: row.entry_date,
      weight: Number(row.weight),
    });
    return true;
  }

  if (kind === "steps") {
    bucket.steps = replaceDateEntry(bucket.steps, row.entry_date, {
      id: row.id,
      date: row.entry_date,
      count: Number(row.step_count),
    });
    return true;
  }

  if (kind === "water") {
    bucket.water = appendUnique(bucket.water, {
      id: row.id,
      date: row.entry_date,
      ounces: Number(row.ounces),
    });
    return true;
  }

  if (kind === "activity") {
    bucket.activities = appendUnique(bucket.activities, {
      id: row.id,
      date: row.entry_date,
      name: row.name,
      caloriesBurned: Number(row.calories_burned),
    });
    return true;
  }

  return false;
}

export default function TodayTab(props) {
  const [, setRevision] = useState(0);
  const [selectedDate, setSelectedDate] = useState(props.today);
  const [todayResetKey, setTodayResetKey] = useState(0);
  const [sharedFastTarget, setSharedFastTarget] = useState(null);
  const baseWrapRef = useRef(null);
  const activeFast = props.activeFasts?.[props.activeUser] || null;

  useEffect(() => {
    function handleStandardQuickAdd(event) {
      if (applyQuickAddRow(props.data, props.activeUser, event.detail)) {
        setRevision((value) => value + 1);
      }
    }

    window.addEventListener("with-standard-quick-add-saved", handleStandardQuickAdd);
    return () => window.removeEventListener("with-standard-quick-add-saved", handleStandardQuickAdd);
  }, [props.data, props.activeUser]);

  useEffect(() => {
    function handleFastGoalUpdated(event) {
      const fast = props.activeFasts?.[props.activeUser];
      if (!fast || fast.id !== event.detail?.id) return;
      fast.goal_minutes = event.detail.goalMinutes;
      setRevision((value) => value + 1);
    }

    window.addEventListener("with-fast-goal-updated", handleFastGoalUpdated);
    return () => window.removeEventListener("with-fast-goal-updated", handleFastGoalUpdated);
  }, [props.activeFasts, props.activeUser]);

  useEffect(() => {
    function handleTodayDate(event) {
      if (event.detail?.selectedDate) setSelectedDate(event.detail.selectedDate);
    }
    window.addEventListener("with-today-date-changed", handleTodayDate);
    return () => window.removeEventListener("with-today-date-changed", handleTodayDate);
  }, []);

  useEffect(() => {
    function handleTodayNavRetap(event) {
      const button = event.target?.closest?.("button");
      if (!button || button.textContent?.trim() !== "Today") return;
      setSelectedDate(props.today);
      setTodayResetKey((value) => value + 1);
    }

    document.addEventListener("click", handleTodayNavRetap);
    return () => document.removeEventListener("click", handleTodayNavRetap);
  }, [props.today]);

  useEffect(() => { setSelectedDate(props.today); }, [props.activeUser, props.today]);

  useEffect(() => {
    setSharedFastTarget(null);
    const wrapper = baseWrapRef.current;
    wrapper?.querySelector("[data-with-shared-fast-anchor]")?.remove();
    if (props.activeCanEdit || !activeFast) return undefined;

    const todayRoot = wrapper?.firstElementChild;
    const todayHeader = todayRoot?.firstElementChild;
    if (!todayRoot || !todayHeader) return undefined;

    const anchor = document.createElement("div");
    anchor.dataset.withSharedFastAnchor = "true";
    todayHeader.insertAdjacentElement("afterend", anchor);
    setSharedFastTarget(anchor);

    return () => {
      setSharedFastTarget(null);
      anchor.remove();
    };
  }, [props.activeCanEdit, props.activeUser, activeFast?.id, todayResetKey]);

  function captureDateNavigation(event) {
    const button = event.target?.closest?.("button[aria-label]");
    if (!button) return;
    const label = button.getAttribute("aria-label");
    if (label === "Previous day") setSelectedDate((date) => shiftDate(date, -1));
    if (label === "Next day") setSelectedDate((date) => shiftDate(date, 1));
  }

  return (
    <>
      <div ref={baseWrapRef} onClickCapture={captureDateNavigation}>
        <TodayTabBase key={todayResetKey} {...props} />
      </div>
      {sharedFastTarget && activeFast && !props.activeCanEdit && selectedDate === props.today
        ? createPortal(
            <SharedActiveFastCard
              activeFast={activeFast}
              personName={props.profileNameForProfile?.(props.activeUser) || props.activeUser}
              timeZone={props.timeZone}
              styles={props.styles}
            />,
            sharedFastTarget,
          )
        : null}
      <CustomTodayLoggedSection
        activeUser={props.activeUser}
        activeCanEdit={props.activeCanEdit}
        profileNameForProfile={props.profileNameForProfile}
        selectedDate={selectedDate}
        styles={props.styles}
      />
    </>
  );
}
