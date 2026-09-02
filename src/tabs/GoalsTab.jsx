function weeksUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const ms = target - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (7 * 24 * 60 * 60 * 1000));
}

import { useEffect, useState } from "react";
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
  goalStatementInput,
  setGoalStatementInput,
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
  tWater,
  setTWater,
  tSteps,
  setTSteps,
  saveGoal,
  saveTargets,
  fmtGoalDate,
  walkthrough,
  updateWalkthrough,
  styles,
}) {
  const { SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, cardStyle, fieldLabel, inputStyle, bigButton } = styles;
  const user = data[activeUser];
  const [showWalkthroughIntro, setShowWalkthroughIntro] = useState(() => Boolean(walkthrough?.active && !walkthrough?.goalsIntroSeen));

  useEffect(() => {
    if (showWalkthroughIntro && walkthrough?.active && !walkthrough?.goalsIntroSeen) {
      updateWalkthrough?.({ goalsIntroSeen: true });
    }
  }, []);

  const goalWeeks = weeksUntil(user.goalDate);
  const hasWeightGoal = user.goalWeight != null;
  const hasStatement = Boolean(user.goalStatement);
  const hasNutritionTargets = Boolean(user.targets.calories || user.targets.protein || user.targets.carbs || user.targets.fat || user.targets.fiberMin || user.targets.fiberMax);
  const hasDailyTargets = Boolean(hasNutritionTargets || user.targets.water || user.targets.steps);
  const hasAnything = Boolean(hasStatement || hasWeightGoal || user.goalDate || hasDailyTargets);

  const sectionLabel = {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".08em",
  };

  const targetRows = [
    user.targets.steps ? ["Steps", user.targets.steps.toLocaleString()] : null,
    user.targets.water ? ["Water", `${user.targets.water} oz`] : null,
    user.targets.calories ? ["Calories", user.targets.calories.toLocaleString()] : null,
    user.targets.protein ? ["Protein", `${user.targets.protein}g`] : null,
    user.targets.carbs ? ["Carbs", `${user.targets.carbs}g`] : null,
    user.targets.fat ? ["Fat", `${user.targets.fat}g`] : null,
    (user.targets.fiberMin || user.targets.fiberMax) ? ["Fiber", `${user.targets.fiberMin || "—"}–${user.targets.fiberMax || "—"}g`] : null,
  ].filter(Boolean);

  const trendDelta = gi ? gi.latest - gi.start : 0;
  const trendDirectionText = !gi || Math.abs(trendDelta) < 0.05
    ? "Your trend is about where you started."
    : `${Math.abs(trendDelta).toFixed(1)} lb ${trendDelta < 0 ? "down" : "up"} from where you started`;

  return (
    <>
      <div style={{ padding: "0.2rem 0.1rem 1.05rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>Goals</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>What matters to you, and the things you want to keep an eye on.</div>
      </div>

      {showWalkthroughIntro && (
        <section style={{ ...cardStyle, background: SURFACE_2, borderColor: BORDER, padding: "1rem 1.05rem", marginBottom: 14 }}>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 21, fontWeight: 600, lineHeight: 1.1, marginBottom: 6 }}>Choose what you’re working toward.</div>
          <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
            Goals are optional. Set the ones that are useful to you, skip the rest, and change them whenever you need to.
          </div>
          <button type="button" onClick={() => setShowWalkthroughIntro(false)} style={{ background: "none", border: "none", color: brand.tealDark, padding: 0, fontSize: 12, fontWeight: 800 }}>Got it</button>
        </section>
      )}

      {!hasAnything ? (
        <div style={{ ...cardStyle, background: SURFACE_2, borderColor: BORDER }}>
          <div style={{ ...sectionLabel, marginBottom: 10 }}>Your goals</div>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 25, fontWeight: 600, marginBottom: 7 }}>What are you working toward?</div>
          <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>
            You don’t need a goal to use With. If something matters to you, put it here in your own words or add a number you’d like to track along the way.
          </div>
          {activeCanEdit && (
            <button onClick={() => setEditingGoals(true)} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", paddingInline: 18 }}>
              Add a goal
            </button>
          )}
        </div>
      ) : !editingGoals ? (
        <>
          {hasStatement && (
            <section style={{ ...cardStyle, padding: "1.2rem 1.15rem", borderTop: "3px solid " + brand.teal }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 9 }}>
                <div style={sectionLabel}>What I’m working toward</div>
                {activeCanEdit && <button onClick={() => setEditingGoals(true)} style={{ background: "none", border: "none", color: brand.tealDark, fontWeight: 800, fontSize: 12, padding: 0 }}>Edit</button>}
              </div>
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 25, fontWeight: 600, fontStyle: "italic", lineHeight: 1.25, color: TEXT }}>
                {user.goalStatement}
              </div>
            </section>
          )}

          {hasWeightGoal && (
            <section style={{ ...cardStyle, padding: "1.2rem 1.15rem 1.15rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div style={sectionLabel}>Weight goal</div>
                {activeCanEdit && <button onClick={() => setEditingGoals(true)} style={{ background: "none", border: "none", color: brand.tealDark, fontWeight: 800, fontSize: 12, padding: 0 }}>Edit</button>}
              </div>

              {gi && gi.goal != null ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 43, fontWeight: 600, lineHeight: 0.95, color: TEXT }}>{Math.round(gi.progressPct)}%</div>
                      <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 5 }}>of the way to your goal</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: TEXT, fontSize: 15, fontWeight: 800 }}>{user.goalWeight} lb</div>
                      {user.goalDate && <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 3 }}>by {fmtGoalDate(user.goalDate)}</div>}
                    </div>
                  </div>

                  <div style={{ height: 7, background: SURFACE_2, borderRadius: 999, overflow: "hidden", marginBottom: 16 }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, gi.progressPct))}%`, height: "100%", background: brand.teal, borderRadius: 999 }} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 14 }}>
                    {[
                      ["Started", `${gi.start} lb`],
                      ["Current trend", `${gi.latest.toFixed(1)} lb`],
                      ["Goal", `${user.goalWeight} lb`],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: SURFACE_2, borderRadius: 12, padding: "10px 9px" }}>
                        <div style={{ color: TEXT_MUTED, fontSize: 10, marginBottom: 3 }}>{label}</div>
                        <div style={{ color: TEXT, fontSize: 14, fontWeight: 800, lineHeight: 1.15 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ color: TEXT, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    {Math.abs(trendDelta) >= 0.05 && <StarMark size={15} color={brand.sun} />}
                    <span>{trendDirectionText}.</span>
                  </div>
                  <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45 }}>
                    Current trend uses your rolling 7-day average. Latest weigh-in: <strong style={{ color: TEXT }}>{gi.latestActual} lb</strong>.
                    {user.goalDate && goalWeeks != null && <> {goalWeeks === 0 ? "Your goal date is here." : `${goalWeeks} ${goalWeeks === 1 ? "week" : "weeks"} from now.`}</>}
                  </div>
                </>
              ) : (
                <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.5 }}>
                  Your goal is {user.goalWeight} lb. Log a weight when you’re ready and your progress will start taking shape here.
                </div>
              )}
            </section>
          )}

          <section style={{ padding: "0.2rem 1.15rem 0.55rem", marginBottom: "0.35rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 23, fontWeight: 600, lineHeight: 1.08 }}>What I’m tracking along the way</div>
                <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>Daily targets are optional. A blank target is simply something you’re not aiming for right now.</div>
              </div>
              {activeCanEdit && <button onClick={() => setEditingGoals(true)} style={{ background: "none", border: "none", color: brand.tealDark, fontWeight: 800, fontSize: 12, padding: "4px 0 0", flexShrink: 0 }}>Edit</button>}
            </div>

            {targetRows.length ? (
              <div style={{ marginTop: 8 }}>
                {targetRows.map(([label, value], index) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: index === targetRows.length - 1 ? "none" : `1px solid ${BORDER}` }}>
                    <span style={{ color: TEXT_MUTED, fontSize: 13 }}>{label}</span>
                    <strong style={{ color: TEXT, fontSize: 14 }}>{value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.5, marginTop: 12 }}>No daily targets set. Tracking still works normally.</div>
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
                  ? <>Your estimated BMR is <strong style={{ color: TEXT }}>{user.targets.bmr.toLocaleString()} calories</strong>. It’s background information used to help make sense of nutrition targets, not another goal you have to hit.</>
                  : "BMR is optional background information that can help make sense of nutrition targets. It isn’t another goal to hit."}
              </div>
            </details>
          </section>
        </>
      ) : (
        <div style={cardStyle}>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Choose what matters to you</div>
          <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
            Everything here is optional. Leave anything blank that isn’t useful to you.
          </div>

          <div style={{ ...sectionLabel, marginBottom: 8 }}>In your own words</div>
          <div style={fieldLabel}>What are you working toward?</div>
          <textarea
            maxLength={160}
            rows={3}
            placeholder="e.g. I want to have more energy in the afternoons."
            value={goalStatementInput}
            onChange={(e) => setGoalStatementInput(e.target.value)}
            style={{ ...inputStyle, minHeight: 88, resize: "vertical", marginBottom: 18, lineHeight: 1.45 }}
          />

          <div style={{ ...sectionLabel, marginBottom: 10 }}>Weight</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            <div><div style={fieldLabel}>Goal weight (lb)</div><input type="number" step="0.1" inputMode="decimal" placeholder="Optional" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} style={inputStyle} /></div>
            <div>
              <div style={fieldLabel}>Goal date</div>
              <div style={{ width: "100%", height: 46, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
                <input type="date" value={goalDateInput} onChange={(e) => setGoalDateInput(e.target.value)} style={{ width: "100%", height: "100%", border: "none", background: "transparent", color: TEXT, padding: "0 10px", fontSize: 15, fontFamily: "'DM Sans', -apple-system, sans-serif", boxSizing: "border-box", minWidth: 0, maxWidth: "100%" }} />
              </div>
            </div>
          </div>

          <div style={{ ...sectionLabel, marginBottom: 5 }}>Daily targets</div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginBottom: 12 }}>Set only the numbers you actually want to aim for.</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><div style={fieldLabel}>Steps</div><input type="number" inputMode="numeric" placeholder="Optional" value={tSteps} onChange={(e) => setTSteps(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Water (oz)</div><input type="number" step="0.1" inputMode="decimal" placeholder="Optional" value={tWater} onChange={(e) => setTWater(e.target.value)} style={inputStyle} /></div>
          </div>

          <div style={{ ...sectionLabel, margin: "16px 0 5px" }}>Nutrition</div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginBottom: 12 }}>Nutrition targets are optional too.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            <div><div style={fieldLabel}>Calories</div><input type="number" placeholder="Optional" value={tCal} onChange={(e) => setTCal(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Protein (g)</div><input type="number" step="0.1" inputMode="decimal" placeholder="Optional" value={tProtein} onChange={(e) => setTProtein(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Carbs (g)</div><input type="number" step="0.1" inputMode="decimal" placeholder="Optional" value={tCarbs} onChange={(e) => setTCarbs(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Fat (g)</div><input type="number" step="0.1" inputMode="decimal" placeholder="Optional" value={tFat} onChange={(e) => setTFat(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Fiber min (g)</div><input type="number" step="0.1" inputMode="decimal" placeholder="Optional" value={tFiberMin} onChange={(e) => setTFiberMin(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Fiber max (g)</div><input type="number" step="0.1" inputMode="decimal" placeholder="Optional" value={tFiberMax} onChange={(e) => setTFiberMax(e.target.value)} style={inputStyle} /></div>
          </div>

          <details style={{ marginBottom: 18 }}>
            <summary style={{ cursor: "pointer", color: brand.tealDark, fontWeight: 800, fontSize: 12 }}>Optional BMR context</summary>
            <div style={{ marginTop: 10 }}>
              <div style={fieldLabel}>Estimated BMR</div>
              <input type="number" placeholder="Optional" value={tBmr} onChange={(e) => setTBmr(e.target.value)} style={inputStyle} />
            </div>
          </details>

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
