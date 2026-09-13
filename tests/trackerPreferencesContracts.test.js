import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const standardMigration = readFileSync("supabase/migrations/20260913030615_add_profile_metric_preferences.sql", "utf8");
const customMigration = readFileSync("supabase/migrations/20260913030836_add_custom_trackers.sql", "utf8");
const trackerPanel = readFileSync("src/components/MyTrackersPanel.jsx", "utf8");
const todayTab = readFileSync("src/tabs/TodayTab.jsx", "utf8");
const logTab = readFileSync("src/tabs/LogTabCore.jsx", "utf8");

const standardTrackers = ["weight", "food", "activity", "water", "steps", "fasting"];

test("standard tracker preferences default to enabled and shared", () => {
  assert.match(standardMigration, /enabled boolean not null default true/i);
  assert.match(standardMigration, /visibility text not null default 'all_withs'/i);
  for (const tracker of standardTrackers) {
    assert.match(standardMigration, new RegExp(`'${tracker}'::text|\\('${tracker}'`, "i"));
  }
});

test("metric visibility is enforced through the relationship-aware RLS helper", () => {
  assert.match(standardMigration, /create or replace function private\.can_view_profile_metric/i);
  assert.match(standardMigration, /pref\.visibility = 'selected_withs'/i);
  assert.match(standardMigration, /profile_metric_withs/i);
  assert.match(standardMigration, /coalesce\(pref\.visibility, 'all_withs'\) <> 'private'/i);
});

test("custom trackers support all four V2 value types and person ownership", () => {
  for (const valueType of ["yes_no", "count", "duration", "quantity"]) {
    assert.match(customMigration, new RegExp(`'${valueType}'`, "i"));
  }
  assert.match(customMigration, /profile_id uuid not null references public\.profiles\(id\) on delete cascade/i);
  assert.match(customMigration, /unique \(metric_id, entry_date\)/i);
  assert.match(customMigration, /private\.can_view_custom_metric/i);
});

test("disabling a tracker is UI state, not health-history deletion", () => {
  assert.match(trackerPanel, /enabled: next\.enabled/i);
  assert.doesNotMatch(trackerPanel, /from\("(?:weight_entries|food_entries|activity_entries|water_entries|step_entries|fasting_entries|custom_metric_entries)"\)\.delete/i);
  assert.match(trackerPanel, /Your history stays right where it is\./i);
});

test("Today and Log honor the owner's enabled tracker choices", () => {
  assert.match(todayTab, /useOwnTrackerPreferences\(isMine\)/);
  assert.match(todayTab, /\.filter\(\(\[, kind\]\) => trackerEnabled\(kind\)\)/);
  assert.match(todayTab, /trackerEnabled\("food"\)/);
  assert.match(logTab, /useOwnTrackerPreferences\(activeCanEdit\)/);
  assert.match(logTab, /LOG_TABS\.filter\(\(\[id\]\) => trackerEnabled\(id\)\)/);
  assert.match(logTab, /You’ve turned off all of the standard logging trackers/i);
});

test("an active fast remains manageable even when fasting is disabled", () => {
  assert.match(todayTab, /trackerEnabled\("fasting"\) \|\| Boolean\(activeFasts\[activeUser\]\)/);
  assert.match(logTab, /trackerEnabled\("fasting"\) \|\| Boolean\(activeFasts\[activeUser\]\)/);
});
