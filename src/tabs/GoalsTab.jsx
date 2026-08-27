function weeksUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const ms = target - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (7 * 24 * 60 * 60 * 1000));
}

import { brand } from "../brand.jsx";
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
  profileColor,
  profileText,
  fmtGoalDate,
  styles,
}) {
  const { SURFACE_2, BORDER, TEXT, TEXT_MUTED, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton } = styles;
  const user = data[activeUser];
  const goalWeeks = weeksUntil(user.goalDate);
  const hasGoals = !!(user.goalWeight || user.goalDate || user.targets.calories);

  return (
    <>
      <div style={{ padding: "0.25rem 0.1rem 0.9rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600, lineHeight: 1.05 }}>Goals</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>What you’re working toward.</div>
      </div>

      {!hasGoals ? (
        <div style={{ ...cardStyle, background: "#FBF7F0", borderColor: "#E6E1D8" }}>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 23, fontWeight: 600, marginBottom: 6 }}>What are you working toward?</div>
          <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>Set a goal and daily targets when you’re ready. They’re yours, and you can change them anytime.</div>
          {activeCanEdit && <button onClick={() => setEditingGoals(true)} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", paddingInline: 18 }}>Set your goals</button>}
        </div>
      ) : !editingGoals ? (
        <>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Your goal</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
              <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", fontSize: 26, fontWeight: 600 }}>
                {gi ? `${gi.latest} → ${gi.goal ?? "—"} lb` : `${user.goalWeight ?? "—"} lb`}
              </div>
              {user.goalDate && (
                <div style={{ color: TEXT_MUTED, fontSize: 13, textAlign: "right" }}>
                  <div>{fmtGoalDate(user.goalDate)}</div>
                  <div style={{ marginTop: 2, fontWeight: 600, color: brand.tealDark }}>
                    {goalWeeks} {goalWeeks === 1 ? "week" : "weeks"} to go
                  </div>
                </div>
              )}
            </div>

            {gi && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                <div style={{ background: SURFACE_2, borderRadius: 14, padding: "0.85rem 1rem" }}>
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Bodyweight lost</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{gi.pctLost.toFixed(1)}%</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2 }}>{(gi.start - gi.latest).toFixed(1)} lb</div>
                </div>
                <div style={{ background: SURFACE_2, borderRadius: 14, padding: "0.85rem 1rem" }}>
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>To go</div>
                  <div style={{ fontSize: 21, fontWeight: 700 }}>{gi.toGoal != null ? (gi.toGoal > 0 ? `${gi.toGoal.toFixed(1)} lb` : "You’re there") : "—"}</div>
                </div>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={headingStyle}>Daily targets</div>
              {activeCanEdit && <button onClick={() => setEditingGoals(true)} style={{ background: "none", border: "none", color: brand.tealDark, fontWeight: 700, fontSize: 12 }}>Edit</button>}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: TEXT_MUTED }}>Calories</span><strong>{user.targets.calories || "—"}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: TEXT_MUTED }}>Protein</span><strong>{user.targets.protein || "—"}g</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: TEXT_MUTED }}>Carbs</span><strong>{user.targets.carbs || "—"}g</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: TEXT_MUTED }}>Fat</span><strong>{user.targets.fat || "—"}g</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: TEXT_MUTED }}>Fiber</span><strong>{user.targets.fiberMin || "—"}–{user.targets.fiberMax || "—"}g</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: TEXT_MUTED }}>BMR</span><strong>{user.targets.bmr || "—"}</strong></div>
            </div>
            {activeCanEdit && <button onClick={() => setEditingGoals(true)} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, marginTop: 16 }}>Edit goals & targets</button>}
          </div>
        </>
      ) : (
        <div style={cardStyle}>
          <div style={headingStyle}>Edit goals & targets</div>
          <div style={fieldLabel}>Goal weight (lb)</div>
          <input type="number" step="0.1" inputMode="decimal" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
          <div style={fieldLabel}>Goal date</div>
          <input type="date" value={goalDateInput} onChange={(e) => setGoalDateInput(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><div style={fieldLabel}>BMR</div><input type="number" value={tBmr} onChange={(e) => setTBmr(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Calories</div><input type="number" value={tCal} onChange={(e) => setTCal(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Protein (g)</div><input type="number" step="0.1" inputMode="decimal" value={tProtein} onChange={(e) => setTProtein(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Carbs (g)</div><input type="number" step="0.1" inputMode="decimal" value={tCarbs} onChange={(e) => setTCarbs(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Fat (g)</div><input type="number" step="0.1" inputMode="decimal" value={tFat} onChange={(e) => setTFat(e.target.value)} style={inputStyle} /></div>
            <div></div>
            <div><div style={fieldLabel}>Fiber min (g)</div><input type="number" step="0.1" inputMode="decimal" value={tFiberMin} onChange={(e) => setTFiberMin(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Fiber max (g)</div><input type="number" step="0.1" inputMode="decimal" value={tFiberMax} onChange={(e) => setTFiberMax(e.target.value)} style={inputStyle} /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => setEditingGoals(false)} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
            <button onClick={async () => { await saveGoal(); await saveTargets(); setEditingGoals(false); }} disabled={!activeCanEdit} style={bigButton(brand.teal, brand.inkOn)}>Save changes</button>
          </div>
        </div>
      )}
    </>
  );
}
