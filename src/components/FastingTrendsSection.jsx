import { useEffect, useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { brand, metricColors } from "../brand.jsx";
import { supabase } from "../supabase.js";

function startDateForRange(today, range) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (range - 1));
  return date.toISOString().slice(0, 10);
}

function shortDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDuration(minutes) {
  const total = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(total / 60);
  const mins = Math.round(total % 60);
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export default function FastingTrendsSection({ profileId, today, range, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, cardStyle } = styles;
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("with-fasting-history-changed", refresh);
    return () => window.removeEventListener("with-fasting-history-changed", refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!profileId || !today || !range) return undefined;

    (async () => {
      setLoading(true);
      setError("");
      const startDate = startDateForRange(today, range);
      const { data, error: queryError } = await supabase
        .from("fasting_entries")
        .select("id,started_at,ended_at,goal_minutes,duration_minutes,goal_reached")
        .eq("profile_id", profileId)
        .not("ended_at", "is", null)
        .gte("ended_at", `${startDate}T00:00:00`)
        .lte("ended_at", `${today}T23:59:59.999`)
        .order("ended_at", { ascending: true });

      if (cancelled) return;
      if (queryError) {
        setEntries([]);
        setError("Fasting trends couldn’t be loaded right now.");
      } else {
        setEntries(data || []);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [profileId, today, range, revision]);

  const rows = useMemo(() => entries.map((entry) => {
    const derivedMinutes = entry.duration_minutes != null
      ? Number(entry.duration_minutes)
      : Math.max(0, Math.floor((new Date(entry.ended_at) - new Date(entry.started_at)) / 60000));
    return {
      id: entry.id,
      label: shortDate(entry.ended_at),
      durationMinutes: derivedMinutes,
      durationHours: Number((derivedMinutes / 60).toFixed(2)),
      goalMinutes: entry.goal_minutes == null ? null : Number(entry.goal_minutes),
      goalReached: entry.goal_reached,
    };
  }), [entries]);

  const typicalMinutes = median(rows.map((row) => row.durationMinutes));
  const goalRows = rows.filter((row) => row.goalMinutes != null);
  const reachedRows = goalRows.filter((row) => row.goalReached === true);

  return (
    <section style={{ ...cardStyle, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <span aria-hidden="true" style={{ width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 18px" }}>
          <Timer style={{ width: 15, height: 15, color: metricColors.steps, display: "block" }} strokeWidth={2} />
        </span>
        <div style={{ ...styles.headingStyle, fontSize: 18, lineHeight: "18px", marginBottom: 0 }}>Fasting</div>
      </div>

      {loading ? (
        <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "14px 0 6px" }}>Loading fasting history…</div>
      ) : error ? (
        <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "14px 0 6px" }}>{error}</div>
      ) : rows.length === 0 ? (
        <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "14px 0 6px" }}>Completed fasts will appear here as you log them.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 10 }}>
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 9 }}>
              <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Completed fasts</div>
              <div className="num" style={{ color: TEXT, fontSize: 22, fontWeight: 800, marginTop: 3 }}>{rows.length}</div>
              <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>in this {range}-day view</div>
            </div>
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 9 }}>
              <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Typical duration</div>
              <div className="num" style={{ color: TEXT, fontSize: 22, fontWeight: 800, marginTop: 3 }}>{formatDuration(typicalMinutes)}</div>
              <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>median of completed fasts</div>
            </div>
          </div>

          <div style={{ height: 150, marginTop: 14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 5, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} width={40} tickFormatter={(value) => `${Math.round(value)}h`} />
                <Tooltip
                  cursor={{ fill: brand.surfaceSoft }}
                  contentStyle={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
                  formatter={(_, __, item) => {
                    const row = item?.payload;
                    if (!row) return ["", "Duration"];
                    const goal = row.goalMinutes == null ? "" : ` · goal ${formatDuration(row.goalMinutes)}`;
                    return [`${formatDuration(row.durationMinutes)}${goal}`, "Completed fast"];
                  }}
                />
                <Bar dataKey="durationHours" fill={metricColors.steps} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {goalRows.length > 0 ? (
            <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.45, marginTop: 8 }}>
              {goalRows.length} fast{goalRows.length === 1 ? "" : "s"} had a time goal. {reachedRows.length} ended at or beyond that goal.
            </div>
          ) : null}

          <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.45, marginTop: 7 }}>
            Only completed fasts are plotted. Days without a fast are left blank rather than counted as zero.
          </div>
        </>
      )}
    </section>
  );
}
