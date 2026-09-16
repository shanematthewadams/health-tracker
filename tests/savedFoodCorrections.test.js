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

const globalFoods = [{
  id: "global-yogurt",
  source_type: "user",
  calories: 179,
  protein: 14.8,
  carbs: 8,
  fat: 9,
  fiber: 0,
}];

test("offers a one-serving correction for a household saved food", () => {
  const correction = savedFoodCorrectionPayload({
    selectedSavedFoodId: "household:greek-yogurt",
    quantity: "1",
    savedFoods,
    globalFoods,
    calories: "170",
    protein: "15",
    carbs: "8",
    fat: "9",
    fiber: "0",
  });

  assert.deepEqual(correction, {
    source: "household",
    id: "greek-yogurt",
    values: { calories: 170, protein: 15, carbs: 8, fat: 9, fiber: 0 },
  });
});

test("does not rewrite a saved food when only quantity changes", () => {
  const correction = savedFoodCorrectionPayload({
    selectedSavedFoodId: "household:greek-yogurt",
    quantity: "2",
    savedFoods,
    globalFoods,
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
    globalFoods,
    calories: "179",
    protein: "14.8",
    carbs: "8",
    fat: "9",
    fiber: "0",
  });

  assert.equal(correction, null);
});

test("allows a changed shared global food to be checked by the ownership RPC", () => {
  const correction = savedFoodCorrectionPayload({
    selectedSavedFoodId: "global:global-yogurt",
    quantity: "1",
    savedFoods,
    globalFoods,
    calories: "170",
    protein: "15",
    carbs: "8",
    fat: "9",
    fiber: "0",
  });

  assert.deepEqual(correction, {
    source: "global",
    id: "global-yogurt",
    values: { calories: 170, protein: 15, carbs: 8, fat: 9, fiber: 0 },
  });
});

test("ignores a missing food record", () => {
  const correction = savedFoodCorrectionPayload({
    selectedSavedFoodId: "household:not-here",
    quantity: "1",
    savedFoods,
    globalFoods,
    calories: "170",
    protein: "15",
    carbs: "8",
    fat: "9",
    fiber: "0",
  });

  assert.equal(correction, null);
});
