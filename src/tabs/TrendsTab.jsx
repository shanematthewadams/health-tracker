import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Footprints, Droplet, Dumbbell, Utensils } from "lucide-react";
import { brand, metricColors } from "../brand.jsx";

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function shortDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
}

function addCalendarDays(dateStr, amount) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

function lastNDays(n, today) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) days.push(addCalendarDays(today, -i));
  return days;
}

function average(values) {
  const present = values.filter((v) => v != null);
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

function buildTrendData(user, today) {
  const days = lastNDays(14, today);
  const recent = days.map((date) => {
    const foods = user.foods.filter((f) => f.date === date);
    const activities = user.activities.filter((a) => a.date === date);
    const water = user.water.filter((w) => w.date === date).reduce((sum, w) => sum + w.ounces, 0);
    const stepsEntry = user.steps.find((s) => s.date === date);
    const fastingDay = (user.fasts || []).some((fast) => fastingTouchesDate(fast, date));

    return {
      date,
      label: shortDate(date),
      steps: stepsEntry?.count ?? null,
      water: water || null,
      activity: activities.length ? activities.reduce((sum, a) => sum + a.caloriesBurned, 0) : null,
      calories: foods.length ? foods.reduce((sum, f) => sum + f.calories, 0) : fastingDay ? 0 : null,
      protein: foods.length ? foods.reduce((sum, f) => sum + f.protein, 0) : fastingDay ? 0 : null,
    };
  });

  const activeDays = recent.filter((d) => d.activity != null).length;
  return {
    recent,
    stepAvg: average(recent.map((d) => d.steps)),
    waterAvg: average(recent.map((d) => d.water)),
    activeDaysPerWeek: activeDays / 2,
    activityAvg: average(recent.map((d) => d.activity)),
    calorieAvg: average(recent.map((d) => d.calories)),
    proteinAvg: average(recent.map((d) => d.protein)),
  };
}

function MetricCard({ icon: Icon, label, value, sub, data, dataKey, color, suffix = "", compact = false }) {
  return (
    <div style={{ background: brand.surface, border: `1px solid ${brand.border}`, borderRadius: 14, padding: compact ? "11px 11px 9px" : "14px 14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <Icon style={{ width: 14, height: 14, color }} strokeWidth={2} />
        <div style={{ fontSize: 11, fontWeight: 800, color: brand.text }}>{label}</div>
      </div>
      <div className="num" style={{ fontSize: compact ? 18 : 22, fontWeight: 800, lineHeight: 1.05 }}>{value}</div>
      <div style={{ color: brand.textMuted, fontSize: 10, marginTop: 3, minHeight: 14 }}>{sub}</div>
      {!compact && (
        <div style={{ height: 58, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Tooltip
                cursor={{ fill: brand.surfaceSoft }}
                contentStyle={{ background: brand.surface, border: `1px solid ${brand.border}`, borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${Math.round(v)}${suffix}`, label]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ""}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function TrendSummary({ name, user, profileColor, today }) {
  const trend = buildTrendData(user, today);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "70px repeat(4, minmax(0, 1fr))", alignItems: "center", gap: 7, padding: "10px 0", borderTop: `1px solid ${brand.border}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: profileColor(name), flexShrink: 0 }} />
          <strong style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</strong>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="num" style={{ fontSize: 14, fontWeight: 800 }}>{trend.stepAvg == null ? "—" : Math.round(trend.stepAvg).toLocaleString()}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="num" style={{ fontSize: 14, fontWeight: 800 }}>{trend.waterAvg == null ? "—" : `${Math.round(trend.waterAvg)} oz`}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="num" style={{ fontSize: 14, fontWeight: 800 }}>{trend.activityAvg == null ? "—" : `${trend.activeDaysPerWeek.toFixed(1)}/wk`}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="num" style={{ fontSize: 14, fontWeight: 800 }}>{trend.calorieAvg == null ? "—" : Math.round(trend.calorieAvg).toLocaleString()}</div>
        {trend.proteinAvg != null && <div style={{ color: brand.textMuted, fontSize: 9, marginTop: 2 }}>{Math.round(trend.proteinAvg)}g protein</div>}
      </div>
    </div>
  );
}

function CombinedTrends({ names, data, today, goalInfo, profileColor, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, cardStyle, headingStyle } = styles;
  const allDates = [...new Set(names.flatMap((name) => data[name].weights.map((w) => w.date)))].sort();
  const weightRows = allDates.map((date) => {
    const row = { date, label: shortDate(date) };
    names.forEach((name) => {
      const entry = data[name].weights.find((w) => w.date === date);
      if (entry) row[name] = entry.weight;
    });
    return row;
  });
  const hasWeightTrend = names.some((name) => data[name].weights.length >= 2);

  return (
    <>
      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <div style={{ ...headingStyle, marginBottom: 10 }}>Weight</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 13px", marginBottom: 12 }}>
          {names.map((name) => {
            const gi = goalInfo(name);
            return (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 5, color: TEXT_MUTED, fontSize: 10 }}>
                <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: profileColor(name) }} />
                <strong style={{ color: TEXT }}>{name}</strong>
                {gi ? `${gi.latest} lb${gi.progressPct != null ? ` · ${Math.round(gi.progressPct)}%` : ""}` : "No weigh-ins"}
              </div>
            );
          })}
        </div>

        {!hasWeightTrend ? (
          <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "2rem 0", textAlign: "center" }}>
            Weight trends will take shape with more weigh-ins.
          </div>
        ) : (
          <div style={{ width: "100%", height: 225 }}>
            <ResponsiveContainer>
              <LineChart data={weightRows} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={{ stroke: BORDER }} tickLine={false} minTickGap={28} />
                <YAxis tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={{ stroke: BORDER }} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} width={34} />
                <Tooltip contentStyle={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }} labelStyle={{ color: TEXT }} formatter={(v, key) => [`${v} lb`, key]} />
                {names.map((name) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={profileColor(name)} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ ...cardStyle, padding: "14px 14px 12px" }}>
        <div style={{ ...headingStyle, marginBottom: 4 }}>14-day averages</div>
        <div style={{ color: TEXT_MUTED, fontSize: 10, marginBottom: 10 }}>Patterns stay personal, but they can live in the same view.</div>
        <div style={{ display: "grid", gridTemplateColumns: "70px repeat(4, minmax(0, 1fr))", gap: 7, alignItems: "end", paddingBottom: 6 }}>
          <div />
          <div style={{ textAlign: "center", color: TEXT_MUTED, fontSize: 9, fontWeight: 800 }}><Footprints style={{ width: 13, height: 13, color: metricColors.steps, display: "block", margin: "0 auto 3px" }} />Steps</div>
          <div style={{ textAlign: "center", color: TEXT_MUTED, fontSize: 9, fontWeight: 800 }}><Droplet style={{ width: 13, height: 13, color: metricColors.water, display: "block", margin: "0 auto 3px" }} />Water</div>
          <div style={{ textAlign: "center", color: TEXT_MUTED, fontSize: 9, fontWeight: 800 }}><Dumbbell style={{ width: 13, height: 13, color: metricColors.activity, display: "block", margin: "0 auto 3px" }} />Activity</div>
          <div style={{ textAlign: "center", color: TEXT_MUTED, fontSize: 9, fontWeight: 800 }}><Utensils style={{ width: 13, height: 13, color: metricColors.food, display: "block", margin: "0 auto 3px" }} />Nutrition</div>
        </div>
        {names.map((name) => <TrendSummary key={name} name={name} user={data[name]} profileColor={profileColor} today={today} />)}
      </div>
    </>
  );
}
export default function TrendsTab({ activeUser, data, today, goalInfo, profileColor, styles }) {
  const { TEXT_MUTED } = styles;
  const profileNames = Object.keys(data);
  const [view, setView] = useState("with");
  const selectedName = profileNames.includes(view) ? view : activeUser;

  return (
    <>
      <div style={{ padding: "0.25rem 0.1rem 0.8rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600, lineHeight: 1.05 }}>Trends</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>
          {view === "with" ? "See how the people you’re With are doing, together." : `A closer look at how things are changing for ${selectedName}.`}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, overflowX: "auto", background: brand.stone, borderRadius: 12, padding: 4, marginBottom: 18, WebkitOverflowScrolling: "touch" }}>
        <button
          onClick={() => setView("with")}
          style={{
            border: "none",
            background: view === "with" ? brand.surface : "transparent",
            color: view === "with" ? brand.tealDark : brand.textMuted,
            boxShadow: view === "with" ? "0 1px 4px rgba(17,17,17,.08)" : "none",
            borderRadius: 9,
            padding: "8px 13px",
            fontFamily: "'DM Sans', -apple-system, sans-serif",
            fontWeight: view === "with" ? 800 : 600,
            fontSize: 12,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          With
        </button>
        {profileNames.map((name) => (
          <button
            key={name}
            onClick={() => setView(name)}
            style={{
              border: "none",
              background: view === name ? brand.surface : "transparent",
              color: view === name ? brand.text : brand.textMuted,
              boxShadow: view === name ? "0 1px 4px rgba(17,17,17,.08)" : "none",
              borderRadius: 9,
              padding: "8px 13px",
              fontFamily: "'DM Sans', -apple-system, sans-serif",
              fontWeight: view === name ? 800 : 600,
              fontSize: 12,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <span aria-hidden="true" style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: profileColor(name), marginRight: 6 }} />
            {name}
          </button>
        ))}
      </div>

      <CombinedTrends
        names={view === "with" ? profileNames : [selectedName]}
        data={data}
        today={today}
        goalInfo={goalInfo}
        profileColor={profileColor}
        styles={styles}
      />

      <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.5, padding: "12px 2px 6px" }}>
        Steps and water use logged days. Nutrition includes intentional fasting days as zero intake, while unlogged non-fasting days stay missing.
      </div>
    </>
  );
}
