import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260915203542_add_weekly_reflection_state.sql", "utf8");
const reflection = readFileSync("src/components/WeeklyReflectionCard.jsx", "utf8");
const ownReflection = readFileSync("src/components/OwnWeeklyReflectionCard.jsx", "utf8");
const today = readFileSync("src/tabs/TodayTab.jsx", "utf8");

test("weekly reflection remembers the dismissed completed week on the profile", () => {
  assert.match(migration, /add column if not exists weekly_reflection_seen_week date/i);
  assert.match(reflection, /weekly_reflection_seen_week/i);
  assert.match(reflection, /\.update\(\{ weekly_reflection_seen_week: reflection\.weekStart \}\)/i);
});

test("weekly reflection is an inline Today card for the signed-in profile owner, not a new route", () => {
  assert.match(today, /<OwnWeeklyReflectionCard/i);
  assert.match(today, /props\.activeCanEdit && \([\s\S]*<OwnWeeklyReflectionCard/i);
  assert.match(today, /relationshipTarget && selectedDate === props\.today/i);
  assert.match(ownReflection, /supabase\.auth\.getSession\(\)/i);
  assert.match(ownReflection, /\.from\("profiles"\)[\s\S]*\.eq\("user_id", session\.user\.id\)/i);
  assert.match(ownReflection, /<WeeklyReflectionCard \{\.\.\.props\} profileId=\{profileId\}/i);
  assert.doesNotMatch(today, /profileId=\{props\.activeUser\}/i);
  assert.doesNotMatch(today, /weekly-reflection-route|navigate\([^)]*reflection|route[^\n]*reflection/i);
});

test("weekly reflection uses the previous completed Monday through Sunday", () => {
  assert.match(reflection, /function previousCompletedWeek\(today\)/i);
  assert.match(reflection, /daysSinceMonday = \(date\.getUTCDay\(\) \+ 6\) % 7/i);
  assert.match(reflection, /const start = shiftDate\(currentMonday, -7\)/i);
  assert.match(reflection, /end: shiftDate\(start, 6\)/i);
});

test("weekly reflection waits until the person has a full week and enough real check-ins", () => {
  assert.match(reflection, /profileStart && profileStart > week\.start/i);
  assert.match(reflection, /loggedDates\.size < 2/i);
  assert.match(reflection, /Missing logs stay missing/i);
  assert.match(reflection, /without filling in the blanks/i);
});

test("weekly reflection reads personal trackers plus relational support without inventing zeros", () => {
  for (const table of ["weight_entries", "step_entries", "water_entries", "activity_entries", "food_entries", "fasting_entries", "custom_metrics", "custom_metric_entries", "support_notes"]) {
    assert.match(reflection, new RegExp(`from\\(\\"${table}\\"\\)`, "i"));
  }
  assert.match(reflection, /Missing or incomplete entries stay missing rather than becoming zero/i);
  assert.match(reflection, /details: details\.slice\(0, 4\)/i);
});

test("weekly reflection is descriptive rather than competitive or prescriptive", () => {
  assert.match(reflection, /A week is a snapshot, not a grade/i);
  assert.match(reflection, /not a recommendation about what you should do/i);
  assert.doesNotMatch(reflection, /leaderboard|ranking|points|win streak|failure|failed target/i);
});

test("weekly reflection contains no Shane-specific implementation", () => {
  assert.doesNotMatch(reflection, /shane@|98f6347d|Shane/i);
  assert.doesNotMatch(ownReflection, /shane@|98f6347d|Shane/i);
  assert.doesNotMatch(today, /shane@|98f6347d/i);
});
