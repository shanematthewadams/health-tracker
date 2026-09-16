import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const quickAdd = readFileSync("src/components/QuickAddSection.jsx", "utf8");

test("Quick Add stays a compact fixed-row utility when not editing", () => {
  assert.match(quickAdd, /fontSize: 12, fontWeight: 700, color: TEXT_MUTED/);
  assert.match(quickAdd, /gridTemplateColumns: `repeat\(\$\{visibleQuickAdd\.length\}, minmax\(0, 1fr\)\)`/);
  assert.doesNotMatch(quickAdd, /overflowX: "auto"/);
  assert.doesNotMatch(quickAdd, /flexWrap: "wrap"/);
  assert.doesNotMatch(quickAdd, /borderTop: `3px solid \$\{option\.color\}`/);
});

test("Quick Add preserves behavior and offers fasting as an optional shortcut", () => {
  assert.match(quickAdd, /slice\(0, 5\)/);
  assert.match(quickAdd, /id: "fasting", label: "Fasting"/);
  assert.match(quickAdd, /with-start-fast-requested/);
  assert.match(quickAdd, /openLog\("food", selectedDate\)/);
  assert.match(quickAdd, /entry_date: selectedDate/);
  assert.match(quickAdd, /Choose up to five shortcuts/);
  assert.match(quickAdd, /Choose what you want one tap away on Today/);
  assert.match(quickAdd, /CustomTrackerLogger/);
});
