import { useEffect, useMemo, useState } from "react";
import { brand } from "../brand.jsx";
import { importUsdaFood, looksLikeUpc, searchUsdaFoods } from "../foodSearch.js";

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function FoodButton({ food, sourceLabel, onChoose, busy, styles }) {
  const { BORDER, TEXT, TEXT_MUTED } = styles;
  return (
    <button
      type="button"
      disabled={busy}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onChoose}
      style={{ textAlign: "left", background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: "9px 10px", minWidth: 0, opacity: busy ? 0.62 : 1 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{food.name}</span>
        <span className="num" style={{ color: TEXT_MUTED, fontSize: 11, flexShrink: 0 }}>{Math.round(Number(food.calories || 0))} cal</span>
      </div>
      <div className="num" style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {food.serving_label || food.serving_description || "1 serving"} · {Math.round(Number(food.fat || 0))}g fat · {Math.round(Number(food.carbs || 0))}g carbs · {Math.round(Number(food.fiber || 0))}g fiber · {Math.round(Number(food.protein || 0))}g protein
      </div>
      {(food.brand || sourceLabel) && <div style={{ color: TEXT_MUTED, fontSize: 9, marginTop: 2 }}>{[food.brand, sourceLabel].filter(Boolean).join(" · ")}</div>}
    </button>
  );
}

export default function FoodSearchResults({
  query,
  localResults,
  recentMode,
  chooseLocalFood,
  onImportedFood,
  onCreate,
  styles,
}) {
  const { BORDER, TEXT, TEXT_MUTED, SURFACE_2 } = styles;
  const clean = String(query || "").trim();
  const [usdaFoods, setUsdaFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setError("");

    if (clean.length < 2) {
      setUsdaFoods([]);
      setLoading(false);
      return () => { cancelled = true; };
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const foods = await searchUsdaFoods(clean);
        if (!cancelled) setUsdaFoods(foods);
      } catch (e) {
        if (!cancelled) {
          setUsdaFoods([]);
          setError("More food results aren’t available right now. You can still use a With food or create one manually.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, looksLikeUpc(clean) ? 50 : 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [clean]);

  const visibleUsda = useMemo(() => {
    const localSourceIds = new Set((localResults || []).map((food) => String(food.source_id || "")).filter(Boolean));
    const localKeys = new Set((localResults || []).map((food) => `${normalize(food.name)}|${normalize(food.brand)}`));
    return usdaFoods.filter((food) => {
      if (localSourceIds.has(String(food.source_id || ""))) return false;
      return !localKeys.has(`${normalize(food.name)}|${normalize(food.brand)}`);
    }).slice(0, 12);
  }, [usdaFoods, localResults]);

  async function chooseUsda(food) {
    setImporting(food.source_id);
    setError("");
    try {
      const imported = await importUsdaFood(food);
      onImportedFood(imported);
    } catch (e) {
      setError("We found that food, but couldn’t add it to With. Try again.");
    } finally {
      setImporting(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6, maxHeight: 330, overflowY: "auto", overflowX: "hidden", paddingRight: 5 }}>
      {(localResults || []).map((food) => (
        <FoodButton key={`${food.source || "global"}-${food.id}`} food={food} onChoose={() => chooseLocalFood(food)} styles={styles} />
      ))}

      {!recentMode && loading && <div style={{ color: TEXT_MUTED, fontSize: 11, padding: "6px 3px" }}>{looksLikeUpc(clean) ? "Looking up barcode…" : "Checking more foods…"}</div>}

      {!recentMode && visibleUsda.length > 0 && <>
        <div style={{ color: TEXT_MUTED, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", padding: "5px 3px 0" }}>More foods</div>
        {visibleUsda.map((food) => (
          <FoodButton
            key={`usda-${food.source_id}`}
            food={food}
            sourceLabel="USDA FoodData Central"
            busy={importing === food.source_id}
            onChoose={() => chooseUsda(food)}
            styles={styles}
          />
        ))}
      </>}

      {!recentMode && clean && !loading && localResults.length === 0 && visibleUsda.length === 0 && !error && (
        <div style={{ color: TEXT_MUTED, fontSize: 11, padding: "2px 3px" }}>No matching foods yet.</div>
      )}

      {error && <div style={{ color: brand.warn, background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 10, lineHeight: 1.4, padding: "8px 9px" }}>{error}</div>}

      {!recentMode && clean && (
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onCreate} style={{ width: "100%", textAlign: "left", background: "transparent", border: `1px dashed ${brand.teal}`, color: TEXT, borderRadius: 8, padding: "10px 11px", fontSize: 12, fontWeight: 700 }}>+ Create “{clean}”</button>
      )}

      {recentMode && localResults.length === 0 && <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "8px 3px" }}>No recent foods yet. Search for something or create your first one.</div>}
    </div>
  );
}
