import { brand, metricColors } from "../brand.jsx";
import { useEffect, useState } from "react";
import { Utensils, Scale, Dumbbell, Droplet, Footprints, Pencil, ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import { SunMark, WaveMark } from "../WithMarks.jsx";

function greeting(timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function fullDateLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function shiftDate(dateStr, delta) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function goalDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function weeksUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const ms = target - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (7 * 24 * 60 * 60 * 1000));
}

const PEN = {
  blue: metricColors.food,
  purple: metricColors.water,
  green: metricColors.activity,
  red: metricColors.weight,
  orange: metricColors.steps,
  ink: brand.text,
  soft: brand.surfaceSoft,
  rule: brand.border,
};

export default function TodayTab({
  activeUser,
  activeCanEdit,
  data,
  today,
  timeZone,
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
  deleteFood,
  editLoggedFood,
  profileColor,
  profileText,
  intentions,
  saveIntention,
  styles,
}) {
  const { SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, cardStyle, fieldLabel, inputStyle, bigButton } = styles;
  const u = data[activeUser];
  const targets = u.targets;
  const goalWeeks = weeksUntil(u.goalDate);
  const goalTiming = u.goalDate
    ? `${goalWeeks} ${goalWeeks === 1 ? "week" : "weeks"} to ${goalDateLabel(u.goalDate)}`
    : "";
  const isMine = activeCanEdit;
  const intention = intentions?.[activeUser] || "";
  const [editingIntention, setEditingIntention] = useState(false);
  const [intentionDraft, setIntentionDraft] = useState(intention);
  const [selectedDate, setSelectedDate] = useState(today);
  useEffect(() => { setSelectedDate(today); }, [today]);
  const [foodDetailOpen, setFoodDetailOpen] = useState(false);
  const isToday = selectedDate === today;

  const dayFoods = u.foods.filter((f) => f.date === selectedDate);
  const dayActivities = u.activities.filter((a) => a.date === selectedDate);
  const dayWeight = u.weights.filter((w) => w.date === selectedDate);
  const latestDayWeight = dayWeight.length ? dayWeight[dayWeight.length - 1].weight : null;
  const weightWindowStart = shiftDate(selectedDate, -6);
  const recentWeights = u.weights.filter((w) => w.date >= weightWindowStart && w.date <= selectedDate);
  const averageWeight = recentWeights.length
    ? recentWeights.reduce((sum, w) => sum + w.weight, 0) / recentWeights.length
    : null;
  const averageLabel = recentWeights.length >= 7 ? "7-day average" : "Average weight";
  const prevWeightEntry = u.weights.filter((w) => w.date < selectedDate).slice().sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  const totalActivityCals = dayActivities.reduce((sum, a) => sum + a.caloriesBurned, 0);
  const dayWater = u.water.filter((w) => w.date === selectedDate).reduce((sum, w) => sum + w.ounces, 0);
  const dayStepsEntry = u.steps.find((s) => s.date === selectedDate);
  const consumed = dayFoods.reduce((acc, f) => ({
    calories: acc.calories + f.calories,
    protein: acc.protein + f.protein,
    carbs: acc.carbs + f.carbs,
    fat: acc.fat + f.fat,
    fiber: acc.fiber + (f.fiber || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const ts = {
    ...consumed,
    burned: totalActivityCals,
    net: consumed.calories - totalActivityCals,
    water: dayWater,
    steps: dayStepsEntry ? dayStepsEntry.count : null,
  };
  const hasAnything = dayFoods.length > 0 || dayActivities.length > 0 || ts.water > 0 || ts.steps != null || dayWeight.length > 0;

  const mealOrder = ["Breakfast", "Lunch", "Dinner", "Snack"];
  const foodGroups = dayFoods.reduce((groups, food) => {
    const meal = food.meal || "Other";
    if (!groups[meal]) groups[meal] = [];
    groups[meal].push(food);
    return groups;
  }, {});
  const orderedMeals = [...mealOrder.filter((meal) => foodGroups[meal]), ...Object.keys(foodGroups).filter((meal) => !mealOrder.includes(meal))];

  useEffect(() => {
    setIntentionDraft(intention);
    setEditingIntention(false);
    setSelectedDate(today);
    setFoodDetailOpen(false);
  }, [activeUser, intention, today]);

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
      show: dayActivities.length > 0,
      value: dayActivities.length === 1 ? dayActivities[0].name : `${dayActivities.length} activities`,
      sub: `${Math.round(totalActivityCals)} cal burned`,
    },
    { id: "water", label: "Water", icon: Droplet, color: PEN.purple, show: ts.water > 0, value: `${Math.round(ts.water)} oz`, sub: isToday ? "Logged today" : "Logged that day" },
    { id: "steps", label: "Steps", icon: Footprints, color: PEN.orange, show: ts.steps != null, value: ts.steps != null ? ts.steps.toLocaleString() : "", sub: isToday ? "Logged today" : "Logged that day" },
    {
      id: "weight",
      label: "Weight",
      icon: Scale,
      color: PEN.red,
      show: latestDayWeight != null,
      value: averageWeight != null ? `${averageWeight.toFixed(1)} lb` : "",
      sub: [
        averageWeight != null ? averageLabel : null,
        latestDayWeight != null ? `Latest: ${latestDayWeight} lb` : null,
        isToday && goalTiming ? goalTiming : null,
      ].filter(Boolean).join(" · "),
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
          {isToday ? (isMine ? `${greeting(timeZone)}, ${activeUser}.` : `${activeUser} today`) : activeUser}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
          <button
            onClick={() => { setSelectedDate(shiftDate(selectedDate, -1)); setFoodDetailOpen(false); }}
            aria-label="Previous day"
            style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: "3px 2px", display: "grid", placeItems: "center" }}
          >
            <ChevronLeft style={{ width: 14, height: 14 }} strokeWidth={1.8} />
          </button>
          <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{isToday ? `It’s ${fullDateLabel(selectedDate)}` : fullDateLabel(selectedDate)}</div>
          {!isToday && (
            <button
              onClick={() => { setSelectedDate(shiftDate(selectedDate, 1)); setFoodDetailOpen(false); }}
              aria-label="Next day"
              style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: "3px 2px", display: "grid", placeItems: "center" }}
            >
              <ChevronRight style={{ width: 14, height: 14 }} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      {isToday && <section style={{ ...cardStyle, marginBottom: 22, padding: "1.15rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <WaveMark size={14} color={brand.teal} />
              <div style={sectionLabel}>{isMine ? "My intention" : `${activeUser}'s intention`}</div>
            </div>
            <div style={straightRule(brand.teal)} />
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
                background: brand.surface,
                borderRadius: 8,
                lineHeight: 1.45,
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
              <button onClick={() => { setIntentionDraft(intention); setEditingIntention(false); }} style={{ ...bigButton(SURFACE_2, TEXT), width: "auto", padding: "10px 14px", borderRadius: 7 }}>
                Cancel
              </button>
              <button onClick={commitIntention} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", padding: "10px 16px", borderRadius: 7 }}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            marginTop: 12,
            fontFamily: intention ? "'Newsreader', Georgia, serif" : "'DM Sans', -apple-system, sans-serif",
            fontStyle: intention ? "italic" : "normal",
            fontWeight: intention ? 600 : 600,
            fontSynthesis: intention ? "none" : "auto",
            fontSize: intention ? 20 : 15,
            lineHeight: 1.4,
            color: intention ? profileColor(activeUser) : TEXT_MUTED,
          }}>
            {intention || (isMine ? "Set one small thought to carry with you today." : `${activeUser} hasn’t set an intention yet.`)}
          </div>
        )}
      </section>}

      {isToday && isMine && (activeFasts[activeUser] || !fastPromptDismissedToday) && (
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
                  <button onClick={endFast} disabled={fastBusy} style={{ background: brand.surface, color: TEXT, border: `1px solid ${PEN.rule}`, borderRadius: 7, padding: "9px 12px", fontSize: 12, fontWeight: 700 }}>{fastBusy ? "Ending…" : "End fast"}</button>
                </>
              ) : (
                <>
                  <button onClick={dismissFastPromptToday} disabled={fastBusy} style={{ background: "transparent", color: TEXT_MUTED, border: `1px solid ${PEN.rule}`, borderRadius: 7, padding: "9px 10px", fontSize: 12, fontWeight: 700 }}>Not today</button>
                  <button onClick={() => openFastEditor()} disabled={fastBusy} style={{ background: brand.surface, color: TEXT, border: `1px solid ${PEN.rule}`, borderRadius: 7, padding: "9px 12px", fontSize: 12, fontWeight: 700 }}>Start fast</button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {isToday && isMine && fastEditorOpen && (
        <div style={{ background: brand.surface, border: `1px solid ${PEN.rule}`, borderRadius: 8, padding: "1rem", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 19, fontWeight: 600, marginBottom: 4 }}>{activeFasts[activeUser] ? "Edit fast start" : "When did your fast start?"}</div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 14 }}>It defaults to right now. Backdating is completely fine.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><div style={fieldLabel}>Date</div><input type="date" max={today} value={fastStartDate} onChange={(e) => setFastStartDate(e.target.value)} style={{ ...inputStyle, width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", padding: "10px 9px", fontSize: 15 }} /></div>
            <div><div style={fieldLabel}>Time</div><input type="time" value={fastStartTime} onChange={(e) => setFastStartTime(e.target.value)} style={inputStyle} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => setFastEditorOpen(false)} disabled={fastBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, borderRadius: 7 }}>Cancel</button>
            <button onClick={activeFasts[activeUser] ? updateFastStart : startFast} disabled={fastBusy} style={{ ...bigButton(brand.teal, brand.inkOn), borderRadius: 7 }}>{fastBusy ? "Saving…" : activeFasts[activeUser] ? "Save start" : "Start fast"}</button>
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
                onClick={() => openLog(kind, selectedDate)}
                style={{
                  background: "transparent",
                  color: PEN.ink,
                  border: `1px solid ${PEN.rule}`,
                  borderTop: `3px solid ${color}`,
                  borderRadius: 9,
                  padding: "10px 3px 9px",
                  boxShadow: "none",
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SunMark size={18} color={PEN.orange} />
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 22, fontWeight: 600, color: PEN.ink }}>
              {isMine ? (activeFasts[activeUser] ? "Your day is underway." : "Nothing here yet.") : "Nothing shared yet."}
            </div>
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
            <div style={sectionLabel}>{isToday ? "Today so far" : "Day at a glance"}</div>
            <div style={straightRule(PEN.blue)} />
            <div style={{ marginTop: 10 }}>
              {metricRows.filter((m) => m.show).map(({ id, label, icon: Icon, color, value, sub }) => (
                <button
                  key={id}
                  onClick={() => openLog(id, selectedDate)}
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
              onClick={() => setFoodDetailOpen(true)}
              style={{ width: "100%", textAlign: "left", background: "transparent", color: TEXT, border: "none", padding: 0 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={sectionLabel}>Food</div>
                  <div style={straightRule(PEN.blue)} />
                </div>
                <div style={{ color: TEXT_MUTED, fontSize: 12 }}>{dayFoods.length} {dayFoods.length === 1 ? "item" : "items"} logged →</div>
              </div>

              {isToday && activeFasts[activeUser] && dayFoods.length === 0 ? (
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

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 14px" }}>
                    {[
                      ["Protein", Math.round(ts.protein), targets.protein, PEN.green],
                      ["Carbs", Math.round(ts.carbs), targets.carbs, PEN.orange],
                      ["Fat", Math.round(ts.fat), targets.fat, PEN.purple],
                      ["Fiber", Math.round(ts.fiber), targets.fiberMin, PEN.red],
                    ].map(([label, value, target, color]) => (
                      <div key={label} style={{ display: "grid", gridTemplateColumns: "8px 1fr auto", alignItems: "center", gap: 7 }}>
                        <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                        <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>{label}</span>
                        <span className="num" style={{ fontSize: 13, color: PEN.ink, fontWeight: 700 }}>
                          {value} <span style={{ color: TEXT_MUTED, fontWeight: 500 }}>/ {target || "—"}g</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </button>
          </section>
        </>
      )}

      {foodDetailOpen && (
        <div
          onClick={() => setFoodDetailOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(37,36,34,.28)",
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "78vh",
              overflowY: "auto",
              background: brand.surface,
              borderRadius: "18px 18px 0 0",
              padding: "18px 18px calc(18px + env(safe-area-inset-bottom))",
              boxShadow: "0 -12px 40px rgba(37,36,34,.16)",
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: PEN.rule, margin: "0 auto 15px" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 24, fontWeight: 600, color: PEN.ink }}>Food</div>
                <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 3 }}>{fullDateLabel(selectedDate)}</div>
              </div>
              <button
                onClick={() => setFoodDetailOpen(false)}
                aria-label="Close food details"
                style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: 5, display: "grid", placeItems: "center" }}
              >
                <X style={{ width: 19, height: 19 }} />
              </button>
            </div>

            {dayFoods.length === 0 ? (
              <div style={{ color: TEXT_MUTED, fontSize: 14, padding: "8px 0 18px" }}>No food logged for this day.</div>
            ) : (
              <div>
                {orderedMeals.map((meal) => (
                  <div key={meal} style={{ marginBottom: 18 }}>
                    <div style={{ ...sectionLabel, marginBottom: 6 }}>{meal}</div>
                    {foodGroups[meal].map((food) => (
                      <div
                        key={food.id}
                        style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%", borderBottom: `1px solid ${PEN.rule}`, padding: "10px 0" }}
                      >
                        <button
                          onClick={() => { if (isMine) { setFoodDetailOpen(false); editLoggedFood(food); } }}
                          disabled={!isMine}
                          style={{ flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "transparent", color: TEXT, padding: 0, cursor: isMine ? "pointer" : "default" }}
                        >
                          <div style={{ fontWeight: 800, fontSize: 14, color: PEN.ink }}>{food.name}</div>
                          <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 4, lineHeight: 1.45 }}>
                            {Math.round(food.calories)} cal · {Math.round(food.fat)}g fat · {Math.round(food.carbs)}g carbs · {Math.round(food.fiber || 0)}g fiber · {Math.round(food.protein)}g protein
                          </div>
                          {food.notes && <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 4 }}>{food.notes}</div>}
                        </button>
                        {isMine && (
                          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                            <button
                              onClick={() => { setFoodDetailOpen(false); editLoggedFood(food); }}
                              aria-label={`Edit ${food.name}`}
                              style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: 7, display: "grid", placeItems: "center" }}
                            >
                              <Pencil style={{ width: 15, height: 15 }} strokeWidth={1.8} />
                            </button>
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Remove ${food.name} from this day?`)) return;
                                await deleteFood(food.id);
                              }}
                              aria-label={`Delete ${food.name}`}
                              style={{ border: "none", background: "transparent", color: "#A64B43", padding: 7, display: "grid", placeItems: "center" }}
                            >
                              <Trash2 style={{ width: 15, height: 15 }} strokeWidth={1.8} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {isMine && (
              <button
                onClick={() => { setFoodDetailOpen(false); openLog("food", selectedDate); }}
                style={{ ...bigButton(brand.teal, brand.inkOn), marginTop: 4, borderRadius: 8 }}
              >
                + Add food
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
