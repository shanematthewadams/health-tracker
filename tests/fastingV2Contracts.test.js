import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260913233500_add_fasting_v2_fields.sql", "utf8");
const history = readFileSync("src/components/FastingHistorySection.jsx", "utf8");
const logTab = readFileSync("src/tabs/LogTab.jsx", "utf8");
const fastingToday = readFileSync("src/components/FastingTodaySection.jsx", "utf8");
const fastingTrends = readFileSync("src/components/FastingTrendsSection.jsx", "utf8");
const trendsTab = readFileSync("src/tabs/TrendsTab.jsx", "utf8");

test("fasting V2 stores optional goals and derived completion summaries", () => {
  assert.match(migration, /goal_minutes integer/i);
  assert.match(migration, /duration_minutes integer/i);
  assert.match(migration, /goal_reached boolean/i);
  assert.match(migration, /sync_fasting_summary_fields/i);
  assert.match(migration, /extract\(epoch from \(new\.ended_at - new\.started_at\)\)/i);
  assert.match(migration, /new\.duration_minutes >= new\.goal_minutes/i);
});

test("legacy completed fasts are backfilled without inventing goals", () => {
  assert.match(migration, /update public\.fasting_entries[\s\S]*set started_at = started_at/i);
  assert.match(migration, /when new\.goal_minutes is null then null/i);
});

test("completed fasting history can be edited and recalculated", () => {
  assert.match(history, /Fasting history/i);
  assert.match(history, /\.not\("ended_at", "is", null\)/i);
  assert.match(history, /goal_minutes,duration_minutes,goal_reached/i);
  assert.match(history, /\.update\(\{[\s\S]*started_at:[\s\S]*ended_at:[\s\S]*goal_minutes:/i);
  assert.match(history, /ended before goal/i);
  assert.match(history, /Completed fasts are information, not a scorecard/i);
  assert.match(logTab, /<FastingHistorySection/i);
});

test("fasting history honors the personal fasting tracker toggle", () => {
  assert.match(history, /useOwnTrackerPreferences\(activeCanEdit\)/i);
  assert.match(history, /!trackerEnabled\("fasting"\)/i);
});

test("dismissing the fasting prompt keeps a persistent start action under Quick Add", () => {
  assert.match(fastingToday, /if \(!activeFast && promptDismissed\)/i);
  assert.match(fastingToday, /document\.getElementById\("today-quick-add"\)/i);
  assert.match(fastingToday, /createPortal\(/i);
  assert.match(fastingToday, /Start a fast/i);
  assert.match(fastingToday, /onClick=\{\(\) => openEditor\(\)\}/i);
  assert.match(fastingToday, /activeFast \? \([\s\S]*CurrentFastCard/i);
});

test("fasting trends summarize only completed intentional fasts", () => {
  assert.match(fastingTrends, /\.not\("ended_at", "is", null\)/i);
  assert.match(fastingTrends, /duration_minutes/i);
  assert.match(fastingTrends, /Average duration/i);
  assert.match(fastingTrends, /Total fasted/i);
  assert.match(fastingTrends, /Days with a fast/i);
  assert.match(fastingTrends, /Average goal:/i);
  assert.match(fastingTrends, /Only completed intentional fasts are plotted/i);
  assert.match(fastingTrends, /Days without a recorded fast are not treated as fasting days/i);
  assert.doesNotMatch(fastingTrends, /median of completed fasts|Typical duration/i);
});

test("fasting trends switch between duration and calendar without adding streak mechanics", () => {
  assert.match(fastingTrends, /const \[view, setView\] = useState\("duration"\)/i);
  assert.match(fastingTrends, /setView\("duration"\)[\s\S]*Duration/i);
  assert.match(fastingTrends, /setView\("calendar"\)[\s\S]*Calendar/i);
  assert.match(fastingTrends, /view === "duration"/i);
  assert.match(fastingTrends, /calendarCells\(monthKey\)/i);
  assert.match(fastingTrends, /date: localDateKey\(entry\.ended_at\)/i);
  assert.match(fastingTrends, /Overnight fasts appear once, on the day they ended/i);
  assert.match(fastingTrends, /ReferenceLine y=\{averageGoalHours\}/i);
  assert.doesNotMatch(fastingTrends, /streak/i);
});

test("fasting calendar exposes duration by hover or tap without crowding the day cell", () => {
  assert.match(fastingTrends, /selectedCalendarDate/i);
  assert.match(fastingTrends, /selectedCalendarFast/i);
  assert.match(fastingTrends, /title=\{detailLabel\}/i);
  assert.match(fastingTrends, /aria-pressed=\{hasFast \? isSelected : undefined\}/i);
  assert.match(fastingTrends, /setSelectedCalendarDate\(\(current\) => current === date \? null : date\)/i);
  assert.match(fastingTrends, /Tap a marked day to see its duration; on desktop, hover works too/i);
  assert.match(fastingTrends, /selectedCalendarFast\.minutes/i);
});

test("individual Trends includes the fasting section", () => {
  assert.match(trendsTab, /import FastingTrendsSection/i);
  assert.match(trendsTab, /<FastingTrendsSection profileId=\{profileKey\} today=\{today\} range=\{range\}/i);
});
