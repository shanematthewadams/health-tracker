import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  BookOpen, Brain, Coffee, Droplet, Dumbbell, Flame, Footprints, Heart, Leaf,
  Moon, Smile, Sparkles, Star, Sun, Timer,
} from "lucide-react";
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

function addCalendarDays(dateStr, amount) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function startDateForRange(today, range) {
  return addCalendarDays(today, -(range - 1));
}

function shortDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function numericLabel(value, maxDigits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString(undefined, { maximumFractionDigits: maxDigits });
}

function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatMetricValue(metric, value) {
  if (value == null) return "—";
  if (metric.value_type === "yes_no") return Number(value) === 1 ? "Yes" : "No";
  if (metric.value_type === "duration") return formatDuration(value);
  if (metric.value_type === "rating") return `${numericLabel(value, 1)} / 5`;
  if (metric.value_type === "quantity") return `${numericLabel(value, 2)}${metric.unit ? ` ${metric.unit}` : ""}`;
  return numericLabel(value, 2);
}

export default function CustomTrendsSection({ profileId, profileName, isOwn, today, range, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, cardStyle, headingStyle } = styles;
  const [metrics, setMetrics] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedMetricId, setSelectedMetricId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("with-custom-tracker-saved", refresh);
    return () => window.removeEventListener("with-custom-tracker-saved", refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!profileId || !today || !range) return undefined;

    (async () => {
      setLoading(true);
      setError("");
      const startDate = startDateForRange(today, range);
      const { data: metricRows, error: metricError } = await supabase
        .from("custom_metrics")
        .select("id,profile_id,name,value_type,unit,enabled,sort_order,icon_key,rating_low_label,rating_high_label")
        .eq("profile_id", profileId)
        .eq("enabled", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (metricError) {
        setMetrics([]);
        setEntries([]);
        setError("Custom tracker trends couldn’t be loaded right now.");
        setLoading(false);
        return;
      }

      const visibleMetrics = metricRows || [];
      setMetrics(visibleMetrics);
      if (!visibleMetrics.length) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const { data: entryRows, error: entryError } = await supabase
        .from("custom_metric_entries")
        .select("id,metric_id,profile_id,entry_date,boolean_value,numeric_value")
        .eq("profile_id", profileId)
        .in("metric_id", visibleMetrics.map((metric) => metric.id))
        .gte("entry_date", startDate)
        .lte("entry_date", today)
        .order("entry_date", { ascending: true });

      if (cancelled) return;
      if (entryError) {
        setEntries([]);
        setError("Custom tracker trends couldn’t be loaded right now.");
      } else {
        setEntries(entryRows || []);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [profileId, today, range, revision]);

  useEffect(() => {
    if (!metrics.length) {
      setSelectedMetricId("");
      return;
    }
    if (!metrics.some((metric) => metric.id === selectedMetricId)) setSelectedMetricId(metrics[0].id);
  }, [metrics, selectedMetricId]);

  const selectedMetric = metrics.find((metric) => metric.id === selectedMetricId) || metrics[0] || null;
  const selectedEntries = useMemo(
    () => selectedMetric ? entries.filter((entry) => entry.metric_id === selectedMetric.id) : [],
    [entries, selectedMetric]
  );

  const chartRows = useMemo(() => {
    if (!selectedMetric) return [];
    const byDate = new Map(selectedEntries.map((entry) => [entry.entry_date, entry]));
    const startDate = startDateForRange(today, range);
    const rows = [];
    for (let i = 0; i < range; i += 1) {
      const date = addCalendarDays(startDate, i);
      const entry = byDate.get(date);
      let value = null;
      if (entry) value = selectedMetric.value_type === "yes_no" ? (entry.boolean_value ? 1 : 0) : Number(entry.numeric_value);
      rows.push({ date, label: shortDate(date), value });
    }
    return rows;
  }, [selectedMetric, selectedEntries, today, range]);

  const loggedValues = chartRows.map((row) => row.value).filter((value) => value != null && Number.isFinite(Number(value))).map(Number);
  const average = loggedValues.length ? loggedValues.reduce((sum, value) => sum + value, 0) / loggedValues.length : null;
  const total = loggedValues.reduce((sum, value) => sum + value, 0);
  const yesCount = selectedMetric?.value_type === "yes_no" ? loggedValues.filter((value) => value === 1).length : 0;
  const yesPercent = loggedValues.length ? Math.round((yesCount / loggedValues.length) * 100) : null;
  const SelectedIcon = ICONS[selectedMetric?.icon_key] || Sparkles;

  if (loading && !metrics.length) return null;
  if (!loading && !metrics.length && !error) return null;

  const selectorStyle = (active) => ({
    border: `1px solid ${active ? brand.teal : brand.border}`,
    background: active ? brand.teal : brand.surface,
    color: active ? brand.inkOn : brand.textMuted,
    borderRadius: 999,
    padding: "6px 9px",
    fontSize: 9,
    fontWeight: 800,
    whiteSpace: "nowrap",
    flexShrink: 0,
  });

  return (
    <section style={{ ...cardStyle, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <span aria-hidden="true" style={{ width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 18px" }}>
          <SelectedIcon style={{ width: 15, height: 15, color: brand.teal, display: "block" }} strokeWidth={2} />
        </span>
        <div style={{ ...headingStyle, fontSize: 18, lineHeight: "18px", marginBottom: 0 }}>{isOwn ? "Your trackers" : `${profileName}'s trackers`}</div>
      </div>

      {error ? <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "10px 0 2px" }}>{error}</div> : null}

      {!error && metrics.length > 1 ? (
        <div style={{ display: "flex", gap: 4, overflowX: "auto", padding: "5px 0 4px", WebkitOverflowScrolling: "touch" }}>
          {metrics.map((metric) => (
            <button key={metric.id} type="button" onClick={() => setSelectedMetricId(metric.id)} style={selectorStyle(metric.id === selectedMetric?.id)}>
              {metric.name}
            </button>
          ))}
        </div>
      ) : null}

      {!error && selectedMetric ? (
        <>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 21, fontWeight: 600, color: TEXT, marginTop: metrics.length > 1 ? 7 : 10 }}>{selectedMetric.name}</div>

          {!loggedValues.length ? (
            <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "12px 0 4px" }}>No entries in this {range}-day view yet.</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
                {selectedMetric.value_type === "yes_no" ? (
                  <>
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                      <div style={{ color: TEXT_MUTED, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Yes</div>
                      <div className="num" style={{ color: TEXT, fontSize: 20, fontWeight: 800, marginTop: 3 }}>{yesPercent}%</div>
                      <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 2 }}>{yesCount} of {loggedValues.length} logged days</div>
                    </div>
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                      <div style={{ color: TEXT_MUTED, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Logged days</div>
                      <div className="num" style={{ color: TEXT, fontSize: 20, fontWeight: 800, marginTop: 3 }}>{loggedValues.length}</div>
                      <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 2 }}>in this {range}-day view</div>
                    </div>
                  </>
                ) : selectedMetric.value_type === "rating" ? (
                  <>
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                      <div style={{ color: TEXT_MUTED, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Average</div>
                      <div className="num" style={{ color: TEXT, fontSize: 20, fontWeight: 800, marginTop: 3 }}>{numericLabel(average, 1)} / 5</div>
                      <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 2 }}>{loggedValues.length} logged day{loggedValues.length === 1 ? "" : "s"}</div>
                    </div>
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                      <div style={{ color: TEXT_MUTED, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Scale</div>
                      <div style={{ color: TEXT, fontSize: 12, fontWeight: 800, marginTop: 5 }}>{selectedMetric.rating_low_label || "Low"} → {selectedMetric.rating_high_label || "High"}</div>
                      <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 4 }}>five-point rating</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                      <div style={{ color: TEXT_MUTED, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Average</div>
                      <div className="num" style={{ color: TEXT, fontSize: 20, fontWeight: 800, marginTop: 3 }}>{formatMetricValue(selectedMetric, average)}</div>
                      <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 2 }}>{loggedValues.length} logged day{loggedValues.length === 1 ? "" : "s"}</div>
                    </div>
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                      <div style={{ color: TEXT_MUTED, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Total</div>
                      <div className="num" style={{ color: TEXT, fontSize: 20, fontWeight: 800, marginTop: 3 }}>{formatMetricValue(selectedMetric, total)}</div>
                      <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 2 }}>across logged days</div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ height: 145, marginTop: 13 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {selectedMetric.value_type === "yes_no" || selectedMetric.value_type === "rating" ? (
                    <LineChart data={chartRows} margin={{ top: 6, right: 7, left: -8, bottom: 0 }}>
                      <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={28} />
                      <YAxis
                        tick={{ fill: TEXT_MUTED, fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        width={42}
                        domain={selectedMetric.value_type === "yes_no" ? [0, 1] : [1, 5]}
                        ticks={selectedMetric.value_type === "yes_no" ? [0, 1] : [1, 2, 3, 4, 5]}
                        tickFormatter={(value) => selectedMetric.value_type === "yes_no" ? (value ? "Yes" : "No") : value}
                      />
                      <Tooltip
                        contentStyle={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
                        formatter={(value) => [formatMetricValue(selectedMetric, value), selectedMetric.name]}
                      />
                      <Line type="linear" dataKey="value" stroke={brand.teal} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                    </LineChart>
                  ) : (
                    <BarChart data={chartRows} margin={{ top: 6, right: 7, left: -8, bottom: 0 }}>
                      <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={28} />
                      <YAxis
                        tick={{ fill: TEXT_MUTED, fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        width={42}
                        tickFormatter={(value) => selectedMetric.value_type === "duration" ? formatDuration(value) : numericLabel(value, 1)}
                      />
                      <Tooltip
                        cursor={{ fill: brand.surfaceSoft }}
                        contentStyle={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
                        formatter={(value) => [formatMetricValue(selectedMetric, value), selectedMetric.name]}
                      />
                      <Bar dataKey="value" fill={brand.teal} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.45, marginTop: 5 }}>Blank days are unknown, not zero.</div>
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
