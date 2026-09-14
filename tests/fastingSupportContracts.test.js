import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const supportMigration = readFileSync("supabase/migrations/20260914143725_add_fasting_support.sql", "utf8");
const history = readFileSync("src/components/FastingHistorySection.jsx", "utf8");
const sharedFast = readFileSync("src/components/SharedActiveFastCard.jsx", "utf8");
const currentFast = readFileSync("src/components/CurrentFastCard.jsx", "utf8");
const todayTab = readFileSync("src/tabs/TodayTab.jsx", "utf8");
const tracker = readFileSync("src/Tracker.jsx", "utf8");
const fastingTrends = readFileSync("src/components/FastingTrendsSection.jsx", "utf8");

test("completed fast deletion is owner-only in the UI and removes the fasting row", () => {
  assert.match(history, /if \(!activeCanEdit \|\| !trackerEnabled\("fasting"\)\) return null/i);
  assert.match(history, /Delete this fast\?/i);
  assert.match(history, /permanently remove it from your fasting history and Trends/i);
  assert.match(history, /\.from\("fasting_entries"\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("id", row\.id\)[\s\S]*\.eq\("profile_id", profileId\)/i);
  assert.match(history, /with-fasting-history-changed[\s\S]*deletedId/i);
  assert.doesNotMatch(currentFast, /Delete this fast\?|Delete fast/i);
});

test("fasting Trends refreshes naturally when fasting history changes", () => {
  assert.match(fastingTrends, /with-fasting-history-changed/i);
  assert.match(fastingTrends, /\.from\("fasting_entries"\)[\s\S]*\.not\("ended_at", "is", null\)/i);
});

test("shared active fasting status uses the already RLS-filtered active fast map", () => {
  assert.match(tracker, /\.from\("fasting_entries"\)\.select\("\*"\)\.in\("profile_id", profileIds\)/i);
  assert.match(tracker, /\(fastsRes\?\.data \|\| \[\]\)\.filter\(\(f\) => !f\.ended_at\)[\s\S]*fastMap/i);
  assert.match(todayTab, /if \(props\.activeCanEdit \|\| !activeFast\) return undefined/i);
  assert.match(todayTab, /sharedFastTarget && activeFast && !props\.activeCanEdit && selectedDate === props\.today/i);
  assert.match(todayTab, /<SharedActiveFastCard/i);
  assert.match(sharedFast, /\{personName\} is fasting/i);
  assert.match(sharedFast, /Started \{startedLabel\(activeFast\.started_at, timeZone\)\}/i);
  assert.doesNotMatch(sharedFast, /goal|streak|rank|longest|achievement|leaderboard/i);
});

test("fasting support is private, relationship-gated, sender-authenticated, and active-fast-only", () => {
  assert.match(supportMigration, /alter table public\.fasting_supports enable row level security/i);
  assert.match(supportMigration, /grant select, insert on table public\.fasting_supports to authenticated/i);
  assert.doesNotMatch(supportMigration, /grant[^;]*(update|delete)[^;]*fasting_supports[^;]*authenticated/i);
  assert.match(supportMigration, /private\.owns_profile\(sender_profile_id\)/i);
  assert.match(supportMigration, /private\.can_view_profile_metric\(recipient_profile_id, 'fasting'\)/i);
  assert.match(supportMigration, /fast\.profile_id = fasting_supports\.recipient_profile_id/i);
  assert.match(supportMigration, /fast\.ended_at is null/i);
  assert.match(supportMigration, /sender_profile_id <> recipient_profile_id/i);
  assert.match(supportMigration, /support participants can view fasting support/i);
});

test("sending support cannot mutate fasting data and has no social scoring surface", () => {
  assert.match(sharedFast, /\.from\("fasting_supports"\)[\s\S]*\.insert\(\{[\s\S]*fasting_entry_id:[\s\S]*sender_profile_id:[\s\S]*recipient_profile_id:/i);
  assert.doesNotMatch(sharedFast, /\.from\("fasting_entries"\)[\s\S]*\.(update|insert|delete)/i);
  assert.match(sharedFast, /Send support/i);
  assert.match(sharedFast, /Support sent/i);
  assert.doesNotMatch(sharedFast, /count|likes?|comments?|followers?|feed|ranking|leaderboard|streak/i);
});

test("the fast owner sees relationship-based support language without a counter", () => {
  assert.match(currentFast, /\.from\("fasting_supports"\)[\s\S]*sender_profile_id,created_at/i);
  assert.match(currentFast, /\{supporter\.name\} is With You/i);
  assert.match(currentFast, /Rooting for you\./i);
  assert.doesNotMatch(currentFast, /supporters\.length\}\s*(support|people|members)|support count/i);
});
