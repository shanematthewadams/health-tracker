import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const logTab = readFileSync("src/tabs/LogTab.jsx", "utf8");
const customSection = readFileSync("src/components/CustomTrackersLogSection.jsx", "utf8");

test("Log gives My Trackers a first-class mode instead of burying it after standard forms", () => {
  assert.match(logTab, /const \[logMode, setLogMode\] = useState\("basics"\)/);
  assert.match(logTab, />Basics<\/button>/);
  assert.match(logTab, />My Trackers<\/button>/);
  assert.match(logTab, /logMode === "custom"[\s\S]*<CustomTrackersLogSection/);
  assert.match(logTab, /logMode === "custom"[\s\S]*standalone/);
});

test("My Trackers switch only appears when enabled custom trackers exist", () => {
  assert.match(logTab, /const \[hasCustomTrackers, setHasCustomTrackers\] = useState\(false\)/);
  assert.match(logTab, /from\("custom_metrics"\)/);
  assert.match(logTab, /\.eq\("enabled", true\)/);
  assert.match(logTab, /props\.activeCanEdit && hasCustomTrackers/);
  assert.match(logTab, /!hasCustomTrackers && logMode === "custom"/);
});

test("Log mode switch stays intentionally compact", () => {
  assert.match(logTab, /minHeight: 32/);
  assert.match(logTab, /padding: "5px 10px"/);
  assert.match(logTab, /fontSize: 11/);
  assert.match(logTab, /width: "fit-content"/);
});

test("custom Log mode keeps its own date-aware logger", () => {
  assert.match(customSection, /standalone = false/);
  assert.match(customSection, /entryDate/);
  assert.match(customSection, /CustomTrackerLogger/);
});
