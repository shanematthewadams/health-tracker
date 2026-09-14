import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const quickAdd = readFileSync("src/components/QuickAddSection.jsx", "utf8");

test("Quick Add stays a compact utility when not editing", () => {
  assert.match(quickAdd, /fontSize: 12, fontWeight: 700, color: TEXT_MUTED/);
  assert.match(quickAdd, /flexWrap: "nowrap"/);
  assert.match(quickAdd, /overflowX: "auto"/);
  assert.match(quickAdd, /flexShrink: 0/);
  assert.match(quickAdd, /borderRadius: 999/);
  assert.match(quickAdd, /display: "inline-flex", alignItems: "center"/);
  assert.doesNotMatch(quickAdd, /flexWrap: "wrap"/);
  assert.doesNotMatch(quickAdd, /borderTop: `3px solid \$\{option\.color\}`/);
  assert.doesNotMatch(quickAdd, /gridTemplateColumns: `repeat\(\$\{visibleQuickAdd\.length\}, 1fr\)`/);
});

test("Quick Add polish preserves existing behavior", () => {
  assert.match(quickAdd, /slice\(0, 5\)/);
  assert.match(quickAdd, /openLog\("food", selectedDate\)/);
  assert.match(quickAdd, /entry_date: selectedDate/);
  assert.match(quickAdd, /Choose up to five shortcuts/);
  assert.match(quickAdd, /Fasting keeps its own Today controls/);
  assert.match(quickAdd, /CustomTrackerLogger/);
});
