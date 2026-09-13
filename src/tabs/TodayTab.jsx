import { useEffect, useState } from "react";
import TodayTabBase from "./TodayTabBase.jsx";

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

  useEffect(() => {
    function handleStandardQuickAdd(event) {
      if (applyQuickAddRow(props.data, props.activeUser, event.detail)) {
        setRevision((value) => value + 1);
      }
    }

    window.addEventListener("with-standard-quick-add-saved", handleStandardQuickAdd);
    return () => window.removeEventListener("with-standard-quick-add-saved", handleStandardQuickAdd);
  }, [props.data, props.activeUser]);

  return <TodayTabBase {...props} />;
}
