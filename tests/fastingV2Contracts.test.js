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

test("dismissing the fasting prompt keeps a persistent start action", () => {
  assert.match(fastingToday, /!promptDismissed \? \(/i);
  assert.match(fastingToday, /Start a fast/i);
  assert.match(fastingToday, /onClick=\{\(\) => openEditor\(\)\}/i);
  assert.match(fastingToday, /activeFast \? \([\s\S]*CurrentFastCard/i);
});

test("fasting trends use only completed fasts and never turn blank days into zero", () => {
  assert.match(fastingTrends, /\.not\("ended_at", "is", null\)/i);
  assert.match(fastingTrends, /duration_minutes/i);
  assert.match(fastingTrends, /Typical duration/i);
  assert.match(fastingTrends, /median of completed fasts/i);
  assert.match(fastingTrends, /Days without a fast are left blank rather than counted as zero/i);
  assert.match(fastingTrends, /goal_minutes/i);
  assert.match(fastingTrends, /goal_reached/i);
});

test("individual Trends includes the fasting section", () => {
  assert.match(trendsTab, /import FastingTrendsSection/i);
  assert.match(trendsTab, /<FastingTrendsSection profileId=\{profileKey\} today=\{today\} range=\{range\}/i);
});
