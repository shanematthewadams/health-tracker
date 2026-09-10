import { supabase } from "./supabase";

function normalizeDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function looksLikeUpc(value) {
  const digits = normalizeDigits(value);
  return /^\d{8,14}$/.test(digits);
}

export async function searchUsdaFoods(term) {
  const clean = String(term || "").trim();
  if (clean.length < 2) return [];

  const body = looksLikeUpc(clean)
    ? { upc: normalizeDigits(clean) }
    : { query: clean };

  const { data, error } = await supabase.functions.invoke("food-search", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return Array.isArray(data?.foods) ? data.foods : [];
}

function asGlobalFood(row) {
  return {
    ...row,
    source: "global",
    calories: Number(row.calories || 0),
    protein: Number(row.protein || 0),
    carbs: Number(row.carbs || 0),
    fat: Number(row.fat || 0),
    fiber: Number(row.fiber || 0),
  };
}

export async function importUsdaFood(food) {
  if (!food?.source_id) throw new Error("This USDA food is missing its source ID.");

  const { data: existing, error: existingError } = await supabase
    .from("global_foods")
    .select("*")
    .eq("source_type", "usda_fdc")
    .eq("source_id", String(food.source_id))
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return asGlobalFood(existing);

  const servingDescription = String(food.serving_description || "").trim() || "1 serving";
  const payload = {
    name: String(food.name || "USDA food").trim(),
    brand: food.brand || null,
    calories: Number(food.calories || 0),
    protein: Number(food.protein || 0),
    carbs: Number(food.carbs || 0),
    fat: Number(food.fat || 0),
    fiber: Number(food.fiber || 0),
    serving_label: servingDescription,
    serving_description: servingDescription,
    serving_quantity: food.serving_quantity ?? null,
    serving_unit: food.serving_unit || null,
    default_meal: null,
    notes: null,
    source_type: "usda_fdc",
    source_id: String(food.source_id),
    gtin_upc: food.gtin_upc ? String(food.gtin_upc) : null,
    source_updated_at: food.published_date || null,
    updated_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("global_foods")
    .insert(payload)
    .select("*")
    .single();

  if (!insertError) return asGlobalFood(inserted);

  // A simultaneous import can hit the unique source identity constraint.
  // Re-read the canonical row rather than surfacing a duplicate-key failure.
  const { data: raced, error: racedError } = await supabase
    .from("global_foods")
    .select("*")
    .eq("source_type", "usda_fdc")
    .eq("source_id", String(food.source_id))
    .maybeSingle();

  if (racedError || !raced) throw insertError;
  return asGlobalFood(raced);
}
