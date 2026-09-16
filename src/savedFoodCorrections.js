const NUTRITION_KEYS = ["calories", "protein", "carbs", "fat", "fiber"];

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value) {
  return Math.round(numberValue(value) * 10) / 10;
}

export function savedFoodCorrectionPayload({
  selectedSavedFoodId,
  quantity,
  savedFoods = [],
  calories,
  protein,
  carbs,
  fat,
  fiber,
}) {
  const [source, id] = String(selectedSavedFoodId || "").split(":");
  if (source !== "household" || !id) return null;

  const parsedQuantity = Number(quantity);
  if (!Number.isFinite(parsedQuantity) || Math.abs(parsedQuantity - 1) > 1e-9) return null;

  const savedFood = savedFoods.find((food) => String(food.id) === id);
  if (!savedFood) return null;

  const values = {
    calories: numberValue(calories),
    protein: numberValue(protein),
    carbs: numberValue(carbs),
    fat: numberValue(fat),
    fiber: numberValue(fiber),
  };

  // The picker itself displays saved nutrition to one decimal place. Compare
  // against that same visible precision so invisible database precision never
  // looks like a user correction.
  const changed = NUTRITION_KEYS.some(
    (key) => Math.abs(values[key] - round1(savedFood[key])) > 0.0001
  );

  return changed ? { id, values } : null;
}
