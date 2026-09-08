import { useEffect, useMemo, useRef, useState } from "react";
import LogTabCore from "./LogTabCore.jsx";
import { importUsdaFood, looksLikeUpc, searchUsdaFoods } from "../foodSearch.js";

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function barcodeDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function toSearchFood(food) {
  const sourceId = String(food.source_id || "");
  const upc = barcodeDigits(food.gtin_upc);
  return {
    ...food,
    id: `usda-${sourceId}`,
    source: "usda",
    source_id: sourceId,
    serving_label: food.serving_description || "1 serving",
    // LogTabCore currently filters only name + brand. Include the barcode in
    // this temporary search representation so a valid UPC result is not
    // fetched successfully and then hidden by the client-side filter.
    brand: [food.brand, upc ? `UPC ${upc}` : null, "USDA FoodData Central"].filter(Boolean).join(" · "),
    _usdaFood: food,
  };
}

function toLocalSearchFood(food) {
  const upc = barcodeDigits(food.gtin_upc);
  if (!upc) return food;
  return {
    ...food,
    brand: [food.brand, `UPC ${upc}`].filter(Boolean).join(" · "),
  };
}

export default function LogTab(props) {
  const {
    savedSearch,
    globalFoods = [],
    chooseSavedFood,
    changeQuantity,
    selectedSavedFoodId,
    setFoodCals,
    setFoodProtein,
    setFoodCarbs,
    setFoodFat,
    setFoodFiber,
  } = props;

  const [usdaFoods, setUsdaFoods] = useState([]);
  const [importedFoods, setImportedFoods] = useState([]);
  const [importing, setImporting] = useState(false);
  const searchSequence = useRef(0);
  const searchCache = useRef(new Map());

  useEffect(() => {
    const clean = String(savedSearch || "").trim();
    const sequence = ++searchSequence.current;

    if (clean.length < 2) {
      setUsdaFoods([]);
      return;
    }

    const cacheKey = `${looksLikeUpc(clean) ? "upc" : "query"}:${normalize(clean)}`;
    const cached = searchCache.current.get(cacheKey);
    if (cached?.length) {
      setUsdaFoods(cached);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        let foods = await searchUsdaFoods(clean);

        // A remote search occasionally returns an empty/transient response.
        // Give it one quiet retry before treating the query as empty.
        if (!foods.length) {
          await new Promise((resolve) => window.setTimeout(resolve, 180));
          if (searchSequence.current !== sequence) return;
          foods = await searchUsdaFoods(clean);
        }

        if (searchSequence.current !== sequence) return;

        if (foods.length) {
          searchCache.current.set(cacheKey, foods);
          setUsdaFoods(foods);
        } else {
          setUsdaFoods([]);
        }
      } catch (error) {
        if (searchSequence.current !== sequence) return;
        console.warn("USDA food search unavailable", error);

        // Never erase a previously successful result set because a later
        // request failed. Search should feel stable, not lottery-adjacent.
        const fallback = searchCache.current.get(cacheKey);
        setUsdaFoods(fallback || []);
      }
    }, looksLikeUpc(clean) ? 50 : 350);

    return () => window.clearTimeout(timer);
  }, [savedSearch]);

  const remoteFoods = useMemo(() => {
    const sourceIds = new Set(globalFoods.map((food) => String(food.source_id || "")).filter(Boolean));
    const localKeys = new Set(globalFoods.map((food) => `${normalize(food.name)}|${normalize(food.brand)}`));

    return usdaFoods
      .filter((food) => !sourceIds.has(String(food.source_id || "")))
      .filter((food) => !localKeys.has(`${normalize(food.name)}|${normalize(food.brand)}`))
      .slice(0, 12)
      .map(toSearchFood);
  }, [usdaFoods, globalFoods]);

  const augmentedGlobalFoods = useMemo(() => {
    const byId = new Map();
    [...globalFoods.map(toLocalSearchFood), ...importedFoods.map(toLocalSearchFood), ...remoteFoods].forEach((food) => {
      if (!byId.has(food.id)) byId.set(food.id, food);
    });
    return [...byId.values()];
  }, [globalFoods, importedFoods, remoteFoods]);

  async function chooseFood(food) {
    if (food?.source !== "usda") {
      chooseSavedFood(food);
      return;
    }

    setImporting(true);
    try {
      const imported = await importUsdaFood(food._usdaFood || food);
      setImportedFoods((current) => current.some((item) => item.id === imported.id) ? current : [...current, imported]);
      chooseSavedFood(imported);
    } catch (error) {
      console.error("Could not import USDA food", error);
      window.alert("We found that food, but couldn’t add it to With. You can still create it manually.");
    } finally {
      setImporting(false);
    }
  }

  function changeFoodQuantity(value) {
    changeQuantity(value);

    const [source, id] = String(selectedSavedFoodId || "").split(":");
    if (source !== "global") return;
    const food = importedFoods.find((item) => item.id === id);
    const quantity = Number(value);
    if (!food || !Number.isFinite(quantity) || quantity <= 0) return;

    const round1 = (number) => String(Math.round(Number(number || 0) * quantity * 10) / 10);
    setFoodCals(round1(food.calories));
    setFoodProtein(round1(food.protein));
    setFoodCarbs(round1(food.carbs));
    setFoodFat(round1(food.fat));
    setFoodFiber(round1(food.fiber));
  }

  return (
    <LogTabCore
      {...props}
      activeCanEdit={props.activeCanEdit && !importing}
      globalFoods={augmentedGlobalFoods}
      chooseSavedFood={chooseFood}
      changeQuantity={changeFoodQuantity}
    />
  );
}
