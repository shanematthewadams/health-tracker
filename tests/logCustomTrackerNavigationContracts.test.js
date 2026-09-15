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
  assert.match(logTab, /showEmptyState/);
});

test("custom Log mode has its own date-aware empty state", () => {
  assert.match(customSection, /standalone = false/);
  assert.match(customSection, /showEmptyState = false/);
  assert.match(customSection, /No personal trackers yet\./);
  assert.match(customSection, /Profile → My Trackers/);
  assert.match(customSection, /entryDate/);
});
