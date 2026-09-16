import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const trends = readFileSync("src/tabs/TrendsTab.jsx", "utf8");
const customTrends = readFileSync("src/components/CustomTrendsSection.jsx", "utf8");
const preferences = readFileSync("src/useOwnTrackerPreferences.js", "utf8");

test("tracker preferences expose the owned profile so Trends can distinguish mine from shared profiles", () => {
  assert.match(preferences, /const \[profileId, setProfileId\] = useState\(null\)/i);
  assert.match(preferences, /setProfileId\(profile\.id\)/i);
  assert.match(preferences, /return \{ profileId, enabledByMetric, trackerEnabled, enabledTrackerIds, loading \}/i);
  assert.match(trends, /profileId: ownedProfileId, trackerEnabled: ownTrackerEnabled/i);
  assert.match(trends, /profileKey !== ownedProfileId \|\| ownTrackerEnabled\(metricType\)/i);
});

test("individual Trends hides standard sections the owner has turned off", () => {
  for (const metric of ["weight", "fasting", "steps", "activity", "water", "food"]) {
    assert.match(trends, new RegExp(`trackerEnabled\\("${metric}"\\)`, "i"));
  }
  assert.match(trends, /showWeight \? \(/i);
  assert.match(trends, /showFasting \? <FastingTrendsSection/i);
  assert.match(trends, /showMovement \? \(/i);
  assert.match(trends, /showWater \? \(/i);
  assert.match(trends, /showFood \? \(/i);
});

test("Something worth noticing does not surface an owner-disabled standard tracker", () => {
  assert.match(trends, /function observationTrackerId\(metric\)/i);
  assert.match(trends, /\["protein", "calories", "fiber", "carbs", "fat"\]\.includes\(metric\).*return "food"/is);
  assert.match(trends, /observationCandidates\(user, today\)\.filter\(\(candidate\) => trackerEnabled\(observationTrackerId\(candidate\.metric\)\)\)/i);
  assert.match(trends, /trackerEnabled=\{activeTrackerEnabled\}/i);
});

test("custom trackers appear in Trends as one switchable card instead of one card per tracker", () => {
  assert.match(trends, /import CustomTrendsSection/i);
  assert.match(trends, /<CustomTrendsSection[\s\S]*profileId=\{profileKey\}[\s\S]*range=\{range\}/i);
  assert.match(customTrends, /selectedMetricId/i);
  assert.match(customTrends, /setSelectedMetricId\(metric\.id\)/i);
  assert.match(customTrends, /metrics\.length > 1/i);
});

test("custom Trends uses the selected date range and only enabled RLS-visible custom metrics", () => {
  assert.match(customTrends, /from\("custom_metrics"\)/i);
  assert.match(customTrends, /\.eq\("profile_id", profileId\)/i);
  assert.match(customTrends, /\.eq\("enabled", true\)/i);
  assert.match(customTrends, /from\("custom_metric_entries"\)/i);
  assert.match(customTrends, /\.gte\("entry_date", startDate\)/i);
  assert.match(customTrends, /\.lte\("entry_date", today\)/i);
  assert.doesNotMatch(customTrends, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/i);
});

test("custom Trends treats missing days as unknown and supports all tracker value shapes", () => {
  assert.match(customTrends, /Blank days are unknown, not zero\./i);
  assert.match(customTrends, /value_type === "yes_no"/i);
  assert.match(customTrends, /value_type === "rating"/i);
  assert.match(customTrends, /value_type === "duration"/i);
  assert.match(customTrends, /value_type === "quantity"/i);
  assert.match(customTrends, /connectNulls=\{false\}/i);
});
