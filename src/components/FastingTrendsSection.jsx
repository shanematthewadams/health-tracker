import { useEffect, useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

function localDateKey(value) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function formatDuration(minutes) {
  const total = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(total / 60);
  const mins = Math.round(total % 60);
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function average(values) {
  const present = values.filter((value) => value != null && Number.isFinite(Number(value))).map(Number);
  if (!present.length) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

function monthKeysInRange(startDate, endDate) {
  const cursor = new Date(`${startDate.slice(0, 7)}-01T12:00:00Z`);
  const end = new Date(`${endDate.slice(0, 7)}-01T12:00:00Z`);
  const keys = [];
  while (cursor <= end) {
    keys.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

function monthLabel(monthKey) {
  return new Date(`${monthKey}-01T12:00:00Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function calendarCells(monthKey) {
  const first = new Date(`${monthKey}-01T12:00:00Z`);
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
  const leading = first.getUTCDay();
  const cells = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${monthKey}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function alphaHex(hex, alpha) {
  const value = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return brand.surfaceSoft;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function FastingTrendsSection({ profileId, today, range, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, cardStyle } = styles;
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState("duration");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("with-fasting-history-changed", refresh);
    return () => window.removeEventListener("with-fasting-history-changed", refresh);
  }, []);

  useEffect(() => {
    setSelectedCalendarDate(null);
  }, [profileId, range]);

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

  const startDate = useMemo(() => startDateForRange(today, range), [today, range]);
  const rows = useMemo(() => entries.map((entry) => {
    const derivedMinutes = entry.duration_minutes != null
      ? Number(entry.duration_minutes)
      : Math.max(0, Math.floor((new Date(entry.ended_at) - new Date(entry.started_at)) / 60000));
    return {
      id: entry.id,
      date: localDateKey(entry.ended_at),
      label: shortDate(entry.ended_at),
      durationMinutes: derivedMinutes,
      durationHours: Number((derivedMinutes / 60).toFixed(2)),
      goalMinutes: entry.goal_minutes == null ? null : Number(entry.goal_minutes),
      goalReached: entry.goal_reached,
    };
  }), [entries]);

  const averageDurationMinutes = average(rows.map((row) => row.durationMinutes));
  const totalMinutes = rows.reduce((sum, row) => sum + row.durationMinutes, 0);
  const goalRows = rows.filter((row) => row.goalMinutes != null);
  const averageGoalMinutes = average(goalRows.map((row) => row.goalMinutes));
  const averageGoalHours = averageGoalMinutes == null ? null : Number((averageGoalMinutes / 60).toFixed(2));
  const fastDays = new Set(rows.map((row) => row.date));
  const fastDayPercent = Math.round((fastDays.size / range) * 100);
  const reachedRows = goalRows.filter((row) => row.goalReached === true);
  const monthKeys = useMemo(() => monthKeysInRange(startDate, today), [startDate, today]);
  const calendarByDate = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const current = map.get(row.date) || { count: 0, minutes: 0 };
      map.set(row.date, { count: current.count + 1, minutes: current.minutes + row.durationMinutes });
    });
    return map;
  }, [rows]);
  const selectedCalendarFast = selectedCalendarDate ? calendarByDate.get(selectedCalendarDate) : null;

  const toggleStyle = (active) => ({
    border: `1px solid ${active ? brand.teal : brand.border}`,
    background: active ? brand.teal : brand.surface,
    color: active ? brand.inkOn : brand.textMuted,
    borderRadius: 999,
    padding: "6px 9px",
    fontSize: 9,
    fontWeight: 800,
  });

  return (
    <section style={{ ...cardStyle, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span aria-hidden="true" style={{ width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 18px" }}>
            <Timer style={{ width: 15, height: 15, color: metricColors.steps, display: "block" }} strokeWidth={2} />
          </span>
          <div style={{ ...styles.headingStyle, fontSize: 18, lineHeight: "18px", marginBottom: 0 }}>Fasting</div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button type="button" onClick={() => setView("duration")} style={toggleStyle(view === "duration")}>Duration</button>
          <button type="button" onClick={() => setView("calendar")} style={toggleStyle(view === "calendar")}>Calendar</button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "14px 0 6px" }}>Loading fasting history…</div>
      ) : error ? (
        <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "14px 0 6px" }}>{error}</div>
      ) : rows.length === 0 ? (
        <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "14px 0 6px" }}>Completed fasts will appear here as you log them.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px 14px", marginTop: 12 }}>
            {[
              ["Completed fasts", rows.length, `in this ${range}-day view`],
              ["Average duration", formatDuration(averageDurationMinutes), "across completed fasts"],
              ["Total fasted", formatDuration(totalMinutes), "intentional fasting time"],
              ["Days with a fast", `${fastDayPercent}%`, `${fastDays.size} of ${range} days`],
            ].map(([label, value, sub]) => (
              <div key={label} style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 9 }}>
                <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
                <div className="num" style={{ color: TEXT, fontSize: 21, fontWeight: 800, marginTop: 3 }}>{value}</div>
                <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>{sub}</div>
              </div>
            ))}
          </div>

          {averageGoalMinutes != null ? (
            <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 9 }}>
              Average goal: <strong style={{ color: TEXT }}>{formatDuration(averageGoalMinutes)}</strong> across {goalRows.length} goal-based fast{goalRows.length === 1 ? "" : "s"}.
            </div>
          ) : null}

          {view === "duration" ? (
            <>
              <div style={{ height: 155, marginTop: 14 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={{ top: 5, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={20} />
                    <YAxis tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} width={40} tickFormatter={(value) => `${Math.round(value)}h`} />
                    {averageGoalHours != null ? <ReferenceLine y={averageGoalHours} stroke={brand.textSoft} strokeDasharray="4 4" /> : null}
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

              {averageGoalMinutes != null ? (
                <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.45, marginTop: 7 }}>
                  The dashed line shows the average fasting goal set in this view. {reachedRows.length} of {goalRows.length} goal-based fast{goalRows.length === 1 ? "" : "s"} ended at or beyond it.
                </div>
              ) : null}
              <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.45, marginTop: 7 }}>
                Only completed intentional fasts are plotted. Days without a recorded fast are not treated as fasting days.
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "4px 1px 6px", marginTop: 12, WebkitOverflowScrolling: "touch" }}>
                {monthKeys.map((monthKey) => (
                  <div key={monthKey} style={{ minWidth: 232, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 9px 9px", background: brand.surface }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: TEXT, marginBottom: 8 }}>{monthLabel(monthKey)}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 3, marginBottom: 3 }}>
                      {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                        <div key={`${day}-${index}`} style={{ textAlign: "center", color: TEXT_MUTED, fontSize: 8, fontWeight: 800 }}>{day}</div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 3 }}>
                      {calendarCells(monthKey).map((date, index) => {
                        if (!date) return <div key={`blank-${index}`} style={{ height: 34 }} />;
                        const inRange = date >= startDate && date <= today;
                        const fast = inRange ? calendarByDate.get(date) : null;
                        const hasFast = Boolean(fast);
                        const day = Number(date.slice(-2));
                        const detailLabel = hasFast
                          ? `${shortDate(`${date}T12:00:00`)} · ${fast.count > 1 ? `${fast.count} fasts · ${formatDuration(fast.minutes)} total` : formatDuration(fast.minutes)}`
                          : inRange ? `${shortDate(`${date}T12:00:00`)} · no intentional fast recorded` : "";
                        const isSelected = selectedCalendarDate === date;
                        return (
                          <button
                            type="button"
                            key={date}
                            title={detailLabel}
                            aria-label={detailLabel || undefined}
                            aria-pressed={hasFast ? isSelected : undefined}
                            disabled={!hasFast}
                            onClick={() => {
                              if (!hasFast) return;
                              setSelectedCalendarDate((current) => current === date ? null : date);
                            }}
                            style={{
                              height: 34,
                              padding: 0,
                              borderRadius: 7,
                              border: `1px solid ${hasFast ? alphaHex(metricColors.steps, isSelected ? 0.8 : 0.45) : inRange ? BORDER : "transparent"}`,
                              background: hasFast ? alphaHex(metricColors.steps, isSelected ? 0.24 : 0.16) : "transparent",
                              opacity: inRange ? 1 : 0.28,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: hasFast ? "pointer" : "default",
                              font: "inherit",
                            }}
                          >
                            <span className="num" style={{ color: hasFast ? metricColors.steps : TEXT_MUTED, fontSize: 11, fontWeight: hasFast ? 800 : 600 }}>{day}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {selectedCalendarFast ? (
                <div style={{ marginTop: 7, padding: "8px 10px", borderRadius: 8, background: alphaHex(metricColors.steps, 0.1), color: TEXT, fontSize: 11, lineHeight: 1.4 }}>
                  <strong>{shortDate(`${selectedCalendarDate}T12:00:00`)}</strong>
                  <span style={{ color: TEXT_MUTED }}>
                    {selectedCalendarFast.count > 1
                      ? ` · ${selectedCalendarFast.count} fasts · ${formatDuration(selectedCalendarFast.minutes)} total`
                      : ` · ${formatDuration(selectedCalendarFast.minutes)}`}
                  </span>
                </div>
              ) : null}

              <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.45, marginTop: 7 }}>
                Marked days are intentional completed fasts. Tap a marked day to see its duration; on desktop, hover works too. Overnight fasts appear once, on the day they ended.
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
