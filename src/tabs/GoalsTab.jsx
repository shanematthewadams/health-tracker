function weeksUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const ms = target - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (7 * 24 * 60 * 60 * 1000));
}

import { brand } from "../brand.jsx";
import { AsteriskMark, StarMark } from "../WithMarks.jsx";

export default function GoalsTab({
  activeUser,
  activeCanEdit,
  data,
  gi,
  editingGoals,
  setEditingGoals,
  goalInput,
  setGoalInput,
  goalDateInput,
  goalError,
  setGoalDateInput,
  tBmr,
  setTBmr,
  tCal,
  setTCal,
  tProtein,
  setTProtein,
  tCarbs,
  setTCarbs,
  tFat,
  setTFat,
  tFiberMin,
  setTFiberMin,
  tFiberMax,
  setTFiberMax,
  saveGoal,
  saveTargets,
  fmtGoalDate,
  styles,
}) {
  const { SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, cardStyle, fieldLabel, inputStyle, bigButton } = styles;
  const user = data[activeUser];
  const goalWeeks = weeksUntil(user.goalDate);
  const hasGoal = !!(user.goalWeight || user.goalDate);
  const hasTargets = !!(user.targets.calories || user.targets.protein || user.targets.carbs || user.targets.fat || user.targets.fiberMin || user.targets.fiberMax);
  const hasAnything = hasGoal || hasTargets || user.targets.bmr;

  const sectionLabel = {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".08em",
  };

  const targetRow = (label, value, last = false) => (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "10px 0",
      borderBottom: last ? "none" : `1px solid ${BORDER}`,
    }}>
      <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{label}</span>
      <strong style={{ color: TEXT, fontSize: 14 }}>{value}</strong>
    </div>
  );

  return (
    <>
      <div style={{ padding: "0.2rem 0.1rem 1.05rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>Goals</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Where you’re headed, and what helps you get there.</div>
      </div>

      {!hasAnything ? (
        <div style={{ ...cardStyle, background: SURFACE_2, borderColor: BORDER }}>
          <div style={{ ...sectionLabel, marginBottom: 10 }}>Your goal</div>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 25, fontWeight: 600, marginBottom: 7 }}>What are you working toward?</div>
          <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>
            Set a weight goal and the daily nutrition targets that support it. They’re yours, and you can change them anytime.
          </div>
          {activeCanEdit && (
            <button onClick={() => setEditingGoals(true)} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", paddingInline: 18 }}>
              Set your goal
            </button>
          )}
        </div>
      ) : !editingGoals ? (
        <>
          <section style={{ ...cardStyle, padding: "1.2rem 1.15rem 1.15rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div style={sectionLabel}>Your goal</div>
              {activeCanEdit && (
                <button
                  onClick={() => setEditingGoals(true)}
                  style={{ background: "none", border: "none", color: brand.tealDark, fontWeight: 800, fontSize: 12, padding: 0 }}
                >
                  Edit
                </button>
              )}
            </div>

            {hasGoal ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "5px 9px" }}>
                    <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 40, fontWeight: 600, lineHeight: 0.95, color: TEXT }}>
                      {user.goalWeight ? `${user.goalWeight} lb` : "Your goal"}
                    </div>
                    {user.goalDate && (
                      <div style={{ color: TEXT_MUTED, fontSize: 13 }}>
                        by {fmtGoalDate(user.goalDate)}
                      </div>
                    )}
                  </div>
                  {user.goalDate && goalWeeks != null && (
                    <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 8 }}>
                      {goalWeeks === 0 ? "Your goal date is here." : `${goalWeeks} ${goalWeeks === 1 ? "week" : "weeks"} from now.`}
                    </div>
                  )}
                </div>

                {gi && gi.goal != null ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 16 }}>
                      {[
                        ["Started", `${gi.start} lb`],
                        ["7-day avg", `${gi.latest.toFixed(1)} lb`],
                        ["To go", gi.remaining > 0 ? `${gi.remaining.toFixed(1)} lb` : "You’re there"],
                      ].map(([label, value]) => (
                        <div key={label} style={{ background: SURFACE_2, borderRadius: 12, padding: "10px 9px" }}>
                          <div style={{ color: TEXT_MUTED, fontSize: 10, marginBottom: 3 }}>{label}</div>
                          <div style={{ color: TEXT, fontSize: 15, fontWeight: 800, lineHeight: 1.15 }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 7, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ color: TEXT, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                        {gi.progressAmount > 0 && <StarMark size={15} color={brand.sun} />}
                        <span>{gi.progressAmount > 0 ? `${gi.progressAmount.toFixed(1)} lb closer than where you started` : "This is where you’re starting."}</span>
                      </div>
                      <div style={{ color: TEXT_MUTED, fontSize: 12, flexShrink: 0 }}>{Math.round(gi.progressPct)}%</div>
                    </div>

                    <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.4, marginBottom: 12 }}>
                      Progress uses your rolling 7-day average so a single weigh-in doesn’t tell the whole story.
                      {gi.latestActual != null && <> Latest weigh-in: <strong style={{ color: TEXT }}>{gi.latestActual} lb</strong>.</>}
                    </div>

                    <div style={{ height: 7, background: SURFACE_2, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, Math.max(0, gi.progressPct))}%`, height: "100%", background: brand.teal, borderRadius: 999 }} />
                    </div>
                  </>
                ) : (
                  <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.5 }}>
                    Log a weight when you’re ready and your progress will start taking shape here.
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.55 }}>
                You haven’t set a weight goal yet.
              </div>
            )}
          </section>

          <section style={{ padding: "0.2rem 1.15rem 0.55rem", marginBottom: "0.35rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 23, fontWeight: 600, lineHeight: 1.08 }}>Daily targets</div>
                <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>The everyday numbers you’re aiming for along the way.</div>
              </div>
              {activeCanEdit && (
                <button
                  onClick={() => setEditingGoals(true)}
                  style={{ background: "none", border: "none", color: brand.tealDark, fontWeight: 800, fontSize: 12, padding: "4px 0 0", flexShrink: 0 }}
                >
                  Edit
                </button>
              )}
            </div>

            {hasTargets ? (
              <div style={{ marginTop: 8 }}>
                {targetRow("Calories", user.targets.calories ? user.targets.calories.toLocaleString() : "—")}
                {targetRow("Protein", user.targets.protein ? `${user.targets.protein}g` : "—")}
                {targetRow("Carbs", user.targets.carbs ? `${user.targets.carbs}g` : "—")}
                {targetRow("Fat", user.targets.fat ? `${user.targets.fat}g` : "—")}
                {targetRow("Fiber", user.targets.fiberMin || user.targets.fiberMax ? `${user.targets.fiberMin || "—"}–${user.targets.fiberMax || "—"}g` : "—", true)}
              </div>
            ) : (
              <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.5, marginTop: 12 }}>
                You haven’t set daily nutrition targets yet.
              </div>
            )}
          </section>

          <section style={{ padding: "4px 1.15rem 8px" }}>
            <details>
              <summary style={{ cursor: "pointer", color: brand.tealDark, fontWeight: 800, fontSize: 12, listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <AsteriskMark size={13} color={brand.teal} />
                About your targets
              </summary>
              <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.55, padding: "10px 0 4px 2px" }}>
                {user.targets.bmr
                  ? <>Your estimated BMR is <strong style={{ color: TEXT }}>{user.targets.bmr.toLocaleString()} calories</strong>. It’s background information used to help make sense of your daily targets, not another goal you have to hit.</>
                  : "BMR is background information that can help make sense of your daily targets. It isn’t another goal to hit."}
              </div>
            </details>
          </section>
        </>
      ) : (
        <div style={cardStyle}>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 24, fontWeight: 600, marginBottom: 18 }}>Edit your goal</div>

          <div style={{ ...sectionLabel, marginBottom: 10 }}>Where you’re headed</div>
          <div style={fieldLabel}>Goal weight (lb)</div>
          <input type="number" step="0.1" inputMode="decimal" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
          <div style={fieldLabel}>Goal date</div>
          <div style={{ width: "100%", height: 48, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 1px 0 rgba(45,35,25,.03)", overflow: "hidden", marginBottom: 20 }}>
            <input
              type="date"
              value={goalDateInput}
              onChange={(e) => setGoalDateInput(e.target.value)}
              style={{ width: "100%", height: "100%", border: "none", background: "transparent", color: TEXT, padding: "0 14px", fontSize: 16, fontFamily: "'DM Sans', -apple-system, sans-serif", boxSizing: "border-box", minWidth: 0, maxWidth: "100%" }}
            />
          </div>

          <div style={{ ...sectionLabel, marginBottom: 5 }}>Daily targets</div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginBottom: 12 }}>
            These support where you’re headed. They’re targets, not a scorecard.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            <div><div style={fieldLabel}>Calories</div><input type="number" value={tCal} onChange={(e) => setTCal(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Protein (g)</div><input type="number" step="0.1" inputMode="decimal" value={tProtein} onChange={(e) => setTProtein(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Carbs (g)</div><input type="number" step="0.1" inputMode="decimal" value={tCarbs} onChange={(e) => setTCarbs(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Fat (g)</div><input type="number" step="0.1" inputMode="decimal" value={tFat} onChange={(e) => setTFat(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Fiber min (g)</div><input type="number" step="0.1" inputMode="decimal" value={tFiberMin} onChange={(e) => setTFiberMin(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Fiber max (g)</div><input type="number" step="0.1" inputMode="decimal" value={tFiberMax} onChange={(e) => setTFiberMax(e.target.value)} style={inputStyle} /></div>
          </div>

          <div style={{ ...sectionLabel, marginBottom: 5 }}>About your targets</div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginBottom: 10 }}>
            BMR is useful context for your targets, not another daily goal.
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={fieldLabel}>Estimated BMR</div>
            <input type="number" value={tBmr} onChange={(e) => setTBmr(e.target.value)} style={inputStyle} />
          </div>

          {goalError && <div style={{ color: styles.WARN || brand.warn, fontSize: 12, marginBottom: 10 }}>{goalError}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => setEditingGoals(false)} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
            <button
              onClick={async () => {
                const goalOk = await saveGoal();
                if (goalOk === false) return;
                const targetsOk = await saveTargets();
                if (targetsOk === false) return;
                setEditingGoals(false);
              }}
              disabled={!activeCanEdit}
              style={bigButton(brand.teal, brand.inkOn)}
            >
              Save changes
            </button>
          </div>
        </div>
      )}
    </>
  );
}
