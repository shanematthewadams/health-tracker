import { useEffect, useMemo, useState } from "react";
import { brand } from "../brand.jsx";
import {
  DAY_ACTIVITY_OPTIONS,
  EXERCISE_OPTIONS,
  MACRO_PRESETS,
  calculateNutritionTargets,
  formatWeeklyChange,
} from "../nutritionCalculator.js";

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function friendlyDate(dateKey) {
  if (!dateKey) return "";
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ChoiceButton({ selected, onClick, children, styles }) {
  const { SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED } = styles;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        width: "100%",
        minHeight: 44,
        borderRadius: 11,
        border: selected ? `2px solid ${brand.teal}` : `1px solid ${BORDER}`,
        background: selected ? SURFACE_2 : SURFACE,
        color: TEXT,
        padding: "10px 11px",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 12.5, lineHeight: 1.25 }}>{children[0]}</div>
      {children[1] ? <div style={{ color: TEXT_MUTED, fontSize: 10.5, lineHeight: 1.4, marginTop: 3 }}>{children[1]}</div> : null}
    </button>
  );
}

export default function NutritionTargetCalculator({
  currentWeight,
  currentWeightSource,
  goalWeight,
  goalDate,
  setTBmr,
  setTCal,
  setTProtein,
  setTCarbs,
  setTFat,
  styles,
}) {
  const { SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, fieldLabel, inputStyle, bigButton } = styles;
  const [open, setOpen] = useState(false);
  const [currentWeightInput, setCurrentWeightInput] = useState(currentWeight ? Number(currentWeight).toFixed(1) : "");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [age, setAge] = useState("");
  const [formula, setFormula] = useState("");
  const [dayActivity, setDayActivity] = useState("");
  const [exerciseFrequency, setExerciseFrequency] = useState("");
  const [presetKey, setPresetKey] = useState("balanced");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (currentWeight && !currentWeightInput) setCurrentWeightInput(Number(currentWeight).toFixed(1));
  }, [currentWeight]);

  useEffect(() => {
    setResult(null);
    setApplied(false);
  }, [goalWeight, goalDate]);

  const heightIn = useMemo(() => {
    const feet = Number(heightFeet);
    const inches = Number(heightInches);
    if (!Number.isFinite(feet) || !Number.isFinite(inches)) return 0;
    return (feet * 12) + inches;
  }, [heightFeet, heightInches]);

  function change(setter) {
    return (eventOrValue) => {
      const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue;
      setter(value);
      setResult(null);
      setApplied(false);
      setError("");
    };
  }

  function calculate() {
    setError("");
    setApplied(false);
    try {
      const next = calculateNutritionTargets({
        currentWeightLb: currentWeightInput,
        goalWeightLb: goalWeight,
        goalDate,
        heightIn,
        age,
        formula,
        dayActivity,
        exerciseFrequency,
        presetKey,
        today: localDateKey(),
      });
      setResult(next);
    } catch (nextError) {
      setResult(null);
      setError(nextError?.message || "We couldn’t calculate those targets. Check the information above and try again.");
    }
  }

  function useTargets() {
    if (!result) return;
    setTBmr(String(result.bmr));
    setTCal(String(result.calories));
    setTProtein(String(result.protein));
    setTCarbs(String(result.carbs));
    setTFat(String(result.fat));
    setApplied(true);
  }

  const goalWeightNumber = Number(goalWeight);
  const currentWeightNumber = Number(currentWeightInput);
  const hasGoalWeight = Number.isFinite(goalWeightNumber) && goalWeightNumber > 0;
  const needsGoalDate = hasGoalWeight
    && Number.isFinite(currentWeightNumber)
    && currentWeightNumber > 0
    && Math.abs(currentWeightNumber - goalWeightNumber) >= 0.05
    && !goalDate;
  const canCalculate = hasGoalWeight && !needsGoalDate;

  if (!open) {
    return (
      <div style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 13, marginBottom: 18 }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1.2, color: TEXT }}>Want With to do the math?</div>
        <div style={{ color: TEXT_MUTED, fontSize: 11.5, lineHeight: 1.5, marginTop: 5 }}>
          With can estimate your daily calories and macros from your current weight, goal, body information, and how active your life actually is.
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "9px 0 0" }}
        >
          Calculate nutrition targets
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 13, padding: 14, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 20, fontWeight: 600, lineHeight: 1.15, color: TEXT }}>Let With do the math</div>
          <div style={{ color: TEXT_MUTED, fontSize: 11.5, lineHeight: 1.5, marginTop: 4 }}>Nothing here changes your targets until you choose to use the estimate.</div>
        </div>
        <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 11, fontWeight: 800, padding: 0 }}>Close</button>
      </div>

      <div style={{ ...fieldLabel, marginBottom: 7 }}>Your body right now</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={fieldLabel}>Current weight (lb)</div>
          <input type="number" step="0.1" inputMode="decimal" value={currentWeightInput} onChange={change(setCurrentWeightInput)} style={inputStyle} />
        </div>
        <div>
          <div style={fieldLabel}>Age</div>
          <input type="number" min="18" max="120" inputMode="numeric" placeholder="e.g. 49" value={age} onChange={change(setAge)} style={inputStyle} />
        </div>
      </div>
      {currentWeightSource ? <div style={{ color: TEXT_MUTED, fontSize: 10.5, lineHeight: 1.4, marginBottom: 10 }}>Current weight started from {currentWeightSource}. Change it here if you want to use a different number for this calculation only.</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div>
          <div style={fieldLabel}>Height · feet</div>
          <input type="number" min="3" max="8" inputMode="numeric" placeholder="5" value={heightFeet} onChange={change(setHeightFeet)} style={inputStyle} />
        </div>
        <div>
          <div style={fieldLabel}>Height · inches</div>
          <input type="number" min="0" max="11" step="0.1" inputMode="decimal" placeholder="10" value={heightInches} onChange={change(setHeightInches)} style={inputStyle} />
        </div>
      </div>

      <div style={{ ...fieldLabel, marginBottom: 7 }}>For the BMR equation</div>
      <div style={{ color: TEXT_MUTED, fontSize: 10.5, lineHeight: 1.45, marginBottom: 8 }}>Mifflin-St Jeor uses different constants for male and female bodies. Choose the formula you want With to use for this estimate.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <ChoiceButton selected={formula === "male"} onClick={() => change(setFormula)("male")} styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED }}>
          {["Male formula"]}
        </ChoiceButton>
        <ChoiceButton selected={formula === "female"} onClick={() => change(setFormula)("female")} styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED }}>
          {["Female formula"]}
        </ChoiceButton>
      </div>

      <div style={{ ...fieldLabel, marginBottom: 7 }}>What is most of your normal day like?</div>
      <div style={{ display: "grid", gap: 7, marginBottom: 15 }}>
        {DAY_ACTIVITY_OPTIONS.map((option) => (
          <ChoiceButton key={option.id} selected={dayActivity === option.id} onClick={() => change(setDayActivity)(option.id)} styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED }}>
            {[option.label, option.description]}
          </ChoiceButton>
        ))}
      </div>

      <div style={{ ...fieldLabel, marginBottom: 7 }}>How often do you intentionally exercise in a typical week?</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7, marginBottom: 16 }}>
        {EXERCISE_OPTIONS.map((option) => (
          <ChoiceButton key={option.id} selected={exerciseFrequency === option.id} onClick={() => change(setExerciseFrequency)(option.id)} styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED }}>
            {[option.label]}
          </ChoiceButton>
        ))}
      </div>

      <div style={{ ...fieldLabel, marginBottom: 7 }}>How would you like your calories divided?</div>
      <div style={{ color: TEXT_MUTED, fontSize: 10.5, lineHeight: 1.45, marginBottom: 8 }}>There isn’t one perfect macro split. Pick the approach that feels most useful to you. You can still adjust the numbers afterward.</div>
      <div style={{ display: "grid", gap: 7, marginBottom: 14 }}>
        {Object.entries(MACRO_PRESETS).map(([key, preset]) => (
          <ChoiceButton key={key} selected={presetKey === key} onClick={() => change(setPresetKey)(key)} styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED }}>
            {[preset.label, `${preset.proteinPct}% protein · ${preset.carbsPct}% carbs · ${preset.fatPct}% fat — ${preset.description}`]}
          </ChoiceButton>
        ))}
      </div>

      {!hasGoalWeight && <div style={{ color: WARN, fontSize: 11, lineHeight: 1.45, marginBottom: 10 }}>Add a goal weight above before calculating nutrition targets.</div>}
      {needsGoalDate && <div style={{ color: WARN, fontSize: 11, lineHeight: 1.45, marginBottom: 10 }}>Add a goal date above so With can calculate the pace required.</div>}
      {error && <div role="alert" style={{ color: WARN, fontSize: 11.5, lineHeight: 1.45, marginBottom: 10 }}>{error}</div>}

      <button type="button" onClick={calculate} disabled={!canCalculate} style={{ ...bigButton(brand.teal, brand.inkOn), opacity: canCalculate ? 1 : .55, marginBottom: result ? 12 : 0 }}>Calculate my starting point</button>

      {result && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 13 }}>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 20, fontWeight: 600, color: TEXT, marginBottom: 5 }}>A starting point, not a prescription.</div>
          <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.5, marginBottom: 12 }}>These are estimates. Your real needs can change with your body, activity, and how your weight responds over time.</div>

          {result.aggressiveLoss && (
            <div style={{ background: "#FFF7E8", border: "1px solid #E7C67A", borderRadius: 10, padding: 10, marginBottom: 12 }}>
              <div style={{ color: TEXT, fontSize: 11.5, fontWeight: 800, marginBottom: 3 }}>Your goal date asks for a pretty fast pace.</div>
              <div style={{ color: TEXT_MUTED, fontSize: 10.5, lineHeight: 1.45 }}>
                It works out to about {formatWeeklyChange(result.requestedWeeklyChange)}. Common public-health guidance generally recommends gradual weight loss of about 1–2 lb per week, so With used 2.0 lb/week for the calorie estimate instead.{result.suggestedGoalDate ? ` At that pace, a rough goal date would be ${friendlyDate(result.suggestedGoalDate)}.` : ""}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7, marginBottom: 10 }}>
            {[
              ["Estimated BMR", `${result.bmr.toLocaleString()} cal`],
              ["Estimated maintenance", `${result.maintenanceCalories.toLocaleString()} cal`],
              ["Daily calorie target", `${result.calories.toLocaleString()} cal`],
              ["Pace used", formatWeeklyChange(result.appliedWeeklyChange)],
            ].map(([label, value]) => (
              <div key={label} style={{ background: SURFACE_2, borderRadius: 10, padding: "9px 10px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 9.5, marginBottom: 2 }}>{label}</div>
                <div style={{ color: TEXT, fontSize: 13, fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ ...fieldLabel, marginTop: 12, marginBottom: 6 }}>{result.presetLabel} macros</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 7, marginBottom: 12 }}>
            {[
              ["Protein", `${result.protein}g`, `${result.proteinPct}%`],
              ["Carbs", `${result.carbs}g`, `${result.carbsPct}%`],
              ["Fat", `${result.fat}g`, `${result.fatPct}%`],
            ].map(([label, grams, pct]) => (
              <div key={label} style={{ textAlign: "center", background: SURFACE_2, borderRadius: 10, padding: "10px 6px" }}>
                <div style={{ color: TEXT_MUTED, fontSize: 9.5 }}>{label}</div>
                <div style={{ color: TEXT, fontSize: 15, fontWeight: 800, marginTop: 2 }}>{grams}</div>
                <div style={{ color: TEXT_MUTED, fontSize: 9.5, marginTop: 1 }}>{pct}</div>
              </div>
            ))}
          </div>

          <details style={{ marginBottom: 12 }}>
            <summary style={{ cursor: "pointer", color: brand.tealDark, fontSize: 11, fontWeight: 800 }}>How With calculated this</summary>
            <div style={{ color: TEXT_MUTED, fontSize: 10.5, lineHeight: 1.55, paddingTop: 8 }}>
              <div style={{ marginBottom: 6 }}>With estimated your resting energy needs using the <strong style={{ color: TEXT }}>Mifflin-St Jeor equation</strong> from your weight, height, age, and the formula you selected.</div>
              <div style={{ marginBottom: 6 }}>Your normal-day and exercise answers mapped to a <strong style={{ color: TEXT }}>{result.activityLabel}</strong> activity estimate ({result.activityFactor}× BMR) to estimate maintenance calories.</div>
              <div style={{ marginBottom: 6 }}>Your goal weight and date set the requested pace. With uses the rough 3,500-calories-per-pound relationship only as a starting estimate, not a promise about exactly how your body will change. For weight loss, With will not use a pace faster than 2 lb/week when calculating a target.</div>
              <div>Your <strong style={{ color: TEXT }}>{result.presetLabel}</strong> preference divided the calorie estimate into {result.proteinPct}% protein, {result.carbsPct}% carbs, and {result.fatPct}% fat. Protein and carbs use 4 calories per gram; fat uses 9.</div>
            </div>
          </details>

          <button type="button" onClick={useTargets} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, marginBottom: applied ? 7 : 0 }}>Use these targets</button>
          {applied && <div style={{ color: brand.tealDark, fontSize: 10.5, fontWeight: 800, lineHeight: 1.4 }}>Loaded into the nutrition fields below. You can still adjust them before saving.</div>}
        </div>
      )}
    </div>
  );
}
