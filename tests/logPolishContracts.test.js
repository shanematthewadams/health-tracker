import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const log = readFileSync("src/tabs/LogTab.jsx", "utf8");

test("Log suppresses the legacy Food-tab fasting prompt and editor", () => {
  assert.match(log, /activeFasts:\s*\{\}/i);
  assert.match(log, /fastPromptDismissedToday:\s*true/i);
  assert.match(log, /fastEditorOpen:\s*false/i);
});

test("Log offers fasting as a start action only when no fast is active", () => {
  assert.match(log, /fastingEnabled\s*&&\s*!activeFast/i);
  assert.match(log, /activeFast=\{null\}/i);
  assert.match(log, /showStartAction/i);
});
