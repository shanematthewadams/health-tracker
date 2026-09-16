import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const standardMigration = readFileSync("supabase/migrations/20260913030615_add_profile_metric_preferences.sql", "utf8");
const customMigration = readFileSync("supabase/migrations/20260913030836_add_custom_trackers.sql", "utf8");
const iconMigration = readFileSync("supabase/migrations/20260913133241_add_custom_metric_icons.sql", "utf8");
const quickAddMigration = readFileSync("supabase/migrations/20260913142607_add_quick_add_preferences_and_rating.sql", "utf8");
const fastingQuickAddMigration = readFileSync("supabase/migrations/20260914224300_allow_fasting_quick_add.sql", "utf8");
const trackerPanel = readFileSync("src/components/MyTrackersPanel.jsx", "utf8");
const quickAddSection = readFileSync("src/components/QuickAddSection.jsx", "utf8");
const quickAddHook = readFileSync("src/useQuickAddPreferences.js", "utf8");
const todayTab = readFileSync("src/tabs/TodayTabBase.jsx", "utf8") + "\n" + readFileSync("src/tabs/TodayTab.jsx", "utf8");
const logTab = readFileSync("src/tabs/LogTabCore.jsx", "utf8") + "\n" + readFileSync("src/tabs/LogTab.jsx", "utf8");
const customLogging = readFileSync("src/useCustomTrackerLogging.js", "utf8");
const customLogger = readFileSync("src/components/CustomTrackerLogger.jsx", "utf8");
const customLogSection = readFileSync("src/components/CustomTrackersLogSection.jsx", "utf8");
const customToday = readFileSync("src/components/CustomTodayLoggedSection.jsx", "utf8");

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

test("custom trackers support the original four value types and person ownership", () => {
  for (const valueType of ["yes_no", "count", "duration", "quantity"]) {
    assert.match(customMigration, new RegExp(`'${valueType}'`, "i"));
  }
  assert.match(customMigration, /profile_id uuid not null references public\.profiles\(id\) on delete cascade/i);
  assert.match(customMigration, /unique \(metric_id, entry_date\)/i);
  assert.match(customMigration, /private\.can_view_custom_metric/i);
});

test("rating trackers use a validated five-point scale with optional endpoint labels", () => {
  assert.match(quickAddMigration, /value_type in \('yes_no','count','duration','quantity','rating'\)/i);
  assert.match(quickAddMigration, /rating_low_label text/i);
  assert.match(quickAddMigration, /rating_high_label text/i);
  assert.match(quickAddMigration, /new\.numeric_value < 1 or new\.numeric_value > 5/i);
  assert.match(quickAddMigration, /new\.numeric_value <> trunc\(new\.numeric_value\)/i);
  assert.match(trackerPanel, /id: "rating", label: "Rating"/i);
  assert.match(trackerPanel, /1 means…/i);
  assert.match(trackerPanel, /5 means…/i);
  assert.match(customLogger, /\[1,2,3,4,5\]/i);
  assert.match(customLogger, /rating_low_label \|\| "Low"/i);
  assert.match(customLogger, /rating_high_label \|\| "High"/i);
});

test("custom trackers use a bounded icon vocabulary", () => {
  assert.match(iconMigration, /icon_key text not null default 'sparkles'/i);
  for (const icon of ["sparkles", "heart", "brain", "book_open", "leaf", "moon", "sun", "smile", "flame", "coffee", "dumbbell", "footprints", "droplet", "timer", "star"]) {
    assert.match(iconMigration, new RegExp(`'${icon}'`, "i"));
  }
  assert.match(trackerPanel, /const CUSTOM_ICONS = \[/);
  assert.match(trackerPanel, /icon_key: customIcon/);
});

test("Quick Add stores at most five owner-controlled shortcuts including optional fasting", () => {
  assert.match(quickAddMigration, /position smallint not null check \(position between 1 and 5\)/i);
  assert.match(fastingQuickAddMigration, /'fasting'::text/i);
  assert.match(quickAddMigration, /custom_metric_id uuid/i);
  assert.match(quickAddMigration, /private\.owns_profile\(profile_id\)/i);
  assert.match(quickAddHook, /DEFAULT_QUICK_ADD_IDS = \["food", "weight", "activity", "water", "steps"\]/i);
  assert.match(quickAddHook, /slice\(0, 5\)/i);
  assert.match(quickAddSection, /Choose up to five shortcuts/i);
  assert.match(quickAddSection, /id: "fasting", label: "Fasting"/i);
  assert.match(quickAddSection, /Choose what you want one tap away on Today/i);
});

test("Today uses the personal Quick Add editor instead of a hard-coded shortcut list", () => {
  assert.match(todayTab, /useQuickAddPreferences\(isMine\)/i);
  assert.match(todayTab, /<QuickAddSection/i);
  assert.match(todayTab, /quickAddIds=\{quickAddIds\}/i);
  assert.doesNotMatch(todayTab, /const quick = \[/i);
});

test("standard Quick Add writes to the date being viewed", () => {
  assert.match(quickAddSection, /openLog\("food", selectedDate\)/i);
  assert.match(quickAddSection, /from\("weight_entries"\)[\s\S]*entry_date: selectedDate[\s\S]*onConflict: "profile_id,entry_date"/i);
  assert.match(quickAddSection, /from\("step_entries"\)[\s\S]*entry_date: selectedDate[\s\S]*onConflict: "profile_id,entry_date"/i);
  assert.match(quickAddSection, /from\("water_entries"\)[\s\S]*entry_date: selectedDate/i);
  assert.match(quickAddSection, /from\("activity_entries"\)[\s\S]*entry_date: selectedDate/i);
  assert.doesNotMatch(quickAddSection, /entry_date:\s*today/i);
});

test("standard Quick Add refreshes Today without changing the selected date", () => {
  assert.match(quickAddSection, /with-standard-quick-add-saved/i);
  assert.match(todayTab, /addEventListener\("with-standard-quick-add-saved"/i);
  assert.match(todayTab, /row\.entry_date/i);
  assert.match(todayTab, /setRevision\(\(value\) => value \+ 1\)/i);
});

test("tapping the active Today tab returns a browsed date to today", () => {
  assert.match(todayTab, /handleTodayNavRetap/i);
  assert.match(todayTab, /button\.textContent\?\.trim\(\) !== "Today"/i);
  assert.match(todayTab, /setSelectedDate\(props\.today\)/i);
  assert.match(todayTab, /setTodayResetKey\(\(value\) => value \+ 1\)/i);
  assert.match(todayTab, /<TodayTabBase key=\{todayResetKey\}/i);
});

test("custom tracker logging uses one value per tracker per date", () => {
  assert.match(customLogging, /entry_date:\s*entryDate/i);
  assert.match(customLogging, /onConflict:\s*"metric_id,entry_date"/i);
  assert.match(customLogSection, /value=\{entryDate\}/i);
  assert.match(customLogSection, /onChange=\{\(event\) => setEntryDate\(event\.target\.value\)\}/i);
  assert.match(logTab, /<CustomTrackersLogSection/i);
});

test("Today shows only custom trackers logged for the viewed date", () => {
  assert.match(customToday, /eq\("entry_date", selectedDate\)/i);
  assert.match(customToday, /filter\(\(row\) => row\.entry\)/i);
  assert.match(customToday, /metric\.value_type === "yes_no"/i);
  assert.match(customToday, /metric\.value_type === "duration"/i);
  assert.match(customToday, /metric\.value_type === "quantity"/i);
  assert.match(customToday, /metric\.value_type === "rating"/i);
  assert.match(todayTab, /captureDateNavigation/i);
  assert.match(todayTab, /label === "Previous day"/i);
  assert.match(todayTab, /label === "Next day"/i);
});

test("custom Today values are RLS-backed and shared views remain read-only", () => {
  assert.match(customToday, /from\("custom_metrics"\)/i);
  assert.match(customToday, /from\("custom_metric_entries"\)/i);
  assert.match(customToday, /activeCanEdit \? "My trackers"/i);
  assert.doesNotMatch(customToday, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/i);
  assert.match(customLogging, /with-custom-tracker-saved/i);
});

test("disabling a tracker is UI state, not health-history deletion", () => {
  assert.match(trackerPanel, /enabled: next\.enabled/i);
  assert.doesNotMatch(trackerPanel, /from\("(?:weight_entries|food_entries|activity_entries|water_entries|step_entries|fasting_entries|custom_metric_entries)"\)\.delete/i);
  assert.match(trackerPanel, /Your history stays right where it is\./i);
  assert.match(trackerPanel, /from\("profile_quick_add_items"\)/i);
});

test("custom tracker deletion is explicit and warns when history exists", () => {
  assert.match(trackerPanel, /select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(trackerPanel, /permanently remove the tracker and/);
  assert.match(trackerPanel, /turn it off instead/);
  assert.match(trackerPanel, /from\("custom_metrics"\)\.delete\(\)/);
});

test("Today and Log honor the owner's enabled tracker choices", () => {
  assert.match(todayTab, /useOwnTrackerPreferences\(isMine\)/);
  assert.match(todayTab, /trackerEnabled\("food"\)/);
  assert.match(quickAddSection, /trackerEnabled\(option\.id\)/);
  assert.match(logTab, /useOwnTrackerPreferences\(activeCanEdit\)/);
  assert.match(logTab, /LOG_TABS\.filter\(\(\[id\]\) => trackerEnabled\(id\)\)/);
  assert.match(logTab, /You’ve turned off all of the standard logging trackers/i);
});

test("an active fast remains manageable even when fasting is disabled", () => {
  assert.match(todayTab, /trackerEnabled\("fasting"\) \|\| Boolean\(activeFasts\[activeUser\]\)/);
  assert.match(logTab, /trackerEnabled\("fasting"\) \|\| Boolean\(activeFasts\[activeUser\]\)/);
});
