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

function canonicalGtin(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return digits;
  return digits.padStart(14, "0");
}

function gtinSearchTerms(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return digits ? [digits] : [];

  const canonical = digits.padStart(14, "0");
  const terms = new Set<string>([digits, canonical]);

  // The same trade item may appear as UPC-A (12), EAN-13 (13), or GTIN-14
  // depending on the source. USDA search is textual, so query the equivalent
  // representations instead of only normalizing after results come back.
  if (digits.length === 12) terms.add(`0${digits}`);
  if (digits.length === 13 && digits.startsWith("0")) terms.add(digits.slice(1));
  if (digits.length === 14) {
    if (digits.startsWith("0")) terms.add(digits.slice(1));
    if (digits.startsWith("00")) terms.add(digits.slice(2));
  }

  return [...terms].filter(Boolean);
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

async function searchUsda(term: string, isUpc: boolean) {
  const response = await fetch(`${USDA_BASE}/foods/search?api_key=${encodeURIComponent(USDA_KEY!)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: term,
      pageSize: isUpc ? 20 : 20,
      dataType: ["Branded"],
      sortBy: isUpc ? "publishedDate" : undefined,
      sortOrder: isUpc ? "desc" : undefined,
    }),
  });

  if (!response.ok) throw new Error(`USDA request failed (${response.status})`);
  return response.json();
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
    let rawFoods: any[] = [];

    if (upc) {
      const requestedGtin = canonicalGtin(upc);
      const seen = new Set<string>();

      for (const searchTerm of gtinSearchTerms(upc)) {
        const payload = await searchUsda(searchTerm, true);
        for (const food of payload.foods || []) {
          const id = String(food.fdcId || "");
          if (!seen.has(id)) {
            seen.add(id);
            rawFoods.push(food);
          }
        }

        // Stop as soon as USDA returns an exact equivalent GTIN. This keeps
        // barcode lookup fast while still handling alternate GTIN formatting.
        if (rawFoods.some((food: any) => canonicalGtin(food.gtinUpc) === requestedGtin)) break;
      }
    } else {
      const payload = await searchUsda(query, false);
      rawFoods = payload.foods || [];
    }

    let foods = rawFoods.map(normalizeBranded);

    if (upc) {
      const requestedGtin = canonicalGtin(upc);
      foods = foods
        .filter((food: any) => canonicalGtin(food.gtin_upc) === requestedGtin)
        .sort((a: any, b: any) => String(b.published_date || "").localeCompare(String(a.published_date || "")))
        .slice(0, 1);
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
