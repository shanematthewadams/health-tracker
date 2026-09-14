import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const quickAdd = readFileSync("src/components/QuickAddSection.jsx", "utf8");

test("Quick Add stays a compact utility when not editing", () => {
  assert.match(quickAdd, /fontSize: 12, fontWeight: 700, color: TEXT_MUTED/);
  assert.match(quickAdd, /gridTemplateColumns: `repeat\(\$\{visibleQuickAdd\.length\}, minmax\(0, 1fr\)\)`/);
  assert.match(quickAdd, /flexDirection: "column"/);
  assert.match(quickAdd, /textOverflow: "ellipsis"/);
  assert.doesNotMatch(quickAdd, /overflowX: "auto"/);
  assert.doesNotMatch(quickAdd, /flexWrap: "wrap"/);
  assert.doesNotMatch(quickAdd, /borderTop: `3px solid \$\{option\.color\}`/);
});

test("Quick Add polish preserves existing behavior", () => {
  assert.match(quickAdd, /slice\(0, 5\)/);
  assert.match(quickAdd, /openLog\("food", selectedDate\)/);
  assert.match(quickAdd, /entry_date: selectedDate/);
  assert.match(quickAdd, /Choose up to five shortcuts/);
  assert.match(quickAdd, /Fasting keeps its own Today controls/);
  assert.match(quickAdd, /CustomTrackerLogger/);
});
