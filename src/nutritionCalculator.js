export const MACRO_PRESETS = {
  balanced: {
    label: "Balanced",
    description: "A flexible everyday starting point.",
    proteinPct: 25,
    carbsPct: 45,
    fatPct: 30,
  },
  higher_protein: {
    label: "Higher protein",
    description: "More of your calories come from protein.",
    proteinPct: 30,
    carbsPct: 40,
    fatPct: 30,
  },
  lower_fat: {
    label: "Lower fat",
    description: "More calories are available for carbohydrates.",
    proteinPct: 25,
    carbsPct: 55,
    fatPct: 20,
  },
  lower_carb: {
    label: "Lower carb",
    description: "Fewer calories come from carbohydrates, with more protein and fat.",
    proteinPct: 30,
    carbsPct: 35,
    fatPct: 35,
  },
};

export const DAY_ACTIVITY_OPTIONS = [
  { id: "mostly_sitting", label: "Mostly sitting", description: "Most of my day is seated." },
  { id: "some_walking", label: "Some walking and standing", description: "I move around some during a normal day." },
  { id: "on_feet", label: "On my feet much of the day", description: "My usual day keeps me moving." },
  { id: "physical", label: "Physically demanding", description: "My work or daily routine is physically demanding." },
];

export const EXERCISE_OPTIONS = [
  { id: "rarely", label: "Rarely" },
  { id: "one_two", label: "1–2 days" },
  { id: "three_four", label: "3–4 days" },
  { id: "five_six", label: "5–6 days" },
  { id: "nearly_daily", label: "Nearly every day" },
];

const DAY_ACTIVITY_SCORE = {
  mostly_sitting: 0,
  some_walking: 1,
  on_feet: 2,
  physical: 3,
};

const EXERCISE_SCORE = {
  rarely: 0,
  one_two: 1,
  three_four: 2,
  five_six: 3,
  nearly_daily: 4,
};

export function activityFactor(dayActivity, exerciseFrequency) {
  if (!(dayActivity in DAY_ACTIVITY_SCORE) || !(exerciseFrequency in EXERCISE_SCORE)) {
    throw new Error("Choose both your normal day and your exercise frequency.");
  }
  const score = DAY_ACTIVITY_SCORE[dayActivity] + EXERCISE_SCORE[exerciseFrequency];
  if (score <= 0) return 1.2;
  if (score === 1) return 1.375;
  if (score <= 3) return 1.55;
  if (score <= 5) return 1.725;
  return 1.9;
}

export function activityLabel(factor) {
  if (factor <= 1.2) return "mostly sedentary";
  if (factor <= 1.375) return "lightly active";
  if (factor <= 1.55) return "moderately active";
  if (factor <= 1.725) return "very active";
  return "extra active";
}

export function mifflinStJeor({ weightLb, heightIn, age, formula }) {
  const weight = Number(weightLb);
  const height = Number(heightIn);
  const years = Number(age);
  if (!Number.isFinite(weight) || weight <= 0) throw new Error("Enter your current weight.");
  if (!Number.isFinite(height) || height <= 0) throw new Error("Enter your height.");
  if (!Number.isFinite(years) || years < 18 || years > 120) throw new Error("With’s current calculator is designed for adults ages 18–120.");
  if (!["male", "female"].includes(formula)) throw new Error("Choose the calculation formula you want With to use.");

  const weightKg = weight * 0.45359237;
  const heightCm = height * 2.54;
  const constant = formula === "male" ? 5 : -161;
  return (10 * weightKg) + (6.25 * heightCm) - (5 * years) + constant;
}

function parseDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function dateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function daysBetween(startKey, endKey) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function addDays(startKey, days) {
  const start = parseDateKey(startKey);
  if (!start) return null;
  start.setUTCDate(start.getUTCDate() + Math.ceil(days));
  return dateKey(start);
}

function roundToTen(value) {
  return Math.round(value / 10) * 10;
}

function macroGrams(calories, percent, caloriesPerGram) {
  return Math.round((calories * (percent / 100)) / caloriesPerGram);
}

export function calculateNutritionTargets({
  currentWeightLb,
  goalWeightLb,
  goalDate,
  heightIn,
  age,
  formula,
  dayActivity,
  exerciseFrequency,
  presetKey = "balanced",
  today,
}) {
  const currentWeight = Number(currentWeightLb);
  const goalWeight = Number(goalWeightLb);
  if (!Number.isFinite(currentWeight) || currentWeight <= 0) throw new Error("Enter your current weight.");
  if (!Number.isFinite(goalWeight) || goalWeight <= 0) throw new Error("Add a valid goal weight first.");

  const preset = MACRO_PRESETS[presetKey];
  if (!preset) throw new Error("Choose a nutrition preference.");

  const bmrRaw = mifflinStJeor({ weightLb: currentWeight, heightIn, age, formula });
  const factor = activityFactor(dayActivity, exerciseFrequency);
  const maintenanceRaw = bmrRaw * factor;
  const weightChange = goalWeight - currentWeight;
  const todayKey = today || dateKey(new Date());

  let requestedWeeklyChange = 0;
  let appliedWeeklyChange = 0;
  let aggressiveLoss = false;
  let suggestedGoalDate = null;

  if (Math.abs(weightChange) >= 0.05) {
    if (!goalDate) throw new Error("Add a goal date so With can estimate the pace needed to reach your goal.");
    const days = daysBetween(todayKey, goalDate);
    if (!Number.isFinite(days) || days <= 0) throw new Error("Choose a goal date in the future.");
    const weeks = days / 7;
    requestedWeeklyChange = weightChange / weeks;
    appliedWeeklyChange = requestedWeeklyChange;

    if (requestedWeeklyChange < -2) {
      aggressiveLoss = true;
      appliedWeeklyChange = -2;
      suggestedGoalDate = addDays(todayKey, (Math.abs(weightChange) / 2) * 7);
    }
  }

  const calorieAdjustment = appliedWeeklyChange * 500;
  const calorieTargetRaw = maintenanceRaw + calorieAdjustment;
  if (!Number.isFinite(calorieTargetRaw) || calorieTargetRaw <= 0) {
    throw new Error("That goal and timeline do not produce a usable calorie estimate. Choose a later goal date or set your targets manually.");
  }

  const calories = Math.max(10, roundToTen(calorieTargetRaw));
  const protein = macroGrams(calories, preset.proteinPct, 4);
  const carbs = macroGrams(calories, preset.carbsPct, 4);
  const fat = macroGrams(calories, preset.fatPct, 9);

  return {
    bmr: Math.round(bmrRaw),
    maintenanceCalories: Math.round(maintenanceRaw),
    calories,
    protein,
    carbs,
    fat,
    proteinPct: preset.proteinPct,
    carbsPct: preset.carbsPct,
    fatPct: preset.fatPct,
    presetKey,
    presetLabel: preset.label,
    activityFactor: factor,
    activityLabel: activityLabel(factor),
    requestedWeeklyChange,
    appliedWeeklyChange,
    aggressiveLoss,
    suggestedGoalDate,
    currentWeight,
    goalWeight,
  };
}

export function formatWeeklyChange(change) {
  const value = Math.abs(Number(change) || 0);
  if (value < 0.01) return "maintenance";
  return `${value.toFixed(1)} lb/week ${change < 0 ? "loss" : "gain"}`;
}
