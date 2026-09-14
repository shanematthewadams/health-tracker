import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const card = readFileSync("src/components/CurrentFastCard.jsx", "utf8");
const section = readFileSync("src/components/FastingTodaySection.jsx", "utf8");
const todayBase = readFileSync("src/tabs/TodayTabBase.jsx", "utf8");
const today = readFileSync("src/tabs/TodayTab.jsx", "utf8");

test("Today uses the dedicated Fasting V2 section", () => {
  assert.match(todayBase, /import FastingTodaySection/);
  assert.match(todayBase, /<FastingTodaySection/);
  assert.doesNotMatch(todayBase, />You’re fasting</);
});

test("current fast card shows elapsed time, optional goal progress, editing, and ending", () => {
  assert.match(card, /Current fast/i);
  assert.match(card, /elapsedMinutes/i);
  assert.match(card, /goal_minutes/i);
  assert.match(card, /remaining to your/i);
  assert.match(card, /goal reached/i);
  assert.match(card, /Edit fast start/i);
  assert.match(card, /End fast/i);
});

test("fast goals are optional and persist on the active fasting row", () => {
  assert.match(card, /Leave it blank if you just want to track the fast without aiming for a duration/i);
  assert.match(card, /\.from\("fasting_entries"\)[\s\S]*\.update\(\{ goal_minutes: nextGoal \}\)/i);
  assert.match(card, /with-fast-goal-updated/i);
  assert.match(today, /with-fast-goal-updated/i);
  assert.match(today, /fast\.goal_minutes = event\.detail\.goalMinutes/i);
});

test("fasting Today stays quiet while preserving the backdated start editor", () => {
  assert.doesNotMatch(section, /Fasting today\?/i);
  assert.doesNotMatch(section, /Not today/i);
  assert.match(section, /with-start-fast-requested/i);
  assert.match(section, /Backdating is completely fine/i);
  assert.match(section, /type="date" max=\{today\}/i);
});
