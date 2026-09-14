import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

test("shared active fasting status remains visibility-gated and contains no support action", () => {
  assert.match(tracker, /\.from\("fasting_entries"\)\.select\("\*"\)\.in\("profile_id", profileIds\)/i);
  assert.match(tracker, /\(fastsRes\?\.data \|\| \[\]\)\.filter\(\(f\) => !f\.ended_at\)[\s\S]*fastMap/i);
  assert.match(todayTab, /activeFast && !props\.activeCanEdit/i);
  assert.match(todayTab, /<SharedActiveFastCard/i);
  assert.match(sharedFast, /\{personName\} is fasting/i);
  assert.match(sharedFast, /Started \{startedLabel\(activeFast\.started_at, timeZone\)\}/i);
  assert.doesNotMatch(sharedFast, /Send support|Support sent|fasting_supports|support_notes/i);
  assert.doesNotMatch(currentFast, /fasting_supports|support_notes|is With You|Rooting for you/i);
  assert.doesNotMatch(sharedFast, /goal|streak|rank|longest|achievement|leaderboard/i);
});
