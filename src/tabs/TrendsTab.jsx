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

function MetricCard({ icon: Icon, label, value, sub, data, dataKey, color, suffix = "" }) {
  return (
    <div style={{ background: brand.surface, border: `1px solid ${brand.border}`, borderRadius: 14, padding: "14px 14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon style={{ width: 15, height: 15, color }} strokeWidth={2} />
        <div style={{ fontSize: 12, fontWeight: 800, color: brand.text }}>{label}</div>
      </div>
      <div className="num" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.05 }}>{value}</div>
      <div style={{ color: brand.textMuted, fontSize: 11, marginTop: 3, minHeight: 16 }}>{sub}</div>
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
    </div>
  );
}

export default function TrendsTab({
  activeUser,
  data,
  goalInfo,
  profileColor,
  styles,
}) {
  const { BORDER, TEXT, TEXT_MUTED, cardStyle, headingStyle } = styles;
  const user = data[activeUser];
  const gi = goalInfo(activeUser);

  const weightData = user.weights
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({ date: w.date, label: shortDate(w.date), weight: w.weight }));

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

  const stepAvg = average(recent.map((d) => d.steps));
  const waterAvg = average(recent.map((d) => d.water));
  const activeDays = recent.filter((d) => d.activity != null).length;
  const activeDaysPerWeek = activeDays / 2;
  const activityAvg = average(recent.map((d) => d.activity));
  const calorieAvg = average(recent.map((d) => d.calories));
  const proteinAvg = average(recent.map((d) => d.protein));

  return (
    <>
      <div style={{ padding: "0.25rem 0.1rem 0.9rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600, lineHeight: 1.05 }}>Trends</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>A quieter look at how things are changing for {activeUser}.</div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={headingStyle}>Weight</div>
            {gi && (
              <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: -8 }}>
                {gi.start} lb start · {gi.latest} lb now{gi.goal != null ? ` · ${gi.goal} lb goal` : ""}
              </div>
            )}
          </div>
          {gi?.progressPct != null && (
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: brand.teal }}>{Math.round(gi.progressPct)}%</div>
              <div style={{ color: TEXT_MUTED, fontSize: 10 }}>goal complete</div>
            </div>
          )}
        </div>

        {weightData.length < 2 ? (
          <div style={{ color: TEXT_MUTED, fontSize: 13, padding: "2rem 0", textAlign: "center" }}>
            Your weight trend will take shape as you add more weigh-ins.
          </div>
        ) : (
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={weightData} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} tickLine={false} minTickGap={28} />
                <YAxis tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} width={36} />
                <Tooltip
                  contentStyle={{ background: brand.surface, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: TEXT }}
                  formatter={(v) => [`${v} lb`, "Weight"]}
                />
                <Line type="monotone" dataKey="weight" stroke={profileColor(activeUser)} strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ ...headingStyle, marginBottom: 3 }}>Last 14 days</div>
        <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 12 }}>Actual health patterns, not whether you remembered to open the app.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <MetricCard
          icon={Footprints}
          label="Steps"
          value={stepAvg == null ? "—" : Math.round(stepAvg).toLocaleString()}
          sub={stepAvg == null ? "No steps logged yet" : "average on logged days"}
          data={recent}
          dataKey="steps"
          color={metricColors.steps}
        />
        <MetricCard
          icon={Droplet}
          label="Water"
          value={waterAvg == null ? "—" : `${Math.round(waterAvg)} oz`}
          sub={waterAvg == null ? "No water logged yet" : "average on logged days"}
          data={recent}
          dataKey="water"
          color={metricColors.water}
          suffix=" oz"
        />
        <MetricCard
          icon={Dumbbell}
          label="Activity"
          value={activeDays ? `${activeDaysPerWeek.toFixed(1)} days/wk` : "—"}
          sub={activityAvg == null ? "No activity logged yet" : `${Math.round(activityAvg)} cal avg on active days`}
          data={recent}
          dataKey="activity"
          color={metricColors.activity}
          suffix=" cal"
        />
        <MetricCard
          icon={Utensils}
          label="Nutrition"
          value={calorieAvg == null ? "—" : `${Math.round(calorieAvg)} cal`}
          sub={proteinAvg == null ? "No nutrition data yet" : `${Math.round(proteinAvg)}g protein avg · fasting included`}
          data={recent}
          dataKey="calories"
          color={metricColors.food}
          suffix=" cal"
        />
      </div>

      <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.5, padding: "0 2px 6px" }}>
        Steps and water use logged days. Nutrition includes intentional fasting days as zero intake, while unlogged non-fasting days stay missing.
      </div>
    </>
  );
}
