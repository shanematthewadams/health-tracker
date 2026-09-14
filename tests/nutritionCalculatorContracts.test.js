import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  MACRO_PRESETS,
  activityFactor,
  calculateNutritionTargets,
  mifflinStJeor,
} from "../src/nutritionCalculator.js";

const calculatorUi = fs.readFileSync(new URL("../src/components/NutritionTargetCalculator.jsx", import.meta.url), "utf8");
const goalsTab = fs.readFileSync(new URL("../src/tabs/GoalsTab.jsx", import.meta.url), "utf8");

test("Mifflin-St Jeor uses the selected male and female constants", () => {
  const base = { weightLb: 227.2, heightIn: 75, age: 49 };
  const male = mifflinStJeor({ ...base, formula: "male" });
  const female = mifflinStJeor({ ...base, formula: "female" });
  assert.ok(Math.abs(male - 1981.1869) < 0.01);
  assert.ok(Math.abs(female - 1815.1869) < 0.01);
  assert.ok(Math.abs((male - female) - 166) < 0.001);
});

test("activity estimate uses both everyday movement and exercise frequency", () => {
  assert.equal(activityFactor("mostly_sitting", "rarely"), 1.2);
  assert.equal(activityFactor("mostly_sitting", "three_four"), 1.55);
  assert.equal(activityFactor("on_feet", "one_two"), 1.55);
  assert.equal(activityFactor("physical", "nearly_daily"), 1.9);
  assert.match(calculatorUi, /What is most of your normal day like\?/);
  assert.match(calculatorUi, /How often do you intentionally exercise in a typical week\?/);
});

test("macro preferences are explicit percentages that total 100", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(MACRO_PRESETS).map(([key, value]) => [key, [value.proteinPct, value.carbsPct, value.fatPct]])),
    {
      balanced: [25, 45, 30],
      higher_protein: [30, 40, 30],
      lower_fat: [25, 55, 20],
      lower_carb: [30, 35, 35],
    },
  );
  for (const preset of Object.values(MACRO_PRESETS)) {
    assert.equal(preset.proteinPct + preset.carbsPct + preset.fatPct, 100);
  }
});

test("calculator turns a macro percentage choice into gram targets", () => {
  const result = calculateNutritionTargets({
    currentWeightLb: 200,
    goalWeightLb: 190,
    goalDate: "2026-11-23",
    heightIn: 72,
    age: 40,
    formula: "male",
    dayActivity: "some_walking",
    exerciseFrequency: "three_four",
    presetKey: "higher_protein",
    today: "2026-09-14",
  });
  assert.equal(result.protein, Math.round((result.calories * 0.30) / 4));
  assert.equal(result.carbs, Math.round((result.calories * 0.40) / 4));
  assert.equal(result.fat, Math.round((result.calories * 0.30) / 9));
});

test("weight loss faster than 2 lb per week is not used to create a more aggressive target", () => {
  const result = calculateNutritionTargets({
    currentWeightLb: 220,
    goalWeightLb: 180,
    goalDate: "2026-10-12",
    heightIn: 72,
    age: 40,
    formula: "male",
    dayActivity: "mostly_sitting",
    exerciseFrequency: "one_two",
    presetKey: "balanced",
    today: "2026-09-14",
  });
  assert.ok(result.requestedWeeklyChange < -2);
  assert.equal(result.appliedWeeklyChange, -2);
  assert.equal(result.aggressiveLoss, true);
  assert.ok(result.suggestedGoalDate);
  assert.match(calculatorUi, /1–2 lb per week/);
});

test("methodology is visible and applying estimates does not save them automatically", () => {
  assert.match(calculatorUi, /How With calculated this/);
  assert.match(calculatorUi, /Mifflin-St Jeor equation/);
  assert.match(calculatorUi, /3,500-calories-per-pound relationship/);
  assert.match(calculatorUi, /Use these targets/);
  assert.doesNotMatch(calculatorUi, /supabase/);
});

test("Goals prefers the recent weight trend when enough weigh-ins exist", () => {
  assert.match(goalsTab, /gi\?\.averageCount >= 2\s*\? gi\.latest/);
  assert.match(goalsTab, /latest logged weight/);
  assert.match(goalsTab, /<NutritionTargetCalculator/);
});
