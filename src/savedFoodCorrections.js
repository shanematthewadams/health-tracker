const NUTRITION_KEYS = ["calories", "protein", "carbs", "fat", "fiber"];

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value) {
  return Math.round(numberValue(value) * 10) / 10;
}

export function savedFoodChangeCandidate({
  selectedSavedFoodId,
  quantity,
  savedFoods = [],
  globalFoods = [],
  calories,
  protein,
  carbs,
  fat,
  fiber,
}) {
  const [source, id] = String(selectedSavedFoodId || "").split(":");
  if (!id || !["household", "global"].includes(source)) return null;

  const parsedQuantity = Number(quantity);
  if (!Number.isFinite(parsedQuantity) || Math.abs(parsedQuantity - 1) > 1e-9) return null;

  const foods = source === "global" ? globalFoods : savedFoods;
  const savedFood = foods.find((food) => String(food.id) === id);
  if (!savedFood) return null;

  const values = {
    calories: numberValue(calories),
    protein: numberValue(protein),
    carbs: numberValue(carbs),
    fat: numberValue(fat),
    fiber: numberValue(fiber),
  };

  // Compare against the same one-decimal precision the picker shows so hidden
  // database precision never creates a fake "you changed this" state.
  const changed = NUTRITION_KEYS.some(
    (key) => Math.abs(values[key] - round1(savedFood[key])) > 0.0001
  );

  return changed ? { source, id, values } : null;
}

export function savedFoodCorrectionPayload({ updateSavedFood = false, ...input }) {
  if (!updateSavedFood) return null;
  return savedFoodChangeCandidate(input);
}
