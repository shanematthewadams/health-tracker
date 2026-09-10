import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from "recharts";
import { Footprints, Droplet, Dumbbell, Utensils, Scale } from "lucide-react";
import { brand, metricColors } from "../brand.jsx";

function shortDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function addCalendarDays(dateStr, amount) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

function lastNDays(n, today, offset = 0) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) days.push(addCalendarDays(today, -(i + offset)));
  return days;
}

function average(values) {
  const present = values.filter((v) => v != null && Number.isFinite(Number(v))).map(Number);
  if (!present.length) return null;
  return present.reduce((sum, v) => sum + v, 0) / present.length;
}

function fastingTouchesDate(fast, dateStr) {
  const dayStart = new Date(dateStr + "T00:00:00");
  const dayEnd = new Date(dateStr + "T23:59:59.999");
  const started = new Date(fast.startedAt);
  const ended = fast.endedAt ? new Date(fast.endedAt) : new Date();
  return started <= dayEnd && ended >= dayStart;
}

function dayRows(user, days) {
  return days.map((date) => {
    const foods = user.foods.filter((f) => f.date === date);
    const activities = user.activities.filter((a) => a.date === date);
    const waterEntries = user.water.filter((w) => w.date === date);
    const water = waterEntries.reduce((sum, w) => sum + w.ounces, 0);
    const stepsEntry = user.steps.find((s) => s.date === date);
    const fastingDay = (user.fasts || []).some((fast) => fastingTouchesDate(fast, date));
    const nutrition = (key) => foods.length ? foods.reduce((sum, f) => sum + Number(f[key] || 0), 0) : fastingDay ? 0 : null;

    return {
      date,
      label: shortDate(date),
      steps: stepsEntry?.count ?? null,
      water: waterEntries.length ? water : null,
      activity: activities.length ? activities.reduce((sum, a) => sum + a.caloriesBurned, 0) : null,
      active: activities.length ? 1 : 0,
      calories: nutrition("calories"),
      protein: nutrition("protein"),
      carbs: nutrition("carbs"),
      fat: nutrition("fat"),
      fiber: nutrition("fiber"),
    };
  });
}

function buildTrendData(user, today, range) {
  const recent = dayRows(user, lastNDays(range, today));
  const previous = dayRows(user, lastNDays(range, today, range));
  const activeDays = recent.filter((d) => d.active).length;
  const previousActiveDays = previous.filter((d) => d.active).length;
  const avg = (rows, key) => average(rows.map((d) => d[key]));
  const count = (rows, key) => rows.filter((d) => d[key] != null).length;
  return {
    recent,
    previous,
    stepAvg: avg(recent, "steps"),
    previousStepAvg: avg(previous, "steps"),
    stepLoggedDays: count(recent, "steps"),
    waterAvg: avg(recent, "water"),
    previousWaterAvg: avg(previous, "water"),
    waterLoggedDays: count(recent, "water"),
    activeDaysPerWeek: activeDays / range * 7,
    previousActiveDaysPerWeek: previousActiveDays / range * 7,
    calorieAvg: avg(recent, "calories"),
    previousCalorieAvg: avg(previous, "calories"),
    nutritionLoggedDays: count(recent, "calories"),
    proteinAvg: avg(recent, "protein"),
    previousProteinAvg: avg(previous, "protein"),
    carbsAvg: avg(recent, "carbs"),
    previousCarbsAvg: avg(previous, "carbs"),
    fatAvg: avg(recent, "fat"),
    previousFatAvg: avg(previous, "fat"),
    fiberAvg: avg(recent, "fiber"),
    previousFiberAvg: avg(previous, "fiber"),
  };
}

function rollingWeightRows(user, today, range) {
  const visibleDays = lastNDays(range, today);
  return visibleDays.map((date) => {
    const start = addCalendarDays(date, -6);
    const entries = user.weights.filter((w) => w.date >= start && w.date <= date);
    return {
      date,
      label: shortDate(date),
      weight: entries.length ? Number((entries.reduce((sum, w) => sum + w.weight, 0) / entries.length).toFixed(1)) : null,
      sampleCount: entries.length,
    };
  }).filter((row) => row.weight != null);
}

function actualWeightRows(user, today, range) {
  const visible = new Set(lastNDays(range, today));
  return [...user.weights]
    .filter((w) => visible.has(w.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({ date: w.date, label: shortDate(w.date), weight: Number(w.weight) }));
}

function weightDataRows(user, today, range) {
  const rollingByDate = new Map(rollingWeightRows(user, today, range).map((row) => [row.date, row.weight]));
  const actualByDate = new Map(user.weights.map((w) => [w.date, Number(w.weight)]));
  return lastNDays(range, today).slice().reverse().map((date) => ({
    date,
    label: shortDate(date),
    actual: actualByDate.get(date) ?? null,
    rolling: rollingByDate.get(date) ?? null,
  }));
}

function weightPeriodChange(user, today, range) {
  const rows = rollingWeightRows(user, today, range * 2);
  const currentStart = addCalendarDays(today, -(range - 1));
  const previousStart = addCalendarDays(today, -(range * 2 - 1));
  const current = rows.filter((r) => r.date >= currentStart);
  const previous = rows.filter((r) => r.date >= previousStart && r.date < currentStart);
  if (!current.length || !previous.length) return null;
  return Number((current[current.length - 1].weight - previous[previous.length - 1].weight).toFixed(1));
}

function actualWeightChange(user, today, range) {
  const rows = actualWeightRows(user, today, range);
  if (rows.length < 2) return null;
  return Number((rows.at(-1).weight - rows[0].weight).toFixed(1));
}

function comparisonText(current, previous, unit = "", threshold = 0) {
  if (current == null || previous == null) return "More history will make this pattern clearer.";
  const diff = current - previous;
  if (Math.abs(diff) <= threshold) return "About the same as the previous period";
  const amount = Math.abs(diff);
  const formatted = unit === "" ? Math.round(amount).toLocaleString() : Number(amount.toFixed(1)).toLocaleString();
  return `${diff > 0 ? "↑" : "↓"} ${formatted}${unit} from the previous period`;
}

function stableHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const OBSERVATION_HEADINGS = [
  "Something worth noticing",
  "A pattern taking shape",
  "Lately…",
  "One thing that stood out",
  "A little perspective",
];

function metricTarget(user, key) {
  const targets = user.targets || {};
  if (key === "steps") return targets.steps ?? null;
  if (key === "water") return targets.water ?? null;
  if (key === "calories") return targets.calories ?? null;
  if (key === "protein") return targets.protein ?? null;
  if (key === "carbs") return targets.carbs ?? null;
  if (key === "fat") return targets.fat ?? null;
  if (key === "fiber") return targets.fiberMin ?? null;
  return null;
}

function observationCandidates(user, today) {
  const candidates = [];
  const windows = [7, 14, 30, 90];

  windows.forEach((range) => {
    const trend = buildTrendData(user, today, range);
    const weightChange = weightPeriodChange(user, today, range);
    const weightRows = rollingWeightRows(user, today, range);
    const latestWeight = weightRows.at(-1)?.weight;
    const latestActual = [...user.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.weight;

    if (weightChange != null && Math.abs(weightChange) >= 0.4) {
      candidates.push({
        key: `weight-change-${range}`,
        metric: "weight",
        score: 74 + Math.min(18, Math.abs(weightChange) * 4) + (range === 30 ? 5 : 0),
        text: `Your rolling weight trend has moved ${Math.abs(weightChange).toFixed(1)} lb ${weightChange < 0 ? "down" : "up"} over the last ${range} days. Daily weigh-ins may bounce around more than the longer pattern does.`,
      });
    }

    if (latestWeight != null && latestActual != null && Math.abs(latestActual - latestWeight) >= 1 && range === 30) {
      candidates.push({
        key: "weight-perspective",
        metric: "weight",
        score: 92 + Math.min(6, Math.abs(latestActual - latestWeight)),
        text: `Your latest weigh-in is ${Math.abs(latestActual - latestWeight).toFixed(1)} lb ${latestActual > latestWeight ? "above" : "below"} your rolling average. One day can move around more than the trend does.`,
      });
    }

    const configs = [
      ["steps", trend.stepAvg, trend.previousStepAvg, 350, (v) => Math.round(v).toLocaleString(), "steps a day"],
      ["water", trend.waterAvg, trend.previousWaterAvg, 4, (v) => `${Math.round(v)} oz`, "of water a day"],
      ["protein", trend.proteinAvg, trend.previousProteinAvg, 7, (v) => `${Math.round(v)}g`, "of protein a day"],
      ["calories", trend.calorieAvg, trend.previousCalorieAvg, 100, (v) => `${Math.round(v).toLocaleString()} calories`, "a day"],
      ["carbs", trend.carbsAvg, trend.previousCarbsAvg, 15, (v) => `${Math.round(v)}g`, "of carbs a day"],
      ["fat", trend.fatAvg, trend.previousFatAvg, 8, (v) => `${Math.round(v)}g`, "of fat a day"],
      ["fiber", trend.fiberAvg, trend.previousFiberAvg, 4, (v) => `${Math.round(v)}g`, "of fiber a day"],
    ];

    configs.forEach(([key, current, previous, threshold, format, phrase]) => {
      if (current == null || previous == null) return;
      const diff = current - previous;
      if (Math.abs(diff) < threshold) return;
      const relative = Math.abs(diff) / Math.max(Math.abs(previous), 1);
      const target = metricTarget(user, key);
      candidates.push({
        key: `${key}-change-${range}`,
        metric: key,
        score: 55 + Math.min(24, relative * 100) + (target ? 6 : 0) + (range === 14 || range === 30 ? 4 : 0),
        text: `Over the last ${range} days, you’ve averaged about ${format(current)} ${phrase}. That’s ${format(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than the ${range} days before.`,
      });
    });

    if (trend.activeDaysPerWeek != null && trend.previousActiveDaysPerWeek != null) {
      const diff = trend.activeDaysPerWeek - trend.previousActiveDaysPerWeek;
      if (Math.abs(diff) >= 0.45) {
        candidates.push({
          key: `activity-frequency-${range}`,
          metric: "activity",
          score: 66 + Math.min(18, Math.abs(diff) * 8) + (range === 14 || range === 30 ? 4 : 0),
          text: `You’ve logged activity about ${trend.activeDaysPerWeek.toFixed(1)} days a week over the last ${range} days, compared with ${trend.previousActiveDaysPerWeek.toFixed(1)} days a week in the period before.`,
        });
      }
    }
  });

  const recent7 = buildTrendData(user, today, 7);
  const recent30 = buildTrendData(user, today, 30);
  [
    ["steps", recent7.stepAvg, recent30.stepAvg, 500, (v) => Math.round(v).toLocaleString(), "steps"],
    ["water", recent7.waterAvg, recent30.waterAvg, 6, (v) => `${Math.round(v)} oz`, "water"],
    ["protein", recent7.proteinAvg, recent30.proteinAvg, 9, (v) => `${Math.round(v)}g`, "protein"],
  ].forEach(([key, shortAvg, longAvg, threshold, format, label]) => {
    if (shortAvg == null || longAvg == null || Math.abs(shortAvg - longAvg) < threshold) return;
    candidates.push({
      key: `${key}-recent-vs-usual`,
      metric: key,
      score: 86,
      text: `Your ${label} has been ${shortAvg > longAvg ? "higher" : "lower"} this week than your recent monthly pattern: about ${format(shortAvg)} a day versus ${format(longAvg)}.`,
    });
  });

  const consistencyConfigs = [
    ["steps", recent30.recent.map((d) => d.steps).filter((v) => v != null), 0.16, (v) => Math.round(v).toLocaleString(), "steps"],
    ["water", recent30.recent.map((d) => d.water).filter((v) => v != null), 0.14, (v) => `${Math.round(v)} oz`, "water"],
    ["protein", recent30.recent.map((d) => d.protein).filter((v) => v != null), 0.16, (v) => `${Math.round(v)}g`, "protein"],
  ];
  consistencyConfigs.forEach(([key, values, maxCv, format, label]) => {
    if (values.length < 8) return;
    const avg = average(values);
    const variance = average(values.map((v) => (v - avg) ** 2));
    const cv = Math.sqrt(variance) / Math.max(Math.abs(avg), 1);
    if (cv <= maxCv) {
      candidates.push({
        key: `${key}-consistency`,
        metric: key,
        score: 62 + Math.round((maxCv - cv) * 100),
        text: `Your ${label} has been especially steady lately, averaging about ${format(avg)} on the days you logged it over the last 30 days.`,
      });
    }
  });

  return candidates;
}

function chooseDailyObservation(user, today, identitySeed) {
  const candidates = observationCandidates(user, today);
  const seed = stableHash(`${identitySeed}|${today}|with-trends-observation`);

  if (!candidates.length) {
    return {
      heading: OBSERVATION_HEADINGS[seed % OBSERVATION_HEADINGS.length],
      text: `There isn’t quite enough history for a strong pattern yet. Keep logging what matters to you and With will start noticing what changes.`,
    };
  }

  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const topScore = sorted[0].score;
  let pool = sorted.filter((candidate) => candidate.score >= topScore - 14).slice(0, 7);
  const metricOrder = ["weight", "steps", "activity", "water", "protein", "calories", "fiber", "carbs", "fat"];
  const preferredMetric = metricOrder[seed % metricOrder.length];
  const preferred = pool.filter((candidate) => candidate.metric === preferredMetric);
  if (preferred.length) pool = [...preferred, ...pool.filter((candidate) => candidate.metric !== preferredMetric)];

  const observation = pool[seed % Math.min(pool.length, 4)];
  return {
    heading: OBSERVATION_HEADINGS[(seed >>> 4) % OBSERVATION_HEADINGS.length],
    text: observation.text,
  };
}

function DailyObservation({ user, today, profileKey, profileColorFor, styles }) {
  const { TEXT, TEXT_MUTED, cardStyle } = styles;
  const observation = chooseDailyObservation(user, today, profileKey);
  return (
    <section style={{ ...cardStyle, background: brand.surfaceSoft, borderColor: brand.border, borderTop: `3px solid ${profileColorFor(profileKey)}`, marginBottom: 18, padding: "1.05rem 1.1rem" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 7 }}>{observation.heading}</div>
      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 20, fontWeight: 600, fontStyle: "italic", lineHeight: 1.35, color: TEXT }}>{observation.text}</div>
    </section>
  );
}

function SectionHeading({ icon: Icon, color, children, styles }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
      <span aria-hidden="true" style={{ width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 18px" }}>
        <Icon style={{ width: 15, height: 15, color, display: "block" }} strokeWidth={2} />
      </span>
      <div style={{ ...styles.headingStyle, fontSize: 18, lineHeight: "18px", marginBottom: 0 }}>{children}</div>
    </div>
  );
}

function MiniBarTrend({ data, dataKey, color, target, suffix, styles }) {
  const { BORDER, TEXT_MUTED } = styles;
  const values = data.map((d) => d[dataKey]).filter((v) => v != null);
  if (!values.length) return <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "22px 0 8px" }}>More logged days will make this trend visible.</div>;
  return (
    <div style={{ height: 112, marginTop: 10 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 4, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${Math.round(v)}${suffix || ""}`} />
          {target ? <ReferenceLine y={target} stroke={brand.textSoft} strokeDasharray="4 4" /> : null}
          <Tooltip cursor={{ fill: brand.surfaceSoft }} contentStyle={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }} formatter={(v) => [`${Math.round(v).toLocaleString()}${suffix || ""}`, "Logged"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ""} />
          <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeightDataTable({ user, today, range, styles }) {
  const { BORDER, TEXT_MUTED } = styles;
  const rows = weightDataRows(user, today, range);
  return (
    <div style={{ marginTop: 14, borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "76px 1fr 1fr", gap: 8, padding: "9px 2px 7px", color: TEXT_MUTED, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>
        <div>Date</div><div>Weight</div><div>7-day avg</div>
      </div>
      <div style={{ maxHeight: range === 90 ? 360 : 320, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {rows.map((row) => (
          <div key={row.date} style={{ display: "grid", gridTemplateColumns: "76px 1fr 1fr", gap: 8, alignItems: "center", borderTop: `1px solid ${BORDER}`, padding: "9px 2px", fontSize: 11 }}>
            <div style={{ color: TEXT_MUTED }}>{row.label}</div>
            <div className="num" style={{ fontWeight: row.actual != null ? 800 : 600, color: row.actual != null ? undefined : TEXT_MUTED }}>
              {row.actual != null ? `${row.actual.toFixed(1)} lb` : <span style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", fontWeight: 600 }}>Not logged · add from Log</span>}
            </div>
            <div className="num" style={{ color: row.rolling != null ? undefined : TEXT_MUTED }}>{row.rolling != null ? `${row.rolling.toFixed(1)} lb` : "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndividualTrends({ profileKey, profileNameFor, user, today, range, goalInfoFor, profileColorFor, styles }) {
  const { BORDER, TEXT_MUTED, cardStyle } = styles;
  const trend = buildTrendData(user, today, range);
  const gi = goalInfoFor(profileKey);
  const storageKey = `with-weight-display-${profileKey}`;
  const [weightDisplay, setWeightDisplayState] = useState(() => {
    try { return localStorage.getItem(storageKey) || "average"; } catch { return "average"; }
  });
  const [weightView, setWeightView] = useState("chart");
  const setWeightDisplay = (next) => {
    setWeightDisplayState(next);
    try { localStorage.setItem(storageKey, next); } catch { /* local preference only */ }
  };
  const rollingRows = rollingWeightRows(user, today, range);
  const measurementRows = actualWeightRows(user, today, range);
  const weightRows = weightDisplay === "average" ? rollingRows : measurementRows;
  const latestActual = [...user.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.weight ?? null;
  const headlineWeight = weightDisplay === "average" ? gi?.latest : latestActual;
  const weightChange = weightDisplay === "average" ? weightPeriodChange(user, today, range) : actualWeightChange(user, today, range);

  const targets = user.targets || {};
  const nutrition = [
    ["Calories", "calories", trend.calorieAvg, trend.previousCalorieAvg, targets.calories, " cal"],
    ["Protein", "protein", trend.proteinAvg, trend.previousProteinAvg, targets.protein, "g"],
    ["Carbs", "carbs", trend.carbsAvg, trend.previousCarbsAvg, targets.carbs, "g"],
    ["Fat", "fat", trend.fatAvg, trend.previousFatAvg, targets.fat, "g"],
    ["Fiber", "fiber", trend.fiberAvg, trend.previousFiberAvg, targets.fiberMin, "g"],
  ].filter(([, , value]) => value != null);

  const toggleStyle = (active) => ({ border: `1px solid ${active ? brand.teal : brand.border}`, background: active ? brand.teal : brand.surface, color: active ? brand.inkOn : brand.textMuted, borderRadius: 999, padding: "6px 9px", fontSize: 9, fontWeight: 800 });

  return (
    <>
      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <SectionHeading icon={Scale} color={metricColors.weight} styles={styles}>Weight</SectionHeading>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", margin: "8px 0 4px" }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setWeightDisplay("average")} style={toggleStyle(weightDisplay === "average")}>7-day average</button>
            <button onClick={() => setWeightDisplay("measurements")} style={toggleStyle(weightDisplay === "measurements")}>Measurements</button>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setWeightView("chart")} style={toggleStyle(weightView === "chart")}>Chart</button>
            <button onClick={() => setWeightView("data")} style={toggleStyle(weightView === "data")}>Data</button>
          </div>
        </div>

        {headlineWeight != null ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "5px 9px", marginTop: 8 }}>
              <div className="num" style={{ fontSize: 27, fontWeight: 800 }}>{Number(headlineWeight).toFixed(1)} lb</div>
              <div style={{ color: TEXT_MUTED, fontSize: 11 }}>{weightDisplay === "average" ? "7-day average" : "latest measurement"}</div>
            </div>
            <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 3 }}>
              {weightChange == null ? "More history will make the longer trend clearer." : `${weightChange > 0 ? "↑" : weightChange < 0 ? "↓" : ""} ${Math.abs(weightChange).toFixed(1)} lb over this period`}
              {gi?.goal != null ? ` · Goal: ${gi.goal} lb` : ""}
            </div>
            <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>{measurementRows.length} weigh-in{measurementRows.length === 1 ? "" : "s"} logged in this {range}-day view</div>
          </>
        ) : <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 8 }}>Weight trends will take shape with more weigh-ins.</div>}

        {weightView === "chart" ? (
          weightRows.length >= 2 ? (
            <div style={{ width: "100%", height: 205, marginTop: 12 }}>
              <ResponsiveContainer>
                <LineChart data={weightRows} margin={{ top: 8, right: 8, left: -2, bottom: 0 }}>
                  <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={28} />
                  <YAxis tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} width={48} tickFormatter={(v) => `${Math.round(v)} lb`} />
                  {gi?.goal != null ? <ReferenceLine y={gi.goal} stroke={brand.textSoft} strokeDasharray="4 4" /> : null}
                  <Tooltip contentStyle={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }} formatter={(v) => [`${v} lb`, weightDisplay === "average" ? "7-day average" : "Measurement"]} />
                  <Line type="monotone" dataKey="weight" stroke={profileColorFor(profileKey)} strokeWidth={3} dot={weightDisplay === "measurements" ? { r: 3 } : false} activeDot={{ r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null
        ) : <WeightDataTable user={user} today={today} range={range} styles={styles} />}
      </section>

      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <SectionHeading icon={Footprints} color={metricColors.steps} styles={styles}>Movement</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: ".06em" }}>Steps</div>
            <div className="num" style={{ fontSize: 21, fontWeight: 800, marginTop: 3 }}>{trend.stepAvg == null ? "—" : Math.round(trend.stepAvg).toLocaleString()}</div>
            <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>{comparisonText(trend.stepAvg, trend.previousStepAvg, "", 150)}</div>
            {trend.stepLoggedDays ? <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>{trend.stepLoggedDays} logged day{trend.stepLoggedDays === 1 ? "" : "s"}</div> : null}
            {targets.steps ? <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>Goal: {targets.steps.toLocaleString()}</div> : null}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: ".06em" }}>Activity</div>
            <div className="num" style={{ fontSize: 21, fontWeight: 800, marginTop: 3 }}>{trend.activeDaysPerWeek.toFixed(1)} days/wk</div>
            <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>{comparisonText(trend.activeDaysPerWeek, trend.previousActiveDaysPerWeek, " days/wk", 0.2)}</div>
          </div>
        </div>
        <MiniBarTrend data={trend.recent} dataKey="steps" color={metricColors.steps} target={targets.steps} suffix="" styles={styles} />
      </section>

      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <SectionHeading icon={Droplet} color={metricColors.water} styles={styles}>Water</SectionHeading>
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "5px 9px", marginTop: 8 }}>
          <div className="num" style={{ fontSize: 24, fontWeight: 800 }}>{trend.waterAvg == null ? "—" : `${Math.round(trend.waterAvg)} oz`}</div>
          <div style={{ color: TEXT_MUTED, fontSize: 11 }}>daily average on logged days</div>
        </div>
        <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>{comparisonText(trend.waterAvg, trend.previousWaterAvg, " oz", 2)}{targets.water ? ` · Goal: ${targets.water} oz` : ""}</div>
        {trend.waterLoggedDays ? <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>{trend.waterLoggedDays} logged day{trend.waterLoggedDays === 1 ? "" : "s"}</div> : null}
        <MiniBarTrend data={trend.recent} dataKey="water" color={metricColors.water} target={targets.water} suffix=" oz" styles={styles} />
      </section>

      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <SectionHeading icon={Utensils} color={metricColors.food} styles={styles}>Nutrition</SectionHeading>
        {!nutrition.length ? (
          <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "12px 0 4px" }}>Nutrition trends will appear as you log food or intentional fasting days.</div>
        ) : (
          <>
            <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 8 }}>{trend.nutritionLoggedDays} logged or fasting day{trend.nutritionLoggedDays === 1 ? "" : "s"} in this view</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px 14px", marginTop: 12 }}>
              {nutrition.map(([label, key, value, previous, target, suffix]) => (
                <div key={key} style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 9 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
                  <div className="num" style={{ fontSize: 19, fontWeight: 800, marginTop: 3 }}>{Math.round(value).toLocaleString()}{suffix}</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>{comparisonText(value, previous, suffix, key === "calories" ? 50 : 3)}</div>
                  {target ? <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>Goal: {target.toLocaleString()}{suffix}</div> : null}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

function WithTrends({ profileKeys, data, today, range, goalInfoFor, profileColorFor, profileNameFor, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, cardStyle, headingStyle } = styles;
  const allDates = lastNDays(range, today);
  const absoluteRows = allDates.map((date) => {
    const row = { date, label: shortDate(date) };
    profileKeys.forEach((profileKey) => {
      const start = addCalendarDays(date, -6);
      const entries = data[profileKey].weights.filter((w) => w.date >= start && w.date <= date);
      if (entries.length) row[profileKey] = Number((entries.reduce((sum, w) => sum + w.weight, 0) / entries.length).toFixed(1));
    });
    return row;
  });
  const baselines = Object.fromEntries(profileKeys.map((profileKey) => {
    const first = absoluteRows.find((row) => row[profileKey] != null)?.[profileKey];
    return [profileKey, first ?? null];
  }));
  const weightRows = absoluteRows.map((row) => {
    const relative = { date: row.date, label: row.label };
    profileKeys.forEach((profileKey) => {
      const baseline = baselines[profileKey];
      if (baseline != null && row[profileKey] != null) relative[profileKey] = Number((row[profileKey] - baseline).toFixed(1));
    });
    return relative;
  });
  const latestChangeFor = (profileKey) => [...weightRows].reverse().find((row) => row[profileKey] != null)?.[profileKey] ?? null;
  const hasWeightTrend = profileKeys.some((profileKey) => weightRows.filter((r) => r[profileKey] != null).length >= 2);
  const formatChange = (value) => `${value > 0 ? "+" : ""}${Number(value).toFixed(1)} lb`;

  return (
    <>
      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <div style={{ ...headingStyle, marginBottom: 3 }}>Weight, together</div>
        <div style={{ color: TEXT_MUTED, fontSize: 10, marginBottom: 10 }}>Each line starts at 0 for this view, so you can compare direction and shape without comparing body size.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 13px", marginBottom: 12 }}>
          {profileKeys.map((profileKey) => {
            const gi = goalInfoFor(profileKey);
            const displayName = profileNameFor(profileKey);
            const latestChange = latestChangeFor(profileKey);
            return <div key={profileKey} style={{ display: "flex", alignItems: "center", gap: 5, color: TEXT_MUTED, fontSize: 10 }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: profileColorFor(profileKey) }} /><strong style={{ color: TEXT }}>{displayName}</strong>{gi && latestChange != null ? `${formatChange(latestChange)} in view` : "No weigh-ins"}</div>;
          })}
        </div>
        {!hasWeightTrend ? <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "2rem 0", textAlign: "center" }}>Weight trends will take shape with more weigh-ins.</div> : (
          <div style={{ width: "100%", height: 215 }}>
            <ResponsiveContainer>
              <LineChart data={weightRows} margin={{ top: 5, right: 8, left: -2, bottom: 0 }}>
                <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={28} />
                <YAxis tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={48} tickFormatter={(v) => `${v > 0 ? "+" : ""}${Math.round(v)} lb`} />
                <ReferenceLine y={0} stroke={brand.textSoft} strokeDasharray="4 4" />
                <Tooltip contentStyle={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }} formatter={(v, key) => [formatChange(v), profileNameFor(key)]} />
                {profileKeys.map((profileKey) => <Line key={profileKey} type="monotone" dataKey={profileKey} stroke={profileColorFor(profileKey)} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section style={{ ...cardStyle, padding: "14px 14px 12px" }}>
        <div style={{ ...headingStyle, marginBottom: 4 }}>Your With lately</div>
        <div style={{ color: TEXT_MUTED, fontSize: 10, marginBottom: 10 }}>A shared view of what everyone has been logging. No rankings, because absolutely not.</div>
        {profileKeys.map((profileKey) => {
          const trend = buildTrendData(data[profileKey], today, range);
          return (
            <div key={profileKey} style={{ padding: "12px 0", borderTop: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: profileColorFor(profileKey) }} /><strong style={{ fontSize: 12 }}>{profileNameFor(profileKey)}</strong></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 7 }}>
                {[
                  [Footprints, metricColors.steps, "Steps", trend.stepAvg == null ? "—" : Math.round(trend.stepAvg).toLocaleString()],
                  [Droplet, metricColors.water, "Water", trend.waterAvg == null ? "—" : `${Math.round(trend.waterAvg)} oz`],
                  [Dumbbell, metricColors.activity, "Activity", `${trend.activeDaysPerWeek.toFixed(1)}/wk`],
                  [Utensils, metricColors.food, "Calories", trend.calorieAvg == null ? "—" : Math.round(trend.calorieAvg).toLocaleString()],
                ].map(([Icon, color, label, value]) => (
                  <div key={label} style={{ minWidth: 0 }}>
                    <Icon style={{ width: 13, height: 13, color, marginBottom: 3 }} />
                    <div style={{ color: TEXT_MUTED, fontSize: 9, fontWeight: 800 }}>{label}</div>
                    <div className="num" style={{ fontSize: 12, fontWeight: 800, marginTop: 2, whiteSpace: "nowrap" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}

export default function TrendsTab({ activeUser, data, today, goalInfo, profileColor, profiles = {}, goalInfoForProfile, profileColorForProfile, profileNameForProfile, styles }) {
  const { TEXT_MUTED } = styles;
  const profileKeys = Object.keys(data);
  const profileNameFor = profileNameForProfile || ((profileKey) => profiles?.[profileKey]?.name || profileKey);
  const goalInfoFor = goalInfoForProfile || goalInfo;
  const profileColorFor = profileColorForProfile || ((profileKey) => profileColor(profileNameFor(profileKey)));
  const [view, setView] = useState(activeUser);
  const [range, setRange] = useState(30);
  const selectedProfileKey = profileKeys.includes(view) ? view : activeUser;
  const activeData = data[activeUser];

  return (
    <>
      <div style={{ padding: "0.2rem 0.1rem 1.05rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>Trends</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Notice what’s changing over time.</div>
      </div>

      {activeData && <DailyObservation user={activeData} today={today} profileKey={activeUser} profileColorFor={profileColorFor} styles={styles} />}

      <div style={{ padding: "0 2px", marginBottom: 8 }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 19, fontWeight: 600 }}>Explore your trends</div>
        <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2 }}>Choose whose data to see and how much history to explore.</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", background: brand.stone, borderRadius: 12, padding: 4, WebkitOverflowScrolling: "touch", maxWidth: "100%" }}>
          <button onClick={() => setView("with")} style={{ border: "none", background: view === "with" ? brand.surface : "transparent", color: view === "with" ? brand.tealDark : brand.textMuted, boxShadow: view === "with" ? "0 1px 4px rgba(17,17,17,.08)" : "none", borderRadius: 9, padding: "8px 13px", fontWeight: view === "with" ? 800 : 600, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>With</button>
          {profileKeys.map((profileKey) => <button key={profileKey} onClick={() => setView(profileKey)} style={{ border: "none", background: view === profileKey ? brand.surface : "transparent", color: view === profileKey ? brand.text : brand.textMuted, boxShadow: view === profileKey ? "0 1px 4px rgba(17,17,17,.08)" : "none", borderRadius: 9, padding: "8px 13px", fontWeight: view === profileKey ? 800 : 600, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}><span aria-hidden="true" style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: profileColorFor(profileKey), marginRight: 6 }} />{profileNameFor(profileKey)}</button>)}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {[14, 30, 90].map((days) => <button key={days} onClick={() => setRange(days)} style={{ border: `1px solid ${range === days ? brand.teal : brand.border}`, background: range === days ? brand.teal : brand.surface, color: range === days ? brand.inkOn : brand.textMuted, borderRadius: 999, padding: "6px 10px", fontSize: 10, fontWeight: 800 }}>{days} days</button>)}
        </div>
      </div>

      {view === "with" ? (
        <WithTrends profileKeys={profileKeys} data={data} today={today} range={range} goalInfoFor={goalInfoFor} profileColorFor={profileColorFor} profileNameFor={profileNameFor} styles={styles} />
      ) : (
        <IndividualTrends profileKey={selectedProfileKey} profileNameFor={profileNameFor} user={data[selectedProfileKey]} today={today} range={range} goalInfoFor={goalInfoFor} profileColorFor={profileColorFor} styles={styles} />
      )}

      <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.5, padding: "12px 2px 6px" }}>Averages use only the days you logged. Blank days are unknown, never zero. Intentional fasting days count as zero food intake. Trends are here to help you notice patterns, not grade them.</div>
    </>
  );
}
