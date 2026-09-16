import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function localDayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function EditorialLine({
  placement,
  fallback = "",
  showAttribution = true,
  style = {},
  attributionStyle = {},
}) {
  const [item, setItem] = useState(undefined);

  useEffect(() => {
    let cancelled = false;

    async function loadEditorialLine() {
      if (!placement) {
        setItem(null);
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const { data, error } = await supabase
          .from("reflection_quotes")
          .select("id,quote,attribution,quote_kind,placements")
          .eq("active", true)
          .contains("placements", [placement])
          .order("id", { ascending: true });
        if (error) throw error;
        if (cancelled) return;

        const rows = data || [];
        if (!rows.length) {
          setItem(null);
          return;
        }

        const identity = sessionData?.session?.user?.id || "guest";
        const seed = `${identity}:${placement}:${localDayKey()}`;
        setItem(rows[stableHash(seed) % rows.length]);
      } catch (error) {
        console.warn(`Could not load editorial line for ${placement}`, error);
        if (!cancelled) setItem(null);
      }
    }

    loadEditorialLine();
    return () => { cancelled = true; };
  }, [placement]);

  const text = item?.quote || fallback;
  if (!text) return null;

  const attribution = showAttribution && item?.attribution && item.attribution !== "With"
    ? item.attribution
    : "";

  return (
    <div data-editorial-placement={placement} style={style}>
      <div>{text}</div>
      {attribution && (
        <div style={{ fontSize: "0.82em", marginTop: 4, opacity: 0.78, ...attributionStyle }}>
          — {attribution}
        </div>
      )}
    </div>
  );
}
