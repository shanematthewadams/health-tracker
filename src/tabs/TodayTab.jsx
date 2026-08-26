import { Utensils, Scale, Dumbbell, Droplet, Footprints } from "lucide-react";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function fullTodayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default function TodayTab({
  activeUser,
  activeCanEdit,
  data,
  profileNames,
  today,
  todayStats,
  activeFasts,
  fastPromptDismissedToday,
  fastEditorOpen,
  fastBusy,
  fastStartDate,
  fastStartTime,
  setFastStartDate,
  setFastStartTime,
  setFastEditorOpen,
  dismissFastPromptToday,
  openFastEditor,
  startFast,
  updateFastStart,
  endFast,
  fastElapsed,
  openLog,
  setActiveUser,
  profileColor,
  profileText,
  styles,
}) {
  const { SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton } = styles;
  const u = data[activeUser];
  const ts = todayStats[activeUser];
  const targets = u.targets;
  const todaysFoods = u.foods.filter((f) => f.date === today);
  const todaysActivities = u.activities.filter((a) => a.date === today);
  const todaysWeight = u.weights.filter((w) => w.date === today);
  const latestTodayWeight = todaysWeight.length ? todaysWeight[todaysWeight.length - 1].weight : null;
  const prevWeightEntry = u.weights.filter((w) => w.date < today).slice().sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  const totalActivityCals = todaysActivities.reduce((sum, a) => sum + a.caloriesBurned, 0);
  const hasAnything = todaysFoods.length > 0 || todaysActivities.length > 0 || ts.water > 0 || ts.steps != null || todaysWeight.length > 0;
  const isMine = activeCanEdit;
  const otherPeople = profileNames.filter((n) => n !== activeUser);

  const quick = [
    ["Food", "food", Utensils],
    ["Weight", "weight", Scale],
    ["Activity", "activity", Dumbbell],
    ["Water", "water", Droplet],
    ["Steps", "steps", Footprints],
  ];

  const summaryCards = [
    { id: "activity", label: "Activity", icon: Dumbbell, show: todaysActivities.length > 0, value: todaysActivities.length === 1 ? todaysActivities[0].name : `${todaysActivities.length} activities`, sub: `${Math.round(totalActivityCals)} cal burned` },
    { id: "water", label: "Water", icon: Droplet, show: ts.water > 0, value: `${Math.round(ts.water)} oz`, sub: "Logged today" },
    { id: "steps", label: "Steps", icon: Footprints, show: ts.steps != null, value: ts.steps != null ? ts.steps.toLocaleString() : "", sub: "Logged today" },
    {
      id: "weight",
      label: "Weight",
      icon: Scale,
      show: latestTodayWeight != null,
      value: latestTodayWeight != null ? `${latestTodayWeight} lb` : "",
      sub: latestTodayWeight != null && prevWeightEntry
        ? `${latestTodayWeight < prevWeightEntry.weight ? "↓" : latestTodayWeight > prevWeightEntry.weight ? "↑" : "→"} ${Math.abs(latestTodayWeight - prevWeightEntry.weight).toFixed(1)} lb from last weigh-in`
        : "Logged today",
    },
  ];

  return (
    <>
      <div style={{ padding: "0.35rem 0.15rem 1rem" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 30, lineHeight: 1.08, color: TEXT }}>
          {isMine ? `${greeting()}, ${activeUser}.` : `${activeUser} today`}
        </div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 5 }}>{fullTodayLabel()}</div>
      </div>

      {isMine && (activeFasts[activeUser] || !fastPromptDismissedToday) && (
        <div style={{ ...cardStyle, background: activeFasts[activeUser] ? "#F1EBDD" : "#FFF8EE", borderColor: activeFasts[activeUser] ? "#D8CCB8" : "#E6D6C1", padding: "1.05rem 1.2rem" }}>
          {activeFasts[activeUser] ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600 }}>You’re fasting</div>
                <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 3 }}>
                  Started {new Date(activeFasts[activeUser].started_at).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })} · {fastElapsed(activeFasts[activeUser].started_at)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => openFastEditor(activeFasts[activeUser])} disabled={fastBusy} style={{ background: "transparent", color: TEXT_MUTED, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "9px 10px", fontSize: 12, fontWeight: 700 }}>Edit</button>
                <button onClick={endFast} disabled={fastBusy} style={{ background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "9px 12px", fontSize: 12, fontWeight: 700 }}>{fastBusy ? "Ending…" : "End fast"}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600 }}>Fasting today?</div>
                <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 3 }}>WITH can adjust your Today prompts while you fast.</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={dismissFastPromptToday} disabled={fastBusy} style={{ background: "transparent", color: TEXT_MUTED, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "9px 10px", fontSize: 12, fontWeight: 700 }}>Not today</button>
                <button onClick={() => openFastEditor()} disabled={fastBusy} style={{ background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "9px 12px", fontSize: 12, fontWeight: 700 }}>Start fast</button>
              </div>
            </div>
          )}
        </div>
      )}

      {isMine && fastEditorOpen && (
        <div style={{ ...cardStyle, marginTop: "-0.35rem", padding: "1.1rem 1.2rem" }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{activeFasts[activeUser] ? "Edit fast start" : "When did your fast start?"}</div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 14 }}>It defaults to right now. Backdating is completely fine.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><div style={fieldLabel}>Date</div><input type="date" max={today} value={fastStartDate} onChange={(e) => setFastStartDate(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Time</div><input type="time" value={fastStartTime} onChange={(e) => setFastStartTime(e.target.value)} style={inputStyle} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => setFastEditorOpen(false)} disabled={fastBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
            <button onClick={activeFasts[activeUser] ? updateFastStart : startFast} disabled={fastBusy} style={bigButton(profileColor(activeUser), profileText(activeUser))}>{fastBusy ? "Saving…" : activeFasts[activeUser] ? "Save start" : "Start fast"}</button>
          </div>
        </div>
      )}

      {!hasAnything && (
        <div style={{ ...cardStyle, padding: "1.45rem", background: "#FFF8EE", borderColor: "#E6D6C1" }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 6 }}>{isMine ? (activeFasts[activeUser] ? "Your day is underway." : "Nothing here yet.") : "Nothing shared yet."}</div>
          <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginBottom: isMine ? 16 : 0 }}>
            {isMine ? (activeFasts[activeUser] ? "You’re fasting right now. You can still add water, activity, weight or steps. Food stays available whenever you need to backfill it." : "Add something whenever you’re ready. A little information is still useful information.") : `${activeUser} hasn’t added anything today.`}
          </div>
          {isMine && <button onClick={() => openLog(activeFasts[activeUser] ? "water" : "food")} style={{ ...bigButton(profileColor(activeUser), profileText(activeUser)), width: "auto", paddingInline: 20 }}>Add something</button>}
        </div>
      )}

      {isMine && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 700, margin: "0 2px 8px", textTransform: "uppercase", letterSpacing: ".06em" }}>Quick add</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
            {quick.map(([label, kind, Icon]) => (
              <button key={label} onClick={() => openLog(kind)} style={{ background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "10px 4px", fontSize: 11, fontWeight: 700, boxShadow: "0 3px 12px rgba(65,48,30,.035)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <Icon style={{ width: 14, height: 14 }} strokeWidth={2} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasAnything && (
        <>
          <div style={{ margin: "0 2px 8px", fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600 }}>Today so far</div>
          {summaryCards.some((c) => c.show) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {summaryCards.filter((c) => c.show).map(({ id, label, icon: Icon, value, sub }) => (
                <button key={id} onClick={() => openLog(id)} style={{ textAlign: "left", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "13px 14px", boxShadow: "0 4px 18px rgba(65,48,30,.04)", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}><Icon style={{ width: 14, height: 14 }} strokeWidth={2} />{label}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 3, lineHeight: 1.3 }}>{sub}</div>
                </button>
              ))}
            </div>
          )}

          <button onClick={() => openLog("food")} style={{ width: "100%", textAlign: "left", background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "1.2rem", marginBottom: "1rem", boxShadow: "0 6px 24px rgba(65,48,30,.045)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Utensils style={{ width: 16, height: 16, color: profileColor(activeUser, true) }} strokeWidth={2} /><div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600 }}>Food</div></div>
              <div style={{ color: TEXT_MUTED, fontSize: 12 }}>{todaysFoods.length} {todaysFoods.length === 1 ? "item" : "items"} logged →</div>
            </div>
            {activeFasts[activeUser] && todaysFoods.length === 0 ? (
              <div style={{ color: TEXT_MUTED, fontSize: 13 }}>Fasting · {fastElapsed(activeFasts[activeUser].started_at)} · food logging is still available for earlier meals.</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 5 }}><div style={{ fontSize: 18, fontWeight: 700 }}>{Math.round(ts.calories)} <span style={{ color: TEXT_MUTED, fontSize: 12, fontWeight: 500 }}>/ {targets.calories} cal</span></div></div>
                <div style={{ height: 8, borderRadius: 99, background: SURFACE_2, overflow: "hidden", marginBottom: 12 }}><div style={{ width: `${targets.calories ? Math.min(100, ts.calories / targets.calories * 100) : 0}%`, height: "100%", background: profileColor(activeUser), borderRadius: 99 }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "7px 14px" }}>
                  <div style={{ fontSize: 12 }}><span style={{ color: TEXT_MUTED }}>Protein</span> <strong>{Math.round(ts.protein)}g</strong></div>
                  <div style={{ fontSize: 12 }}><span style={{ color: TEXT_MUTED }}>Carbs</span> <strong>{Math.round(ts.carbs)}g</strong></div>
                  <div style={{ fontSize: 12 }}><span style={{ color: TEXT_MUTED }}>Fat</span> <strong>{Math.round(ts.fat)}g</strong></div>
                  <div style={{ fontSize: 12 }}><span style={{ color: TEXT_MUTED }}>Fiber</span> <strong>{Math.round(ts.fiber)}g</strong></div>
                </div>
              </>
            )}
          </button>
        </>
      )}

      {otherPeople.length > 0 && (
        <div style={cardStyle}>
          <div style={headingStyle}>People you’re with</div>
          {otherPeople.map((name) => {
            const o = todayStats[name];
            const od = data[name];
            const hasOther = od.foods.some((f) => f.date === today) || od.activities.some((a) => a.date === today) || o?.water > 0 || o?.steps != null || od.weights.some((w) => w.date === today);
            return (
              <button key={name} onClick={() => setActiveUser(name)} style={{ width: "100%", textAlign: "left", background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px", color: TEXT, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600 }}>{name}</span><span style={{ color: TEXT_MUTED, fontSize: 12 }}>View day →</span></div>
                <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 4 }}>{hasOther ? `${Math.round(o.calories)} cal logged${o.steps != null ? ` · ${o.steps.toLocaleString()} steps` : ""}${o.water > 0 ? ` · ${Math.round(o.water)} oz water` : ""}` : "Nothing shared today yet."}</div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
