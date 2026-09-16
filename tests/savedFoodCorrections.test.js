import test from "node:test";
import assert from "node:assert/strict";
import { savedFoodChangeCandidate, savedFoodCorrectionPayload } from "../src/savedFoodCorrections.js";

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

const changedHouseholdFood = {
  selectedSavedFoodId: "household:greek-yogurt",
  quantity: "1",
  savedFoods,
  globalFoods,
  calories: "170",
  protein: "15",
  carbs: "8",
  fat: "9",
  fiber: "0",
};

test("detects a changed one-serving saved food without deciding to persist it", () => {
  assert.deepEqual(savedFoodChangeCandidate(changedHouseholdFood), {
    source: "household",
    id: "greek-yogurt",
    values: { calories: 170, protein: 15, carbs: 8, fat: 9, fiber: 0 },
  });
});

test("changed macros stay log-only by default", () => {
  assert.equal(savedFoodCorrectionPayload(changedHouseholdFood), null);
});

test("persists changed macros only after explicit saved-food opt-in", () => {
  assert.deepEqual(savedFoodCorrectionPayload({ ...changedHouseholdFood, updateSavedFood: true }), {
    source: "household",
    id: "greek-yogurt",
    values: { calories: 170, protein: 15, carbs: 8, fat: 9, fiber: 0 },
  });
});

test("quantity changes never become saved-food corrections", () => {
  const correction = savedFoodCorrectionPayload({
    ...changedHouseholdFood,
    updateSavedFood: true,
    quantity: "2",
    calories: "358",
    protein: "29.6",
    carbs: "16",
    fat: "18",
  });

  assert.equal(correction, null);
});

test("unchanged visible one-decimal values do not create an update option", () => {
  const candidate = savedFoodChangeCandidate({
    ...changedHouseholdFood,
    savedFoods: [{ ...savedFoods[0], protein: 14.84 }],
    calories: "179",
    protein: "14.8",
  });

  assert.equal(candidate, null);
});

test("user-authored global foods use the same explicit opt-in rule", () => {
  const input = {
    selectedSavedFoodId: "global:global-yogurt",
    quantity: "1",
    savedFoods,
    globalFoods,
    calories: "170",
    protein: "15",
    carbs: "8",
    fat: "9",
    fiber: "0",
  };

  assert.ok(savedFoodChangeCandidate(input));
  assert.equal(savedFoodCorrectionPayload(input), null);
  assert.deepEqual(savedFoodCorrectionPayload({ ...input, updateSavedFood: true }), {
    source: "global",
    id: "global-yogurt",
    values: { calories: 170, protein: 15, carbs: 8, fat: 9, fiber: 0 },
  });
});

test("missing food records cannot be updated", () => {
  assert.equal(savedFoodChangeCandidate({
    ...changedHouseholdFood,
    selectedSavedFoodId: "household:not-here",
  }), null);
});
