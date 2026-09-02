import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from "recharts";
import { Footprints, Droplet, Dumbbell, Utensils } from "lucide-react";
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
    const water = user.water.filter((w) => w.date === date).reduce((sum, w) => sum + w.ounces, 0);
    const stepsEntry = user.steps.find((s) => s.date === date);
    const fastingDay = (user.fasts || []).some((fast) => fastingTouchesDate(fast, date));
    const nutrition = (key) => foods.length ? foods.reduce((sum, f) => sum + Number(f[key] || 0), 0) : fastingDay ? 0 : null;

    return {
      date,
      label: shortDate(date),
      steps: stepsEntry?.count ?? null,
      water: water || null,
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
  return {
    recent,
    previous,
    stepAvg: avg(recent, "steps"),
    previousStepAvg: avg(previous, "steps"),
    waterAvg: avg(recent, "water"),
    previousWaterAvg: avg(previous, "water"),
    activeDaysPerWeek: activeDays / range * 7,
    previousActiveDaysPerWeek: previousActiveDays / range * 7,
    calorieAvg: avg(recent, "calories"),
    previousCalorieAvg: avg(previous, "calories"),
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
    };
  }).filter((row) => row.weight != null);
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

function comparisonText(current, previous, unit = "", threshold = 0) {
  if (current == null || previous == null) return "More history will make this pattern clearer.";
  const diff = current - previous;
  if (Math.abs(diff) <= threshold) return "About the same as the previous period";
  const amount = Math.abs(diff);
  const formatted = unit === "" ? Math.round(amount).toLocaleString() : Number(amount.toFixed(1)).toLocaleString();
  return `${diff > 0 ? "↑" : "↓"} ${formatted}${unit} from the previous period`;
}

function daySeed(today) {
  return Number(today.replaceAll("-", "")) || 0;
}

function chooseObservation(user, today, range, name) {
  const trend = buildTrendData(user, today, range);
  const candidates = [];
  const weightChange = weightPeriodChange(user, today, range);
  const weightRows = rollingWeightRows(user, today, range);
  const latestWeight = weightRows.at(-1)?.weight;

  if (weightChange != null && Math.abs(weightChange) >= 0.4) {
    candidates.push({
      key: "weight-change",
      text: `Your rolling weight trend has moved ${Math.abs(weightChange).toFixed(1)} lb ${weightChange < 0 ? "down" : "up"} over this period. Daily weigh-ins may bounce around, but the longer pattern is moving.`,
    });
  }

  const latestActual = user.weights.at(-1)?.weight;
  if (latestWeight != null && latestActual != null && Math.abs(latestActual - latestWeight) >= 1) {
    candidates.push({
      key: "weight-vs-average",
      text: `Your latest weigh-in is ${Math.abs(latestActual - latestWeight).toFixed(1)} lb ${latestActual > latestWeight ? "above" : "below"} your rolling average. One day can move around more than the trend does.`,
    });
  }

  if (trend.stepAvg != null && trend.previousStepAvg != null && Math.abs(trend.stepAvg - trend.previousStepAvg) >= 400) {
    const diff = trend.stepAvg - trend.previousStepAvg;
    candidates.push({
      key: "steps",
      text: `You’ve averaged about ${Math.round(trend.stepAvg).toLocaleString()} steps a day, ${Math.abs(Math.round(diff)).toLocaleString()} ${diff > 0 ? "more" : "fewer"} than the previous ${range} days.`,
    });
  }

  if (trend.waterAvg != null && trend.previousWaterAvg != null && Math.abs(trend.waterAvg - trend.previousWaterAvg) >= 5) {
    const diff = trend.waterAvg - trend.previousWaterAvg;
    candidates.push({
      key: "water",
      text: `Your logged water has averaged ${Math.round(trend.waterAvg)} oz a day, about ${Math.abs(Math.round(diff))} oz ${diff > 0 ? "more" : "less"} than the previous period.`,
    });
  }

  if (trend.activeDaysPerWeek != null && trend.previousActiveDaysPerWeek != null && Math.abs(trend.activeDaysPerWeek - trend.previousActiveDaysPerWeek) >= 0.5) {
    const diff = trend.activeDaysPerWeek - trend.previousActiveDaysPerWeek;
    candidates.push({
      key: "activity",
      text: `You’ve logged activity about ${trend.activeDaysPerWeek.toFixed(1)} days a week lately, ${Math.abs(diff).toFixed(1)} ${diff > 0 ? "more" : "fewer"} days a week than the previous period.`,
    });
  }

  if (trend.proteinAvg != null && trend.previousProteinAvg != null && Math.abs(trend.proteinAvg - trend.previousProteinAvg) >= 8) {
    const diff = trend.proteinAvg - trend.previousProteinAvg;
    candidates.push({
      key: "protein",
      text: `Your average protein intake has moved from about ${Math.round(trend.previousProteinAvg)}g to ${Math.round(trend.proteinAvg)}g a day. That’s a change in the pattern worth noticing.`,
    });
  }

  if (trend.calorieAvg != null && trend.previousCalorieAvg != null && Math.abs(trend.calorieAvg - trend.previousCalorieAvg) >= 120) {
    const diff = trend.calorieAvg - trend.previousCalorieAvg;
    candidates.push({
      key: "calories",
      text: `Your logged calorie average is about ${Math.abs(Math.round(diff)).toLocaleString()} calories ${diff > 0 ? "higher" : "lower"} per day than the previous period.`,
    });
  }

  if (!candidates.length) {
    if (latestWeight != null) candidates.push({ key: "steady-weight", text: `Your rolling weight average is ${latestWeight.toFixed(1)} lb. The pattern is fairly steady right now, which is still useful information.` });
    else if (trend.stepAvg != null) candidates.push({ key: "steady-steps", text: `You’ve averaged about ${Math.round(trend.stepAvg).toLocaleString()} steps on the days you logged them. Keep adding days and the pattern will get clearer.` });
    else if (trend.waterAvg != null) candidates.push({ key: "steady-water", text: `You’ve averaged about ${Math.round(trend.waterAvg)} oz of water on logged days. A little more history will make the pattern easier to see.` });
    else candidates.push({ key: "new", text: `${name}, there isn’t quite enough history for a strong trend yet. Keep logging what matters to you and With will start noticing the patterns.` });
  }

  return candidates[daySeed(today) % candidates.length];
}

function SectionHeading({ icon: Icon, color, children, styles }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
      {Icon && <Icon style={{ width: 15, height: 15, color }} strokeWidth={2} />}
      <div style={{ ...styles.headingStyle, fontSize: 18 }}>{children}</div>
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

function IndividualTrends({ name, user, today, range, goalInfo, profileColor, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, cardStyle } = styles;
  const trend = buildTrendData(user, today, range);
  const weightRows = rollingWeightRows(user, today, range);
  const gi = goalInfo(name);
  const weightChange = weightPeriodChange(user, today, range);
  const observation = chooseObservation(user, today, range, name);
  const targets = user.targets || {};
  const nutrition = [
    ["Calories", "calories", trend.calorieAvg, trend.previousCalorieAvg, targets.calories, " cal"],
    ["Protein", "protein", trend.proteinAvg, trend.previousProteinAvg, targets.protein, "g"],
    ["Carbs", "carbs", trend.carbsAvg, trend.previousCarbsAvg, targets.carbs, "g"],
    ["Fat", "fat", trend.fatAvg, trend.previousFatAvg, targets.fat, "g"],
    ["Fiber", "fiber", trend.fiberAvg, trend.previousFiberAvg, targets.fiberMin, "g"],
  ].filter(([, , value]) => value != null);

  return (
    <>
      <section style={{ ...cardStyle, background: brand.surfaceSoft, borderColor: brand.border, borderTop: `3px solid ${profileColor(name)}`, marginBottom: 14, padding: "1.05rem 1.1rem" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 7 }}>Something worth noticing</div>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 20, fontWeight: 600, fontStyle: "italic", lineHeight: 1.35, color: TEXT }}>{observation.text}</div>
        <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 9 }}>A different useful observation can surface each day as your data changes.</div>
      </section>

      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <SectionHeading color={metricColors.weight} styles={styles}>Weight</SectionHeading>
        {gi ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "5px 9px" }}>
              <div className="num" style={{ fontSize: 27, fontWeight: 800 }}>{gi.latest.toFixed(1)} lb</div>
              <div style={{ color: TEXT_MUTED, fontSize: 11 }}>7-day average</div>
            </div>
            <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 3 }}>
              {weightChange == null ? "More history will make the longer trend clearer." : `${weightChange > 0 ? "↑" : weightChange < 0 ? "↓" : ""} ${Math.abs(weightChange).toFixed(1)} lb over this period`}
              {gi.goal != null ? ` · Goal: ${gi.goal} lb` : ""}
            </div>
          </>
        ) : <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 8 }}>Weight trends will take shape with more weigh-ins.</div>}

        {weightRows.length >= 2 && (
          <div style={{ width: "100%", height: 205, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={weightRows} margin={{ top: 8, right: 8, left: -2, bottom: 0 }}>
                <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={28} />
                <YAxis tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} width={48} tickFormatter={(v) => `${Math.round(v)} lb`} />
                {gi?.goal != null ? <ReferenceLine y={gi.goal} stroke={brand.textSoft} strokeDasharray="4 4" /> : null}
                <Tooltip contentStyle={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }} formatter={(v) => [`${v} lb`, "7-day average"]} />
                <Line type="monotone" dataKey="weight" stroke={profileColor(name)} strokeWidth={3} dot={false} activeDot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <SectionHeading icon={Footprints} color={metricColors.steps} styles={styles}>Movement</SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: ".06em" }}>Steps</div>
            <div className="num" style={{ fontSize: 21, fontWeight: 800, marginTop: 3 }}>{trend.stepAvg == null ? "—" : Math.round(trend.stepAvg).toLocaleString()}</div>
            <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>{comparisonText(trend.stepAvg, trend.previousStepAvg, "", 150)}</div>
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
        <MiniBarTrend data={trend.recent} dataKey="water" color={metricColors.water} target={targets.water} suffix=" oz" styles={styles} />
      </section>

      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <SectionHeading icon={Utensils} color={metricColors.food} styles={styles}>Nutrition</SectionHeading>
        {!nutrition.length ? (
          <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "12px 0 4px" }}>Nutrition trends will appear as you log food or intentional fasting days.</div>
        ) : (
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
        )}
      </section>
    </>
  );
}

function WithTrends({ names, data, today, range, goalInfo, profileColor, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, cardStyle, headingStyle } = styles;
  const allDates = lastNDays(range, today);
  const weightRows = allDates.map((date) => {
    const row = { date, label: shortDate(date) };
    names.forEach((name) => {
      const start = addCalendarDays(date, -6);
      const entries = data[name].weights.filter((w) => w.date >= start && w.date <= date);
      if (entries.length) row[name] = Number((entries.reduce((sum, w) => sum + w.weight, 0) / entries.length).toFixed(1));
    });
    return row;
  });
  const hasWeightTrend = names.some((name) => weightRows.filter((r) => r[name] != null).length >= 2);

  return (
    <>
      <section style={{ ...cardStyle, marginBottom: 14 }}>
        <div style={{ ...headingStyle, marginBottom: 3 }}>Weight, together</div>
        <div style={{ color: TEXT_MUTED, fontSize: 10, marginBottom: 10 }}>Each line is personal. Sharing the view doesn’t turn it into a competition.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 13px", marginBottom: 12 }}>
          {names.map((name) => {
            const gi = goalInfo(name);
            return <div key={name} style={{ display: "flex", alignItems: "center", gap: 5, color: TEXT_MUTED, fontSize: 10 }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: profileColor(name) }} /><strong style={{ color: TEXT }}>{name}</strong>{gi ? `${gi.latest.toFixed(1)} lb avg` : "No weigh-ins"}</div>;
          })}
        </div>
        {!hasWeightTrend ? <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "2rem 0", textAlign: "center" }}>Weight trends will take shape with more weigh-ins.</div> : (
          <div style={{ width: "100%", height: 215 }}>
            <ResponsiveContainer>
              <LineChart data={weightRows} margin={{ top: 5, right: 8, left: -2, bottom: 0 }}>
                <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={28} />
                <YAxis tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} width={48} tickFormatter={(v) => `${Math.round(v)} lb`} />
                <Tooltip contentStyle={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }} formatter={(v, key) => [`${v} lb`, key]} />
                {names.map((name) => <Line key={name} type="monotone" dataKey={name} stroke={profileColor(name)} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section style={{ ...cardStyle, padding: "14px 14px 12px" }}>
        <div style={{ ...headingStyle, marginBottom: 4 }}>Your With lately</div>
        <div style={{ color: TEXT_MUTED, fontSize: 10, marginBottom: 10 }}>A shared view of what everyone has been logging. No rankings, because absolutely not.</div>
        {names.map((name) => {
          const trend = buildTrendData(data[name], today, range);
          return (
            <div key={name} style={{ padding: "12px 0", borderTop: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: profileColor(name) }} /><strong style={{ fontSize: 12 }}>{name}</strong></div>
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

export default function TrendsTab({ activeUser, data, today, goalInfo, profileColor, styles }) {
  const { TEXT_MUTED } = styles;
  const profileNames = Object.keys(data);
  const [view, setView] = useState(activeUser);
  const [range, setRange] = useState(30);
  const selectedName = profileNames.includes(view) ? view : activeUser;

  return (
    <>
      <div style={{ padding: "0.2rem 0.1rem 1.05rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>Trends</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>{view === "with" ? "See what’s been happening for the people you’re With." : "Notice what’s changing over time."}</div>
      </div>

      <div style={{ display: "flex", gap: 4, overflowX: "auto", background: brand.stone, borderRadius: 12, padding: 4, marginBottom: 10, WebkitOverflowScrolling: "touch" }}>
        <button onClick={() => setView("with")} style={{ border: "none", background: view === "with" ? brand.surface : "transparent", color: view === "with" ? brand.tealDark : brand.textMuted, boxShadow: view === "with" ? "0 1px 4px rgba(17,17,17,.08)" : "none", borderRadius: 9, padding: "8px 13px", fontWeight: view === "with" ? 800 : 600, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>With</button>
        {profileNames.map((name) => <button key={name} onClick={() => setView(name)} style={{ border: "none", background: view === name ? brand.surface : "transparent", color: view === name ? brand.text : brand.textMuted, boxShadow: view === name ? "0 1px 4px rgba(17,17,17,.08)" : "none", borderRadius: 9, padding: "8px 13px", fontWeight: view === name ? 800 : 600, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}><span aria-hidden="true" style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: profileColor(name), marginRight: 6 }} />{name}</button>)}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginBottom: 18 }}>
        {[14, 30, 90].map((days) => <button key={days} onClick={() => setRange(days)} style={{ border: `1px solid ${range === days ? brand.teal : brand.border}`, background: range === days ? brand.teal : brand.surface, color: range === days ? brand.inkOn : brand.textMuted, borderRadius: 999, padding: "6px 10px", fontSize: 10, fontWeight: 800 }}>{days} days</button>)}
      </div>

      {view === "with" ? (
        <WithTrends names={profileNames} data={data} today={today} range={range} goalInfo={goalInfo} profileColor={profileColor} styles={styles} />
      ) : (
        <IndividualTrends name={selectedName} user={data[selectedName]} today={today} range={range} goalInfo={goalInfo} profileColor={profileColor} styles={styles} />
      )}

      <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.5, padding: "12px 2px 6px" }}>Averages use the days you logged. Intentional fasting days count as zero food intake; unlogged days stay missing. Trends are here to help you notice patterns, not grade them.</div>
    </>
  );
}
