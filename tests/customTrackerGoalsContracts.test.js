import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260914195749_add_custom_metric_goals.sql", "utf8");
const trackerPanel = readFileSync("src/components/MyTrackersPanel.jsx", "utf8");
const goalsSection = readFileSync("src/components/CustomTrackerGoalsSection.jsx", "utf8");
const goalsTab = readFileSync("src/tabs/GoalsTab.jsx", "utf8");
const profileTab = readFileSync("src/tabs/ProfileTab.jsx", "utf8");

test("custom tracker goals are person-owned and inherit tracker visibility", () => {
  assert.match(migration, /create table public\.custom_metric_goals/i);
  assert.match(migration, /profile_id uuid not null references public\.profiles\(id\) on delete cascade/i);
  assert.match(migration, /using \(\(select private\.can_view_custom_metric\(metric_id\)\)\)/i);
  assert.match(migration, /private\.owns_profile\(profile_id\)/i);
});

test("custom tracker goals support daily or weekly targets without forcing rating goals", () => {
  assert.match(migration, /period text not null check \(period in \('day','week'\)\)/i);
  assert.match(migration, /target_value numeric not null check \(target_value > 0\)/i);
  assert.match(migration, /metric_kind = 'rating'/i);
  assert.match(migration, /Rating trackers do not support goals/i);
  assert.match(migration, /metric_kind = 'yes_no'[\s\S]*new\.period <> 'week'/i);
  assert.match(migration, /new\.target_value < 1 or new\.target_value > 7/i);
});

test("Goals is the single place that edits custom tracker goals", () => {
  assert.match(goalsTab, /import CustomTrackerGoalsSection/i);
  assert.match(goalsTab, /<CustomTrackerGoalsSection/i);
  assert.match(goalsSection, /from\("custom_metric_goals"\)\.upsert/i);
  assert.match(goalsSection, /from\("custom_metric_goals"\)\.delete/i);
  assert.doesNotMatch(trackerPanel, /from\("custom_metric_goals"\)\.upsert/i);
});

test("Profile links custom trackers into Goals instead of opening a second goal editor", () => {
  assert.match(profileTab, /onOpenGoals=\{openGoalsEdit\}/i);
  assert.match(trackerPanel, /sessionStorage\.setItem\("with-custom-goal-focus", metric\.id\)/i);
  assert.match(trackerPanel, /sessionStorage\.setItem\("with-custom-goal-profile", profileId\)/i);
  assert.match(trackerPanel, /onOpenGoals\?\.\(\)/i);
  assert.match(trackerPanel, /Set a goal/i);
  assert.match(trackerPanel, /Edit goal/i);
});

test("Goals focuses a linked custom tracker without forcing the standard goal editor", () => {
  assert.match(goalsTab, /with-custom-goal-focus/i);
  assert.match(goalsTab, /with-custom-goal-profile/i);
  assert.match(goalsTab, /standardEditingGoals = editingGoals && !customGoalFocusId/i);
  assert.match(goalsSection, /scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/i);
});

test("disabled custom trackers preserve goals and rating trackers do not offer goal links", () => {
  assert.match(trackerPanel, /const goalCapable = metric\.value_type !== "rating"/i);
  assert.match(trackerPanel, /enabled && goalCapable/i);
  assert.match(trackerPanel, /patch\.enabled === false[\s\S]*profile_quick_add_items/i);
  assert.doesNotMatch(trackerPanel, /patch\.enabled === false[\s\S]{0,500}custom_metric_goals[\s\S]{0,100}delete/i);
  assert.match(goalsSection, /\.eq\("enabled", true\)/i);
  assert.match(goalsSection, /Turning a tracker off hides its goal from active use, but does not delete the goal\./i);
});
