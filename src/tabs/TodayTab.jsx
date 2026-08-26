import { useEffect, useState } from "react";
import { Utensils, Scale, Dumbbell, Droplet, Footprints, Pencil } from "lucide-react";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function fullTodayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

const PEN = {
  blue: "#1F5EFF",
  purple: "#6C3FE8",
  green: "#16865C",
  red: "#D53A32",
  orange: "#E86F1C",
  ink: "#252422",
  soft: "#F7F3EC",
  rule: "#E6E1D8",
};

export default function TodayTab({
  activeUser,
  activeCanEdit,
  data,
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
  profileColor,
  profileText,
  intentions,
  saveIntention,
  styles,
}) {
  const { SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, fieldLabel, inputStyle, bigButton } = styles;
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
  const intention = intentions?.[activeUser] || "";
  const [editingIntention, setEditingIntention] = useState(false);
  const [intentionDraft, setIntentionDraft] = useState(intention);

  useEffect(() => {
    setIntentionDraft(intention);
    setEditingIntention(false);
  }, [activeUser, intention]);

  const quick = [
    ["Food", "food", Utensils, PEN.blue],
    ["Weight", "weight", Scale, PEN.red],
    ["Activity", "activity", Dumbbell, PEN.green],
    ["Water", "water", Droplet, PEN.purple],
    ["Steps", "steps", Footprints, PEN.orange],
  ];

  const metricRows = [
    {
      id: "activity",
      label: "Activity",
      icon: Dumbbell,
      color: PEN.green,
      show: todaysActivities.length > 0,
      value: todaysActivities.length === 1 ? todaysActivities[0].name : `${todaysActivities.length} activities`,
      sub: `${Math.round(totalActivityCals)} cal burned`,
    },
    { id: "water", label: "Water", icon: Droplet, color: PEN.purple, show: ts.water > 0, value: `${Math.round(ts.water)} oz`, sub: "Logged today" },
    { id: "steps", label: "Steps", icon: Footprints, color: PEN.orange, show: ts.steps != null, value: ts.steps != null ? ts.steps.toLocaleString() : "", sub: "Logged today" },
    {
      id: "weight",
      label: "Weight",
      icon: Scale,
      color: PEN.red,
      show: latestTodayWeight != null,
      value: latestTodayWeight != null ? `${latestTodayWeight} lb` : "",
      sub: latestTodayWeight != null && prevWeightEntry
        ? `${latestTodayWeight < prevWeightEntry.weight ? "↓" : latestTodayWeight > prevWeightEntry.weight ? "↑" : "→"} ${Math.abs(latestTodayWeight - prevWeightEntry.weight).toFixed(1)} lb from last weigh-in`
        : "Logged today",
    },
  ];

  async function commitIntention() {
    const next = intentionDraft.trim();
    const ok = await saveIntention(next);
    if (ok) setEditingIntention(false);
  }

  const sectionLabel = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: ".11em",
    fontWeight: 800,
    color: TEXT_MUTED,
  };

  const straightRule = (color) => ({
    height: 3,
    width: 46,
    background: color,
    borderRadius: 0,
    marginTop: 7,
  });

  return (
    <div style={{ background: "#FEFDF9" }}>
      <div style={{ padding: "0.25rem 0.1rem 1rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 600, fontSize: 31, lineHeight: 1.08, color: PEN.ink }}>
          {isMine ? `${greeting()}, ${activeUser}.` : `${activeUser} today`}
        </div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 6 }}>{fullTodayLabel()}</div>
      </div>

      <section style={{ marginBottom: 28, paddingBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={sectionLabel}>{isMine ? "My intention" : `${activeUser}'s intention`}</div>
            <div style={straightRule(profileColor(activeUser))} />
          </div>
          {isMine && !editingIntention && (
            <button
              onClick={() => setEditingIntention(true)}
              aria-label={intention ? "Edit intention" : "Set intention"}
              style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: 6, display: "grid", placeItems: "center" }}
            >
              <Pencil style={{ width: 16, height: 16 }} strokeWidth={1.8} />
            </button>
          )}
        </div>

        {isMine && editingIntention ? (
          <div style={{ marginTop: 14 }}>
            <textarea
              autoFocus
              maxLength={280}
              rows={3}
              value={intentionDraft}
              onChange={(e) => setIntentionDraft(e.target.value)}
              placeholder="What do you want to keep in mind today?"
              style={{
                ...inputStyle,
                minHeight: 88,
                resize: "vertical",
                background: "#FFFDF9",
                borderRadius: 8,
                lineHeight: 1.45,
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
              <button onClick={() => { setIntentionDraft(intention); setEditingIntention(false); }} style={{ ...bigButton(SURFACE_2, TEXT), width: "auto", padding: "10px 14px", borderRadius: 7 }}>
                Cancel
              </button>
              <button onClick={commitIntention} style={{ ...bigButton(profileColor(activeUser), profileText(activeUser)), width: "auto", padding: "10px 16px", borderRadius: 7 }}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            marginTop: 12,
            fontFamily: intention ? "'Shadows Into Light', cursive" : "'DM Sans', -apple-system, sans-serif",
            fontStyle: intention ? "italic" : "normal",
            fontWeight: intention ? 500 : 600,
            fontSize: intention ? 21 : 15,
            lineHeight: 1.4,
            color: intention ? profileColor(activeUser) : TEXT_MUTED,
          }}>
            {intention || (isMine ? "Set one small thought to carry with you today." : `${activeUser} hasn’t set an intention yet.`)}
          </div>
        )}
      </section>

      {isMine && (activeFasts[activeUser] || !fastPromptDismissedToday) && (
        <section style={{ marginBottom: 28, paddingBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={sectionLabel}>{activeFasts[activeUser] ? "Fasting" : "A note for today"}</div>
              <div style={straightRule(PEN.orange)} />
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 19, fontWeight: 600, color: PEN.ink, marginTop: 10 }}>
                {activeFasts[activeUser] ? "You’re fasting" : "Fasting today?"}
              </div>
              <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
                {activeFasts[activeUser]
                  ? `Started ${new Date(activeFasts[activeUser].started_at).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })} · ${fastElapsed(activeFasts[activeUser].started_at)}`
                  : "WITH can adjust your Today prompts while you fast."}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {activeFasts[activeUser] ? (
                <>
                  <button onClick={() => openFastEditor(activeFasts[activeUser])} disabled={fastBusy} style={{ background: "transparent", color: TEXT_MUTED, border: `1px solid ${PEN.rule}`, borderRadius: 7, padding: "9px 10px", fontSize: 12, fontWeight: 700 }}>Edit</button>
                  <button onClick={endFast} disabled={fastBusy} style={{ background: "#FFFDF9", color: TEXT, border: `1px solid ${PEN.rule}`, borderRadius: 7, padding: "9px 12px", fontSize: 12, fontWeight: 700 }}>{fastBusy ? "Ending…" : "End fast"}</button>
                </>
              ) : (
                <>
                  <button onClick={dismissFastPromptToday} disabled={fastBusy} style={{ background: "transparent", color: TEXT_MUTED, border: `1px solid ${PEN.rule}`, borderRadius: 7, padding: "9px 10px", fontSize: 12, fontWeight: 700 }}>Not today</button>
                  <button onClick={() => openFastEditor()} disabled={fastBusy} style={{ background: "#FFFDF9", color: TEXT, border: `1px solid ${PEN.rule}`, borderRadius: 7, padding: "9px 12px", fontSize: 12, fontWeight: 700 }}>Start fast</button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {isMine && fastEditorOpen && (
        <div style={{ background: "#FFFDF9", border: `1px solid ${PEN.rule}`, borderRadius: 8, padding: "1rem", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 19, fontWeight: 600, marginBottom: 4 }}>{activeFasts[activeUser] ? "Edit fast start" : "When did your fast start?"}</div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 14 }}>It defaults to right now. Backdating is completely fine.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><div style={fieldLabel}>Date</div><input type="date" max={today} value={fastStartDate} onChange={(e) => setFastStartDate(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Time</div><input type="time" value={fastStartTime} onChange={(e) => setFastStartTime(e.target.value)} style={inputStyle} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => setFastEditorOpen(false)} disabled={fastBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, borderRadius: 7 }}>Cancel</button>
            <button onClick={activeFasts[activeUser] ? updateFastStart : startFast} disabled={fastBusy} style={{ ...bigButton(profileColor(activeUser), profileText(activeUser)), borderRadius: 7 }}>{fastBusy ? "Saving…" : activeFasts[activeUser] ? "Save start" : "Start fast"}</button>
          </div>
        </div>
      )}

      {isMine && (
        <section style={{ marginBottom: 30 }}>
          <div style={sectionLabel}>Quick add</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7, marginTop: 10 }}>
            {quick.map(([label, kind, Icon, color]) => (
              <button
                key={label}
                onClick={() => openLog(kind)}
                style={{
                  background: "#FFFDF9",
                  color: PEN.ink,
                  border: `1px solid ${PEN.rule}`,
                  borderTop: `4px solid ${color}`,
                  borderRadius: 9,
                  padding: "11px 3px 9px",
                  boxShadow: "0 2px 7px rgba(63,52,39,.055)",
                  fontSize: 11,
                  fontWeight: 800,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Icon style={{ width: 15, height: 15, color }} strokeWidth={2} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!hasAnything ? (
        <section style={{ padding: "24px 0 28px" }}>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 22, fontWeight: 600, color: PEN.ink }}>
            {isMine ? (activeFasts[activeUser] ? "Your day is underway." : "Nothing here yet.") : "Nothing shared yet."}
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginTop: 6, maxWidth: 390 }}>
            {isMine
              ? (activeFasts[activeUser]
                ? "You’re fasting right now. You can still add water, activity, weight or steps."
                : "Add something whenever you’re ready. A little information is still useful information.")
              : `${activeUser} hasn’t added anything today.`}
          </div>
        </section>
      ) : (
        <>
          <section style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Today so far</div>
            <div style={straightRule(PEN.blue)} />
            <div style={{ marginTop: 10 }}>
              {metricRows.filter((m) => m.show).map(({ id, label, icon: Icon, color, value, sub }) => (
                <button
                  key={id}
                  onClick={() => openLog(id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    color: TEXT,
                    border: "none",
                    borderBottom: `1px solid ${PEN.rule}`,
                    borderRadius: 0,
                    padding: "12px 0",
                    display: "grid",
                    gridTemplateColumns: "22px 1fr auto",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color }} strokeWidth={2} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                    <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{sub}</div>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: PEN.ink }}>{value}</div>
                </button>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 10 }}>
            <button
              onClick={() => openLog("food")}
              style={{ width: "100%", textAlign: "left", background: "transparent", color: TEXT, border: "none", padding: 0 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={sectionLabel}>Food</div>
                  <div style={straightRule(PEN.blue)} />
                </div>
                <div style={{ color: TEXT_MUTED, fontSize: 12 }}>{todaysFoods.length} {todaysFoods.length === 1 ? "item" : "items"} logged →</div>
              </div>

              {activeFasts[activeUser] && todaysFoods.length === 0 ? (
                <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 12 }}>Fasting · {fastElapsed(activeFasts[activeUser].started_at)} · food logging is still available for earlier meals.</div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
                    <div className="num" style={{ fontSize: 26, fontWeight: 800, color: PEN.ink }}>{Math.round(ts.calories)}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 12 }}>/ {targets.calories} cal</div>
                  </div>

                  <div style={{ height: 4, background: PEN.soft, overflow: "hidden", margin: "8px 0 14px" }}>
                    <div style={{ width: `${targets.calories ? Math.min(100, ts.calories / targets.calories * 100) : 0}%`, height: "100%", background: PEN.blue }} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                    {[
                      ["Protein", Math.round(ts.protein), "g", PEN.green],
                      ["Carbs", Math.round(ts.carbs), "g", PEN.orange],
                      ["Fat", Math.round(ts.fat), "g", PEN.purple],
                      ["Fiber", Math.round(ts.fiber), "g", PEN.red],
                    ].map(([label, value, unit, color]) => (
                      <div key={label} style={{ borderTop: `2px solid ${color}`, paddingTop: 7 }}>
                        <div style={{ fontSize: 10, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 800 }}>{label}</div>
                        <div className="num" style={{ fontSize: 15, fontWeight: 800, color: PEN.ink, marginTop: 2 }}>{value}{unit}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
