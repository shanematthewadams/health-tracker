import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function TrendsTab({
  profileNames,
  chartData,
  streaks,
  goalInfo,
  profileColor,
  fmtDate,
  styles,
}) {
  const { SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, cardStyle, headingStyle } = styles;

  return (
    <>
      <div style={{ padding: "0.25rem 0.1rem 0.9rem" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, lineHeight: 1.05 }}>Trends</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>See how things are changing over time.</div>
      </div>

      <div style={cardStyle}>
        <div style={headingStyle}>Weight trend</div>
        <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 10 }}>solid = actual, dashed = 7-day avg</div>
        <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
          {profileNames.map((u) => {
            const info = goalInfo(u);
            return (
              <div key={u}>
                <div style={{ fontSize: 11, color: profileColor(u), fontWeight: 700 }}>{u}</div>
                <div className="num" style={{ fontSize: 16 }}>
                  {info ? `${info.latest} lb` : "—"}
                  {info && info.latest !== info.start && (
                    <span style={{ color: info.latest < info.start ? profileColor(u) : WARN, fontSize: 12, marginLeft: 6 }}>
                      {info.latest < info.start ? "▼" : "▲"} {Math.abs(info.latest - info.start).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {chartData.length === 0 ? (
          <div style={{ color: TEXT_MUTED, fontSize: 13, padding: "2rem 0", textAlign: "center" }}>Your trend will take shape as you add weigh-ins.</div>
        ) : (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} tickLine={false} />
                <YAxis tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} tickLine={false} domain={["dataMin - 3", "dataMax + 3"]} width={32} />
                <Tooltip contentStyle={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: TEXT }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {profileNames.map((u) => <Line key={u} type="monotone" dataKey={u} name={u} stroke={profileColor(u)} strokeWidth={2} dot={{ r: 2.5 }} connectNulls />)}
                {profileNames.map((u) => <Line key={`${u}-avg`} type="monotone" dataKey={`${u}Avg`} name={`${u} avg`} stroke={profileColor(u)} strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={headingStyle}>Last 14 days</div>
        {profileNames.map((u) => (
          <div key={u} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: u === profileNames[profileNames.length - 1] ? 0 : 10 }}>
            <div style={{ width: 40, fontSize: 11, color: profileColor(u), fontWeight: 700 }}>{u}</div>
            <div style={{ display: "flex", gap: 3, flex: 1 }}>
              {streaks.days.map((d, i) => (
                <div
                  key={d}
                  title={`${fmtDate(d)}: ${streaks.result[u][i] ? "logged" : "nothing logged"}`}
                  style={{ flex: 1, height: 18, borderRadius: 3, background: streaks.result[u][i] ? profileColor(u) : SURFACE_2, border: `1px solid ${streaks.result[u][i] ? profileColor(u) : BORDER}` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
