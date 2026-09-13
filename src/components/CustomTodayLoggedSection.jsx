import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Brain, Coffee, Droplet, Dumbbell, Flame, Footprints, Heart, Leaf, Moon, Smile, Sparkles, Star, Sun, Timer } from "lucide-react";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";

const ICONS = {
  sparkles: Sparkles,
  heart: Heart,
  brain: Brain,
  book_open: BookOpen,
  leaf: Leaf,
  moon: Moon,
  sun: Sun,
  smile: Smile,
  flame: Flame,
  coffee: Coffee,
  dumbbell: Dumbbell,
  footprints: Footprints,
  droplet: Droplet,
  timer: Timer,
  star: Star,
};

function formatValue(metric, entry) {
  if (metric.value_type === "yes_no") return entry.boolean_value ? "Yes" : "No";
  const value = Number(entry.numeric_value);
  if (metric.value_type === "duration") return `${value:g} min`.replace(":g", "");
  if (metric.value_type === "quantity") return `${value}${metric.unit ? ` ${metric.unit}` : ""}`;
  if (metric.value_type === "rating") return `${value} / 5`;
  return value.toLocaleString();
}

function ratingSub(metric, entry) {
  if (metric.value_type !== "rating") return "";
  const value = Number(entry.numeric_value);
  if (value === 1 && metric.rating_low_label) return metric.rating_low_label;
  if (value === 5 && metric.rating_high_label) return metric.rating_high_label;
  if (metric.rating_low_label && metric.rating_high_label) return `${metric.rating_low_label} → ${metric.rating_high_label}`;
  return "5-point scale";
}

export default function CustomTodayLoggedSection({ activeUser, profileNameForProfile, selectedDate, styles }) {
  const { BORDER, TEXT, TEXT_MUTED } = styles;
  const [metrics, setMetrics] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeUser || !selectedDate) return;
    setLoading(true);

    const { data: metricRows, error: metricError } = await supabase
      .from("custom_metrics")
      .select("id,profile_id,name,value_type,unit,sort_order,icon_key,rating_low_label,rating_high_label")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (metricError) {
      setMetrics([]);
      setEntries([]);
      setLoading(false);
      return;
    }

    const activeMetrics = (metricRows || []).filter((metric) => {
      const name = profileNameForProfile?.(metric.profile_id) || metric.profile_id;
      return name === activeUser;
    });
    setMetrics(activeMetrics);

    if (!activeMetrics.length) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const { data: entryRows } = await supabase
      .from("custom_metric_entries")
      .select("id,metric_id,profile_id,entry_date,boolean_value,numeric_value,updated_at")
      .eq("entry_date", selectedDate)
      .in("metric_id", activeMetrics.map((metric) => metric.id));

    setEntries(entryRows || []);
    setLoading(false);
  }, [activeUser, profileNameForProfile, selectedDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("with-custom-tracker-saved", refresh);
    return () => window.removeEventListener("with-custom-tracker-saved", refresh);
  }, [load]);

  const rows = useMemo(() => {
    const byMetric = Object.fromEntries(entries.map((entry) => [entry.metric_id, entry]));
    return metrics.map((metric) => ({ metric, entry: byMetric[metric.id] })).filter((row) => row.entry);
  }, [metrics, entries]);

  if (loading || !rows.length) return null;

  return (
    <section style={{ marginTop: 4, marginBottom: 24 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".11em", fontWeight: 800, color: TEXT_MUTED }}>My trackers</div>
      <div style={{ height: 3, width: 46, background: brand.teal, marginTop: 7 }} />
      <div style={{ marginTop: 10 }}>
        {rows.map(({ metric, entry }) => {
          const Icon = ICONS[metric.icon_key] || Sparkles;
          return (
            <div key={metric.id} style={{ display: "grid", gridTemplateColumns: "22px 1fr auto", alignItems: "center", gap: 10, borderBottom: `1px solid ${BORDER}`, padding: "12px 0" }}>
              <Icon style={{ width: 16, height: 16, color: brand.teal }} strokeWidth={2} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: ".05em" }}>{metric.name}</div>
                {ratingSub(metric, entry) && <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{ratingSub(metric, entry)}</div>}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>{formatValue(metric, entry)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
