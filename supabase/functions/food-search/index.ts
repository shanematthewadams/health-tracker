import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_KEY = Deno.env.get("USDA_FDC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const nutrientNumbers: Record<string, string> = {
  calories: "208",
  protein: "203",
  carbs: "205",
  fat: "204",
  fiber: "291",
};

function number(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function nutrientPer100(food: any, key: keyof typeof nutrientNumbers) {
  const numberId = nutrientNumbers[key];
  const match = (food.foodNutrients || []).find((n: any) =>
    String(n.nutrientNumber || n.nutrient?.number || "") === numberId
  );
  return number(match?.value ?? match?.amount);
}

function normalizeBranded(food: any) {
  const servingQuantity = number(food.servingSize) || null;
  const servingUnit = String(food.servingSizeUnit || "").trim() || null;
  const household = String(food.householdServingFullText || "").trim() || null;
  const unit = String(servingUnit || "").toLowerCase();

  // USDA Global Branded Foods nutrient values are standardized to a
  // 100 g / 100 mL basis. Convert them back to the labeled serving.
  const canScaleToServing = Boolean(servingQuantity && ["g", "gram", "grams", "ml", "milliliter", "milliliters"].includes(unit));
  const scale = canScaleToServing ? servingQuantity! / 100 : 1;
  const perServing = (key: keyof typeof nutrientNumbers) => round1(nutrientPer100(food, key) * scale);

  return {
    source: "usda_fdc",
    source_id: String(food.fdcId),
    name: food.description || "USDA food",
    brand: food.brandName || food.brandOwner || null,
    gtin_upc: food.gtinUpc ? String(food.gtinUpc) : null,
    serving_quantity: servingQuantity,
    serving_unit: servingUnit,
    serving_description: household || (servingQuantity && servingUnit ? `${servingQuantity} ${servingUnit}` : "1 serving"),
    calories: perServing("calories"),
    protein: perServing("protein"),
    carbs: perServing("carbs"),
    fat: perServing("fat"),
    fiber: perServing("fiber"),
    data_type: food.dataType || null,
    published_date: food.publishedDate || null,
    nutrition_basis: canScaleToServing ? "labeled_serving" : "per_100_unit",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) throw new Error("Authentication required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");
    if (!USDA_KEY) throw new Error("USDA_FDC_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));
    const query = String(body.query || "").trim();
    const upc = String(body.upc || "").replace(/\D/g, "");
    const term = upc || query;

    if (term.length < 2) {
      return Response.json({ foods: [] }, { headers: corsHeaders });
    }

    // Phase E starts with Branded Foods because they have reliable labeled
    // serving sizes and UPC/GTIN support. Foundation/FNDDS need measure-aware
    // detail handling and will be added separately rather than guessing.
    const response = await fetch(`${USDA_BASE}/foods/search?api_key=${encodeURIComponent(USDA_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: term,
        pageSize: upc ? 10 : 20,
        dataType: ["Branded"],
        sortBy: upc ? "publishedDate" : undefined,
        sortOrder: upc ? "desc" : undefined,
      }),
    });

    if (!response.ok) throw new Error(`USDA request failed (${response.status})`);

    const payload = await response.json();
    let foods = (payload.foods || []).map(normalizeBranded);

    if (upc) {
      foods = foods.filter((food: any) => String(food.gtin_upc || "").replace(/\D/g, "") === upc);
      // Duplicate UPCs represent historical product versions. Newest published
      // version is returned first by the USDA sort above.
      foods = foods.slice(0, 1);
    }

    return Response.json(
      { foods },
      { headers: { ...corsHeaders, "Cache-Control": "private, max-age=300" } }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Food search failed" },
      { status: 400, headers: corsHeaders }
    );
  }
});
