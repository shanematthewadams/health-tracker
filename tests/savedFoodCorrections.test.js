import test from "node:test";
import assert from "node:assert/strict";
import { savedFoodCorrectionPayload } from "../src/savedFoodCorrections.js";

const savedFoods = [{
  id: "greek-yogurt",
  calories: 179,
  protein: 14.8,
  carbs: 8,
  fat: 9,
  fiber: 0,
}];

test("persists a one-serving correction to a household saved food", () => {
  const correction = savedFoodCorrectionPayload({
    selectedSavedFoodId: "household:greek-yogurt",
    quantity: "1",
    savedFoods,
    calories: "170",
    protein: "15",
    carbs: "8",
    fat: "9",
    fiber: "0",
  });

  assert.deepEqual(correction, {
    id: "greek-yogurt",
    values: { calories: 170, protein: 15, carbs: 8, fat: 9, fiber: 0 },
  });
});

test("does not rewrite a saved food when only quantity changes", () => {
  const correction = savedFoodCorrectionPayload({
    selectedSavedFoodId: "household:greek-yogurt",
    quantity: "2",
    savedFoods,
    calories: "358",
    protein: "29.6",
    carbs: "16",
    fat: "18",
    fiber: "0",
  });

  assert.equal(correction, null);
});

test("does not treat unchanged visible one-decimal values as corrections", () => {
  const correction = savedFoodCorrectionPayload({
    selectedSavedFoodId: "household:greek-yogurt",
    quantity: "1",
    savedFoods: [{ ...savedFoods[0], protein: 14.84 }],
    calories: "179",
    protein: "14.8",
    carbs: "8",
    fat: "9",
    fiber: "0",
  });

  assert.equal(correction, null);
});

test("never rewrites a global or USDA food from a personal log override", () => {
  const correction = savedFoodCorrectionPayload({
    selectedSavedFoodId: "global:greek-yogurt",
    quantity: "1",
    savedFoods,
    calories: "170",
    protein: "15",
    carbs: "8",
    fat: "9",
    fiber: "0",
  });

  assert.equal(correction, null);
});

test("ignores a missing saved-food record", () => {
  const correction = savedFoodCorrectionPayload({
    selectedSavedFoodId: "household:not-here",
    quantity: "1",
    savedFoods,
    calories: "170",
    protein: "15",
    carbs: "8",
    fat: "9",
    fiber: "0",
  });

  assert.equal(correction, null);
});
