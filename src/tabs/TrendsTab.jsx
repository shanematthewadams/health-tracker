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

function lastNDays(n) {
  const days = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(dateKey(d));
  }
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

function buildTrendData(user) {
  const days = lastNDays(14);
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

function PersonTrends({ name, user, goalInfo, profileColor, styles, compact = false }) {
  const { BORDER, TEXT, TEXT_MUTED, cardStyle, headingStyle } = styles;
  const gi = goalInfo(name);
  const trend = buildTrendData(user);
  const weightData = user.weights
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({ date: w.date, label: shortDate(w.date), weight: w.weight }));

  return (
    <section style={{ marginBottom: compact ? 22 : 0 }}>
      {compact && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 9px" }}>
          <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: profileColor(name) }} />
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 23, fontWeight: 600 }}>{name}</div>
        </div>
      )}

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: compact ? 10 : 14 }}>
          <div>
            <div style={{ ...headingStyle, marginBottom: gi ? 10 : 0 }}>Weight</div>
            {gi && (
              <div style={{ color: TEXT_MUTED, fontSize: 11 }}>
                {gi.start} lb start · {gi.latest} lb now{gi.goal != null ? ` · ${gi.goal} lb goal` : ""}
              </div>
            )}
          </div>
          {gi?.progressPct != null && (
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: compact ? 18 : 20, fontWeight: 800, color: profileColor(name) }}>{Math.round(gi.progressPct)}%</div>
              <div style={{ color: TEXT_MUTED, fontSize: 9 }}>goal complete</div>
            </div>
          )}
        </div>

        {weightData.length < 2 ? (
          <div style={{ color: TEXT_MUTED, fontSize: 12, padding: compact ? "1.2rem 0" : "2rem 0", textAlign: "center" }}>
            Weight trend will take shape with more weigh-ins.
          </div>
        ) : (
          <div style={{ width: "100%", height: compact ? 135 : 220 }}>
            <ResponsiveContainer>
              <LineChart data={weightData} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={{ stroke: BORDER }} tickLine={false} minTickGap={compact ? 42 : 28} />
                <YAxis tick={{ fill: TEXT_MUTED, fontSize: 9 }} axisLine={{ stroke: BORDER }} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} width={34} />
                <Tooltip
                  contentStyle={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: TEXT }}
                  formatter={(v) => [`${v} lb`, "Weight"]}
                />
                <Line type="monotone" dataKey="weight" stroke={profileColor(name)} strokeWidth={2.5} dot={{ r: compact ? 2 : 2.5 }} activeDot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MetricCard icon={Footprints} label="Steps" value={trend.stepAvg == null ? "—" : Math.round(trend.stepAvg).toLocaleString()} sub={trend.stepAvg == null ? "No data yet" : "avg on logged days"} data={trend.recent} dataKey="steps" color={metricColors.steps} compact={compact} />
        <MetricCard icon={Droplet} label="Water" value={trend.waterAvg == null ? "—" : `${Math.round(trend.waterAvg)} oz`} sub={trend.waterAvg == null ? "No data yet" : "avg on logged days"} data={trend.recent} dataKey="water" color={metricColors.water} suffix=" oz" compact={compact} />
        <MetricCard icon={Dumbbell} label="Activity" value={trend.activityAvg == null ? "—" : `${trend.activeDaysPerWeek.toFixed(1)} days/wk`} sub={trend.activityAvg == null ? "No data yet" : `${Math.round(trend.activityAvg)} cal avg`} data={trend.recent} dataKey="activity" color={metricColors.activity} suffix=" cal" compact={compact} />
        <MetricCard icon={Utensils} label="Nutrition" value={trend.calorieAvg == null ? "—" : `${Math.round(trend.calorieAvg)} cal`} sub={trend.proteinAvg == null ? "No data yet" : `${Math.round(trend.proteinAvg)}g protein avg`} data={trend.recent} dataKey="calories" color={metricColors.food} suffix=" cal" compact={compact} />
      </div>
    </section>
  );
}

export default function TrendsTab({ activeUser, data, goalInfo, profileColor, styles }) {
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

      {view === "with" ? (
        <>
          {profileNames.map((name) => (
            <PersonTrends key={name} name={name} user={data[name]} goalInfo={goalInfo} profileColor={profileColor} styles={styles} compact />
          ))}
          <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.5, padding: "0 2px 6px" }}>
            Each person’s trends stay individual. Steps and water use logged days; nutrition includes intentional fasting days as zero intake.
          </div>
        </>
      ) : (
        <>
          <PersonTrends name={selectedName} user={data[selectedName]} goalInfo={goalInfo} profileColor={profileColor} styles={styles} />
          <div style={{ marginTop: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: brand.text }}>Last 14 days</div>
            <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.5, marginTop: 3 }}>
              Steps and water use logged days. Nutrition includes intentional fasting days as zero intake, while unlogged non-fasting days stay missing.
            </div>
          </div>
        </>
      )}
    </>
  );
}
