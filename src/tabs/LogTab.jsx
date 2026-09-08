import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import LogTabCore from "./LogTabCore.jsx";
import { brand } from "../brand.jsx";
import { importUsdaFood, looksLikeUpc, searchUsdaFoods } from "../foodSearch.js";

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function barcodeDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function canonicalGtin(value) {
  const digits = barcodeDigits(value);
  if (![8, 12, 13, 14].includes(digits.length)) return digits;
  return digits.padStart(14, "0");
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
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [missingBarcode, setMissingBarcode] = useState("");
  const [manualScanName, setManualScanName] = useState("");
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

  const focusFoodSearch = useCallback(() => {
    window.setTimeout(() => {
      const input = document.querySelector('input[placeholder="Search foods or type a new one"]');
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  }, []);

  const handleBarcodeDetected = useCallback(async (value) => {
    const digits = barcodeDigits(value);
    if (!looksLikeUpc(digits)) return;

    props.clearFoodForm?.();
    props.setSavedSearch?.("");
    setMissingBarcode("");
    setManualScanName("");
    setScanningBarcode(true);

    try {
      const canonical = canonicalGtin(digits);
      const localMatch = [...globalFoods, ...importedFoods].find(
        (food) => food.gtin_upc && canonicalGtin(food.gtin_upc) === canonical
      );

      if (localMatch) {
        props.setSavedSearch?.(digits);
        focusFoodSearch();
        return;
      }

      const cacheKey = `upc:${normalize(digits)}`;
      let foods = searchCache.current.get(cacheKey) || [];

      if (!foods.length) {
        foods = await searchUsdaFoods(digits);
        if (!foods.length) {
          await new Promise((resolve) => window.setTimeout(resolve, 180));
          foods = await searchUsdaFoods(digits);
        }
      }

      if (foods.length) {
        searchCache.current.set(cacheKey, foods);
        setUsdaFoods(foods);
        props.setSavedSearch?.(digits);
        focusFoodSearch();
      } else {
        // A barcode is an identifier, never a sensible fallback food name.
        // Ask the human what the food is instead of creating "025293600270".
        setMissingBarcode(digits);
      }
    } catch (error) {
      console.warn("Barcode lookup unavailable", error);
      setMissingBarcode(digits);
    } finally {
      setScanningBarcode(false);
    }
  }, [focusFoodSearch, globalFoods, importedFoods, props.clearFoodForm, props.setSavedSearch]);

  function setSafeFoodName(value) {
    const clean = String(value || "").trim();
    if (looksLikeUpc(clean)) {
      setMissingBarcode(barcodeDigits(clean));
      setManualScanName("");
      props.setSavedSearch?.("");
      return;
    }
    props.setFoodName?.(value);
  }

  function createManualScannedFood() {
    const name = manualScanName.trim();
    if (!name) return;

    props.clearFoodForm?.();
    props.setFoodName?.(name);
    props.setSelectedSavedFoodId?.(null);
    props.setSaveAsSaved?.(true);
    props.setSavedSearch?.("");
    props.setFoodServingLabel?.("");
    setMissingBarcode("");
    setManualScanName("");

    window.setTimeout(() => {
      document.getElementById("log-food-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  const showScanner = props.logTab === "food" && props.activeCanEdit && !props.editingFoodId;
  const busy = importing || scanningBarcode;

  return (
    <>
      <LogTabCore
        {...props}
        activeCanEdit={props.activeCanEdit && !busy}
        globalFoods={augmentedGlobalFoods}
        chooseSavedFood={chooseFood}
        changeQuantity={changeFoodQuantity}
        setFoodName={setSafeFoodName}
      />

      {scanningBarcode && (
        <div role="status" aria-live="polite" style={{ position: "fixed", left: "50%", bottom: "calc(142px + env(safe-area-inset-bottom))", transform: "translateX(-50%)", zIndex: 90, background: brand.surface, color: brand.text, border: `1px solid ${brand.border}`, borderRadius: 999, padding: "9px 13px", boxShadow: "0 8px 24px rgba(37,36,34,.14)", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
          Looking up barcode…
        </div>
      )}

      {missingBarcode && (
        <div role="dialog" aria-modal="true" aria-label="Add scanned food manually" style={{ position: "fixed", inset: 0, zIndex: 950, background: "rgba(23,24,22,.56)", display: "grid", alignItems: "end", padding: "18px 14px calc(18px + env(safe-area-inset-bottom))" }}>
          <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", background: brand.surface, borderRadius: 18, padding: "18px", boxShadow: "0 18px 60px rgba(0,0,0,.24)" }}>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 23, fontWeight: 600, color: brand.text, lineHeight: 1.08 }}>We couldn’t find that barcode.</div>
            <div style={{ color: brand.textMuted, fontSize: 12, lineHeight: 1.5, marginTop: 7, marginBottom: 14 }}>
              Tell With what the food is. The barcode is an identifier, so we’ll never use <span style={{ fontFamily: "monospace" }}>{missingBarcode}</span> as the food name.
            </div>
            <label style={{ display: "block", color: brand.textMuted, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Food name</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Vegan protein bar"
              value={manualScanName}
              onChange={(event) => setManualScanName(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") createManualScannedFood(); }}
              style={{ width: "100%", minHeight: 46, boxSizing: "border-box", border: `1px solid ${brand.border}`, borderRadius: 10, background: brand.surface, color: brand.text, padding: "11px 12px", fontSize: 16, fontFamily: "'DM Sans', -apple-system, sans-serif" }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={() => { setMissingBarcode(""); setManualScanName(""); }} style={{ minHeight: 44, border: `1px solid ${brand.border}`, borderRadius: 10, background: brand.surfaceSoft, color: brand.text, fontWeight: 700 }}>Cancel</button>
              <button type="button" disabled={!manualScanName.trim()} onClick={createManualScannedFood} style={{ minHeight: 44, border: "none", borderRadius: 10, background: brand.teal, color: brand.inkOn, fontWeight: 700, opacity: manualScanName.trim() ? 1 : .55 }}>Add food</button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <div style={{ position: "fixed", right: 14, bottom: "calc(82px + env(safe-area-inset-bottom))", zIndex: 80 }}>
          <BarcodeScanner onDetected={handleBarcodeDetected} disabled={busy} />
        </div>
      )}
    </>
  );
}
