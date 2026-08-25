import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Zap, Footprints, Droplet, Home, PlusCircle, TrendingUp, Target, Sparkles, LogOut } from "lucide-react";
import { supabase } from "./supabase";

const USERS = ["Alli", "Shane"];
const USER_COLOR = { Shane: "#FF8C4B", Alli: "#C9A8FF" };
const USER_COLOR_DIM = { Shane: "#B3652F", Alli: "#8F76B3" };
const USER_TEXT_ON = { Shane: "#4A1D00", Alli: "#2E1065" };
const GOAL_DATE = "2026-12-31";

const BG = "#14171A";
const SURFACE = "#212425";
const SURFACE_2 = "#2A2E2F";
const BORDER = "#383C3D";
const TEXT = "#EDEFEF";
const TEXT_MUTED = "#8B9296";
const WARN = "#FF6B4A";
const NAV_H = 64;

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function defaultTargets(u) {
  if (u === "Alli") return { bmr: 1340, calories: 1700, protein: 115, carbs: 185, fat: 55, fiberMin: 30, fiberMax: 40 };
  if (u === "Shane") return { bmr: 1960, calories: 2500, protein: 165, carbs: 300, fat: 70, fiberMin: 35, fiberMax: 45 };
  return { bmr: 0, calories: 0, protein: 0, carbs: 0, fat: 0, fiberMin: 0, fiberMax: 0 };
}
function emptyData(u) {
  return { weights: [], foods: [], activities: [], steps: [], water: [], goalWeight: null, targets: defaultTargets(u) };
}
function weeksUntil(dateStr) {
  const target = new Date(dateStr + "T00:00:00");
  const ms = target - new Date();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (7 * 24 * 60 * 60 * 1000));
}
function rollingAvgSeries(weightsSorted, windowSize) {
  const out = {};
  for (let i = 0; i < weightsSorted.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = weightsSorted.slice(start, i + 1);
    out[weightsSorted[i].date] = slice.reduce((a, b) => a + b.weight, 0) / slice.length;
  }
  return out;
}
function num(v) { return v == null ? 0 : Number(v); }

const inputStyle = {
  background: SURFACE_2, border: `1px solid ${BORDER}`, color: TEXT,
  borderRadius: 8, padding: "12px 14px", fontSize: 16, width: "100%",
};
const cardStyle = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "1.25rem", marginBottom: "1rem" };
const headingStyle = { fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 20, letterSpacing: "0", marginBottom: "0.9rem" };
const fieldLabel = { fontSize: 12, color: TEXT_MUTED, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" };
const bigButton = (color, textColor) => ({
  background: color, color: textColor, border: "none", borderRadius: 10,
  padding: "13px 18px", fontWeight: 700, fontSize: 15, width: "100%",
  fontFamily: "'Fraunces', serif", fontStyle: "italic", letterSpacing: "0",
});

function ProgressRow({ label, value, target, unit, color }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: TEXT_MUTED }}>{label}</span>
        <span className="num" style={{ color: TEXT }}>
          {Math.round(value)}{unit} <span style={{ color: TEXT_MUTED }}>/ {target}{unit}</span>
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: SURFACE_2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, display: "grid", placeItems: "center", padding: 20, fontFamily: "'Karla', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,500;1,600;1,700&family=Karla:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'); * { box-sizing: border-box; } body { margin: 0; } input, button { font-family: inherit; }`}</style>
      <form onSubmit={signIn} style={{ ...cardStyle, width: "100%", maxWidth: 420, marginBottom: 0 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 30, lineHeight: 1.05, marginBottom: 8 }}>Shane &amp; Alli's<br/>Health Tracker</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 24 }}>Sign in to your household.</div>
        <div style={fieldLabel}>Email</div>
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
        <div style={fieldLabel}>Password</div>
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
        {error && <div style={{ color: WARN, fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button disabled={busy} style={{ ...bigButton(USER_COLOR.Shane, USER_TEXT_ON.Shane), opacity: busy ? 0.65 : 1 }}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

export default function Tracker() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [householdId, setHouseholdId] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [activeUser, setActiveUser] = useState("Alli");
  const [tab, setTab] = useState("today");
  const [data, setData] = useState({ Alli: emptyData("Alli"), Shane: emptyData("Shane") });
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(null);

  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState(todayStr());
  const [weightError, setWeightError] = useState("");

  const [estimateText, setEstimateText] = useState("");
  const [estimating] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [estimateNote, setEstimateNote] = useState("");

  const [foodName, setFoodName] = useState("");
  const [foodCals, setFoodCals] = useState("");
  const [foodProtein, setFoodProtein] = useState("");
  const [foodCarbs, setFoodCarbs] = useState("");
  const [foodFat, setFoodFat] = useState("");
  const [foodFiber, setFoodFiber] = useState("");
  const [foodMeal, setFoodMeal] = useState("Breakfast");
  const [foodNotes, setFoodNotes] = useState("");
  const [foodDate, setFoodDate] = useState(todayStr());
  const [foodError, setFoodError] = useState("");

  const [stepsInput, setStepsInput] = useState("");
  const [stepsDate, setStepsDate] = useState(todayStr());
  const [waterOz, setWaterOz] = useState("");
  const [waterDate, setWaterDate] = useState(todayStr());
  const [actName, setActName] = useState("");
  const [actCals, setActCals] = useState("");
  const [actDate, setActDate] = useState(todayStr());

  const [goalInput, setGoalInput] = useState("");
  const [tBmr, setTBmr] = useState("");
  const [tCal, setTCal] = useState("");
  const [tProtein, setTProtein] = useState("");
  const [tCarbs, setTCarbs] = useState("");
  const [tFat, setTFat] = useState("");
  const [tFiberMin, setTFiberMin] = useState("");
  const [tFiberMax, setTFiberMax] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadAll() {
    if (!session?.user) return;
    setLoading(true); setSaveError(null);
    try {
      const { data: memberships, error: memberError } = await supabase
        .from("household_members").select("household_id").eq("user_id", session.user.id).limit(1);
      if (memberError) throw memberError;
      const hid = memberships?.[0]?.household_id;
      if (!hid) throw new Error("Your login is not linked to a household yet.");
      setHouseholdId(hid);

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles").select("*").eq("household_id", hid);
      if (profileError) throw profileError;
      const pmap = {};
      const next = { Alli: emptyData("Alli"), Shane: emptyData("Shane") };
      (profileRows || []).forEach((p) => {
        pmap[p.name] = p;
        next[p.name] = {
          ...emptyData(p.name),
          goalWeight: p.goal_weight == null ? null : num(p.goal_weight),
          targets: { bmr: num(p.bmr), calories: num(p.calories), protein: num(p.protein), carbs: num(p.carbs), fat: num(p.fat), fiberMin: num(p.fiber_min), fiberMax: num(p.fiber_max) },
        };
      });
      setProfiles(pmap);
      const profileIds = Object.values(pmap).map((p) => p.id);
      if (!profileIds.length) throw new Error("No health profiles exist for this household.");

      const [weightsRes, foodsRes, activitiesRes, stepsRes, waterRes] = await Promise.all([
        supabase.from("weight_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("food_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("activity_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("step_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("water_entries").select("*").eq("household_id", hid).order("entry_date"),
      ]);
      for (const r of [weightsRes, foodsRes, activitiesRes, stepsRes, waterRes]) if (r.error) throw r.error;
      const nameById = Object.fromEntries(Object.values(pmap).map((p) => [p.id, p.name]));
      for (const w of weightsRes.data || []) { const n = nameById[w.profile_id]; if (next[n]) next[n].weights.push({ id: w.id, date: w.entry_date, weight: num(w.weight) }); }
      for (const f of foodsRes.data || []) { const n = nameById[f.profile_id]; if (next[n]) next[n].foods.push({ id: f.id, date: f.entry_date, name: f.name, calories: num(f.calories), protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat), fiber: num(f.fiber), meal: f.meal, notes: f.notes || "" }); }
      for (const a of activitiesRes.data || []) { const n = nameById[a.profile_id]; if (next[n]) next[n].activities.push({ id: a.id, date: a.entry_date, name: a.name, caloriesBurned: num(a.calories_burned) }); }
      for (const s of stepsRes.data || []) { const n = nameById[s.profile_id]; if (next[n]) next[n].steps.push({ id: s.id, date: s.entry_date, count: Number(s.step_count) }); }
      for (const w of waterRes.data || []) { const n = nameById[w.profile_id]; if (next[n]) next[n].water.push({ id: w.id, date: w.entry_date, ounces: num(w.ounces) }); }
      setData(next);
    } catch (e) {
      setSaveError(e.message || "Could not load your household data.");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (session?.user) loadAll(); else if (authReady) setLoading(false); }, [session?.user?.id, authReady]);

  useEffect(() => {
    if (loading) return;
    const u = data[activeUser];
    setGoalInput(u.goalWeight || "");
    setTBmr(u.targets.bmr); setTCal(u.targets.calories); setTProtein(u.targets.protein);
    setTCarbs(u.targets.carbs); setTFat(u.targets.fat); setTFiberMin(u.targets.fiberMin); setTFiberMax(u.targets.fiberMax);
  }, [activeUser, loading, data]);

  function profileFor(name) { return profiles[name]; }
  async function runWrite(work) {
    setSaveError(null);
    try { await work(); await loadAll(); return true; }
    catch (e) { setSaveError(e.message || "Save failed. Try again."); return false; }
  }

  function estimateMacros() {
    setEstimateError("AI estimating is temporarily disabled while we finish the Supabase move. Saved Foods is next.");
    setEstimateNote("");
  }

  async function addWeight() {
    const val = parseFloat(weightInput);
    if (!weightInput || isNaN(val) || val <= 0) { setWeightError("Enter a real weight first."); return; }
    setWeightError("");
    const p = profileFor(activeUser); if (!p) return;
    const ok = await runWrite(async () => {
      const { error } = await supabase.from("weight_entries").upsert({ household_id: householdId, profile_id: p.id, entry_date: weightDate, weight: val }, { onConflict: "profile_id,entry_date" });
      if (error) throw error;
    });
    if (ok) setWeightInput("");
  }
  async function deleteWeight(id) { await runWrite(async () => { const { error } = await supabase.from("weight_entries").delete().eq("id", id); if (error) throw error; }); }

  async function addFood() {
    if (!foodName.trim()) { setFoodError("Give it a name."); return; }
    const cals = parseFloat(foodCals) || 0, protein = parseFloat(foodProtein) || 0;
    const carbs = parseFloat(foodCarbs) || 0, fat = parseFloat(foodFat) || 0, fiber = parseFloat(foodFiber) || 0;
    if (!foodCals && !foodProtein && !foodCarbs && !foodFat) { setFoodError("Add at least calories or a macro."); return; }
    setFoodError(""); const p = profileFor(activeUser); if (!p) return;
    const ok = await runWrite(async () => {
      const { error } = await supabase.from("food_entries").insert({ household_id: householdId, profile_id: p.id, entry_date: foodDate, name: foodName.trim(), calories: cals, protein, carbs, fat, fiber, meal: foodMeal, notes: foodNotes.trim() || null });
      if (error) throw error;
    });
    if (ok) { setFoodName(""); setFoodCals(""); setFoodProtein(""); setFoodCarbs(""); setFoodFat(""); setFoodFiber(""); setFoodNotes(""); setEstimateText(""); setEstimateNote(""); }
  }
  async function deleteFood(id) { await runWrite(async () => { const { error } = await supabase.from("food_entries").delete().eq("id", id); if (error) throw error; }); }

  async function saveSteps() {
    const val = parseInt(stepsInput, 10); if (!stepsInput || isNaN(val) || val < 0) return;
    const p = profileFor(activeUser); if (!p) return;
    const ok = await runWrite(async () => { const { error } = await supabase.from("step_entries").upsert({ household_id: householdId, profile_id: p.id, entry_date: stepsDate, step_count: val }, { onConflict: "profile_id,entry_date" }); if (error) throw error; });
    if (ok) setStepsInput("");
  }
  async function addWater(amount) {
    const val = amount != null ? amount : parseFloat(waterOz); if (!val || isNaN(val) || val <= 0) return;
    const p = profileFor(activeUser); if (!p) return;
    const ok = await runWrite(async () => { const { error } = await supabase.from("water_entries").insert({ household_id: householdId, profile_id: p.id, entry_date: waterDate, ounces: val }); if (error) throw error; });
    if (ok) setWaterOz("");
  }
  async function addActivity() {
    if (!actName.trim()) return; const cals = parseFloat(actCals) || 0; if (!cals) return;
    const p = profileFor(activeUser); if (!p) return;
    const ok = await runWrite(async () => { const { error } = await supabase.from("activity_entries").insert({ household_id: householdId, profile_id: p.id, entry_date: actDate, name: actName.trim(), calories_burned: cals }); if (error) throw error; });
    if (ok) { setActName(""); setActCals(""); }
  }
  async function deleteActivity(id) { await runWrite(async () => { const { error } = await supabase.from("activity_entries").delete().eq("id", id); if (error) throw error; }); }

  async function saveGoal() {
    const val = parseFloat(goalInput); const p = profileFor(activeUser); if (!p) return;
    await runWrite(async () => { const { error } = await supabase.from("profiles").update({ goal_weight: isNaN(val) ? null : val }).eq("id", p.id); if (error) throw error; });
  }
  async function saveTargets() {
    const p = profileFor(activeUser); if (!p) return;
    await runWrite(async () => {
      const { error } = await supabase.from("profiles").update({ bmr: parseFloat(tBmr) || 0, calories: parseFloat(tCal) || 0, protein: parseFloat(tProtein) || 0, carbs: parseFloat(tCarbs) || 0, fat: parseFloat(tFat) || 0, fiber_min: parseFloat(tFiberMin) || 0, fiber_max: parseFloat(tFiberMax) || 0 }).eq("id", p.id);
      if (error) throw error;
    });
  }

  const chartData = useMemo(() => {
    const dateSet = new Set();
    USERS.forEach((u) => data[u].weights.forEach((w) => dateSet.add(w.date)));
    const dates = Array.from(dateSet).sort();
    const avgMaps = {};
    USERS.forEach((u) => { avgMaps[u] = rollingAvgSeries(data[u].weights.slice().sort((a, b) => a.date.localeCompare(b.date)), 7); });
    return dates.map((d) => {
      const row = { date: d, label: fmtDate(d) };
      USERS.forEach((u) => {
        const found = data[u].weights.find((w) => w.date === d);
        if (found) row[u] = found.weight;
        if (avgMaps[u][d] != null) row[`${u}Avg`] = Math.round(avgMaps[u][d] * 10) / 10;
      });
      return row;
    });
  }, [data]);

  const streaks = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().slice(0, 10)); }
    const result = {};
    USERS.forEach((u) => {
      const logged = new Set([
        ...data[u].weights.map((w) => w.date), ...data[u].foods.map((f) => f.date),
        ...data[u].steps.map((s) => s.date), ...data[u].water.map((w) => w.date), ...data[u].activities.map((a) => a.date),
      ]);
      result[u] = days.map((d) => logged.has(d));
    });
    return { days, result };
  }, [data]);

  const today = todayStr();
  const todayStats = useMemo(() => {
    const out = {};
    USERS.forEach((u) => {
      const foods = data[u].foods.filter((f) => f.date === today);
      const consumed = foods.reduce((acc, f) => ({
        calories: acc.calories + f.calories, protein: acc.protein + f.protein,
        carbs: acc.carbs + f.carbs, fat: acc.fat + f.fat, fiber: acc.fiber + (f.fiber || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
      const burned = data[u].activities.filter((a) => a.date === today).reduce((a, b) => a + b.caloriesBurned, 0);
      const water = data[u].water.filter((w) => w.date === today).reduce((a, b) => a + b.ounces, 0);
      const stepsEntry = data[u].steps.find((s) => s.date === today);
      out[u] = { ...consumed, burned, net: consumed.calories - burned, water, steps: stepsEntry ? stepsEntry.count : null };
    });
    return out;
  }, [data, today]);

  function goalInfo(u) {
    const w = data[u].weights;
    if (w.length === 0) return null;
    const start = w[0].weight, latest = w[w.length - 1].weight, goal = data[u].goalWeight;
    return { start, latest, goal, pctLost: start !== 0 ? ((start - latest) / start) * 100 : 0, toGoal: goal != null ? latest - goal : null };
  }

  const weeksLeft = weeksUntil(GOAL_DATE);

  if (!authReady) {
    return <div style={{ minHeight: "100vh", background: BG, color: TEXT_MUTED, padding: "3rem", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>checking your session...</div>;
  }
  if (!session) return <Login />;
  if (loading) {
    return <div style={{ minHeight: "100vh", background: BG, color: TEXT_MUTED, padding: "3rem", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>loading the household ledger...</div>;
  }

  const gi = goalInfo(activeUser);
  const ts = todayStats[activeUser];

  const NAV_ITEMS = [
    { id: "today", label: "Today", icon: Home },
    { id: "log", label: "Log", icon: PlusCircle },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "goals", label: "Goals", icon: Target },
  ];

  return (
    <div style={{ background: BG, color: TEXT, minHeight: "100vh", fontFamily: "'Karla', -apple-system, sans-serif", boxSizing: "border-box" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,500;1,600;1,700&family=Karla:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; }
        input, select, textarea, button { font-family: inherit; }
        .num { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
        button { cursor: pointer; -webkit-appearance: none; }
        ::placeholder { color: #5A5E60; }
        textarea { resize: vertical; }
      `}</style>

      <div style={{ position: "sticky", top: 0, zIndex: 10, background: BG, borderBottom: `1px solid ${BORDER}`, paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0.9rem 1rem 0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 21, lineHeight: 1.15 }}>
              Shane &amp; Alli's<br />Health Tracker
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3 }}>
              {USERS.map((u) => (
                <button key={u} onClick={() => setActiveUser(u)} style={{
                  border: "none", padding: "9px 16px", borderRadius: 8,
                  fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 15,
                  background: activeUser === u ? USER_COLOR[u] : "transparent",
                  color: activeUser === u ? USER_TEXT_ON[u] : TEXT_MUTED,
                }}>{u}</button>
              ))}
              </div>
              <button title="Sign out" onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", color: TEXT_MUTED, padding: 7, display: "grid", placeItems: "center" }}><LogOut style={{ width: 18, height: 18 }} /></button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED }}>{weeksLeft} weeks until the Dec 31 goal date</div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "1rem 1rem", paddingBottom: NAV_H + 32 }}>
        {saveError && (
          <div style={{ background: "#3A2420", border: `1px solid ${WARN}`, color: WARN, padding: "10px 14px", borderRadius: 10, marginBottom: "1rem", fontSize: 13 }}>{saveError}</div>
        )}

        {tab === "today" && (
          <>
            <div style={cardStyle}>
              <div style={headingStyle}>Today — {activeUser}</div>
              {(() => {
                const targets = data[activeUser].targets;
                return (
                  <div>
                    <ProgressRow label="Calories in" value={ts.calories} target={targets.calories} unit="" color={USER_COLOR[activeUser]} />
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: TEXT_MUTED, margin: "2px 0 14px" }}>
                      <Zap style={{ width: 13, height: 13 }} /> {Math.round(ts.burned)} burned · net {Math.round(ts.net)} cal
                    </div>
                    <ProgressRow label="Protein" value={ts.protein} target={targets.protein} unit="g" color={USER_COLOR_DIM[activeUser]} />
                    <ProgressRow label="Carbs" value={ts.carbs} target={targets.carbs} unit="g" color={USER_COLOR_DIM[activeUser]} />
                    <ProgressRow label="Fat" value={ts.fat} target={targets.fat} unit="g" color={USER_COLOR_DIM[activeUser]} />
                    <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 14 }}>
                      Fiber: <span className="num" style={{ color: TEXT }}>{Math.round(ts.fiber)}g</span> / {targets.fiberMin}–{targets.fiberMax}g
                    </div>
                    <div style={{ display: "flex", gap: 20, fontSize: 14, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }} className="num"><Footprints style={{ width: 15, height: 15 }} />{ts.steps != null ? ts.steps.toLocaleString() : "—"}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }} className="num"><Droplet style={{ width: 15, height: 15 }} />{Math.round(ts.water)} oz</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={cardStyle}>
              <div style={headingStyle}>{activeUser}'s food today</div>
              {(() => {
                const todaysFoods = data[activeUser].foods.filter((f) => f.date === today);
                if (todaysFoods.length === 0) return <div style={{ color: TEXT_MUTED, fontSize: 13 }}>Nothing logged yet today.</div>;
                const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snack"];
                const groups = {};
                todaysFoods.forEach((f) => { const key = f.meal || "Unlabeled"; if (!groups[key]) groups[key] = []; groups[key].push(f); });
                const orderedKeys = [...MEAL_ORDER.filter((m) => groups[m]), ...Object.keys(groups).filter((k) => !MEAL_ORDER.includes(k))];
                return orderedKeys.map((meal) => (
                  <div key={meal} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{meal}</div>
                    {groups[meal].map((f) => (
                      <div key={f.id} style={{ padding: "9px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <span>{f.name}</span>
                          <button onClick={() => deleteFood(f.id)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, flexShrink: 0 }}>remove</button>
                        </div>
                        <div className="num" style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 2 }}>{Math.round(f.calories)} cal · P{Math.round(f.protein)} C{Math.round(f.carbs)} F{Math.round(f.fat)}</div>
                        {f.notes && <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 2 }}>{f.notes}</div>}
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>

            {data[activeUser].activities.filter((a) => a.date === today).length > 0 && (
              <div style={cardStyle}>
                <div style={headingStyle}>{activeUser}'s activity today</div>
                {data[activeUser].activities.filter((a) => a.date === today).map((a) => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                    <span>{a.name}</span>
                    <span className="num" style={{ color: TEXT_MUTED }}>{Math.round(a.caloriesBurned)} cal</span>
                    <button onClick={() => deleteActivity(a.id)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12 }}>remove</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "log" && (
          <>
            <div style={cardStyle}>
              <div style={headingStyle}>Weight</div>
              <div style={fieldLabel}>Weight (lb)</div>
              <input type="number" step="0.1" inputMode="decimal" placeholder="e.g. 182.4" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={fieldLabel}>Date</div>
              <input type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              {weightError && <div style={{ color: WARN, fontSize: 12, marginBottom: 8 }}>{weightError}</div>}
              <button onClick={addWeight} style={bigButton(USER_COLOR[activeUser], USER_TEXT_ON[activeUser])}>Log weight</button>
              {data[activeUser].weights.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  {data[activeUser].weights.slice().reverse().slice(0, 3).map((w) => (
                    <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                      <span style={{ color: TEXT_MUTED }}>{fmtDate(w.date)}</span>
                      <span className="num">{w.weight} lb</span>
                      <button onClick={() => deleteWeight(w.id)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12 }}>remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={headingStyle}>Food</div>

              <div style={{ background: SURFACE_2, border: `1px dashed ${BORDER}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: TEXT_MUTED, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  <Sparkles style={{ width: 13, height: 13 }} /> Not sure the numbers? Describe it
                </div>
                <textarea
                  placeholder="e.g. 2 fried eggs, slice of sourdough toast with butter, black coffee"
                  value={estimateText} onChange={(e) => setEstimateText(e.target.value)}
                  rows={2} style={{ ...inputStyle, marginBottom: 8 }}
                />
                <button onClick={estimateMacros} disabled={estimating} style={{ ...bigButton(SURFACE, TEXT), border: `1px solid ${BORDER}`, opacity: estimating ? 0.6 : 1 }}>
                  {estimating ? "Estimating…" : "Estimate macros"}
                </button>
                {estimateError && <div style={{ color: WARN, fontSize: 12, marginTop: 8 }}>{estimateError}</div>}
                {estimateNote && <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 8 }}>{estimateNote}</div>}
              </div>

              <div style={fieldLabel}>Food name</div>
              <input type="text" placeholder="Food name" value={foodName} onChange={(e) => setFoodName(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={fieldLabel}>Meal</div>
              <select value={foodMeal} onChange={(e) => setFoodMeal(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }}>
                <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option>
              </select>
              <div style={fieldLabel}>Date</div>
              <input type="date" value={foodDate} onChange={(e) => setFoodDate(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><div style={fieldLabel}>Calories</div><input type="number" inputMode="numeric" value={foodCals} onChange={(e) => setFoodCals(e.target.value)} style={inputStyle} /></div>
                <div><div style={fieldLabel}>Protein (g)</div><input type="number" inputMode="numeric" value={foodProtein} onChange={(e) => setFoodProtein(e.target.value)} style={inputStyle} /></div>
                <div><div style={fieldLabel}>Carbs (g)</div><input type="number" inputMode="numeric" value={foodCarbs} onChange={(e) => setFoodCarbs(e.target.value)} style={inputStyle} /></div>
                <div><div style={fieldLabel}>Fat (g)</div><input type="number" inputMode="numeric" value={foodFat} onChange={(e) => setFoodFat(e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={fieldLabel}>Fiber (g)</div>
              <input type="number" inputMode="numeric" value={foodFiber} onChange={(e) => setFoodFiber(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={fieldLabel}>Notes (optional)</div>
              <input type="text" placeholder="Restaurant, cheat day, whatever" value={foodNotes} onChange={(e) => setFoodNotes(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              {foodError && <div style={{ color: WARN, fontSize: 12, marginBottom: 8 }}>{foodError}</div>}
              <button onClick={addFood} style={bigButton(USER_COLOR[activeUser], USER_TEXT_ON[activeUser])}>Log food</button>
            </div>

            <div style={cardStyle}>
              <div style={headingStyle}>Activity</div>
              <div style={fieldLabel}>Activity</div>
              <input type="text" placeholder="e.g. run, lifting, walk" value={actName} onChange={(e) => setActName(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={fieldLabel}>Calories burned</div>
              <input type="number" inputMode="numeric" value={actCals} onChange={(e) => setActCals(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={fieldLabel}>Date</div>
              <input type="date" value={actDate} onChange={(e) => setActDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={addActivity} style={bigButton(USER_COLOR[activeUser], USER_TEXT_ON[activeUser])}>Log activity</button>
            </div>

            <div style={cardStyle}>
              <div style={headingStyle}>Steps</div>
              <div style={fieldLabel}>Step count</div>
              <input type="number" inputMode="numeric" value={stepsInput} onChange={(e) => setStepsInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={fieldLabel}>Date</div>
              <input type="date" value={stepsDate} onChange={(e) => setStepsDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={saveSteps} style={bigButton(USER_COLOR[activeUser], USER_TEXT_ON[activeUser])}>Save steps</button>
            </div>

            <div style={cardStyle}>
              <div style={headingStyle}>Water</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                {[8, 16, 24].map((oz) => (
                  <button key={oz} onClick={() => addWater(oz)} style={{ background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600 }}>+{oz} oz</button>
                ))}
              </div>
              <div style={fieldLabel}>Custom amount (oz)</div>
              <input type="number" inputMode="numeric" value={waterOz} onChange={(e) => setWaterOz(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={fieldLabel}>Date</div>
              <input type="date" value={waterDate} onChange={(e) => setWaterDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={() => addWater()} style={bigButton(USER_COLOR[activeUser], USER_TEXT_ON[activeUser])}>Add water</button>
            </div>
          </>
        )}

        {tab === "trends" && (
          <>
            <div style={cardStyle}>
              <div style={headingStyle}>Weight trend</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 10 }}>solid = actual, dashed = 7-day avg</div>
              <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                {USERS.map((u) => {
                  const info = goalInfo(u);
                  return (
                    <div key={u}>
                      <div style={{ fontSize: 11, color: USER_COLOR[u], fontWeight: 700 }}>{u}</div>
                      <div className="num" style={{ fontSize: 16 }}>
                        {info ? `${info.latest} lb` : "—"}
                        {info && info.latest !== info.start && (
                          <span style={{ color: info.latest < info.start ? USER_COLOR[u] : WARN, fontSize: 12, marginLeft: 6 }}>
                            {info.latest < info.start ? "▼" : "▲"} {Math.abs(info.latest - info.start).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {chartData.length === 0 ? (
                <div style={{ color: TEXT_MUTED, fontSize: 13, padding: "2rem 0", textAlign: "center" }}>No weigh-ins yet.</div>
              ) : (
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} tickLine={false} />
                      <YAxis tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} tickLine={false} domain={["dataMin - 3", "dataMax + 3"]} width={32} />
                      <Tooltip contentStyle={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: TEXT }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="Alli" name="Alli" stroke={USER_COLOR.Alli} strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                      <Line type="monotone" dataKey="AlliAvg" name="Alli avg" stroke={USER_COLOR.Alli} strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
                      <Line type="monotone" dataKey="Shane" name="Shane" stroke={USER_COLOR.Shane} strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                      <Line type="monotone" dataKey="ShaneAvg" name="Shane avg" stroke={USER_COLOR.Shane} strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={headingStyle}>Last 14 days</div>
              {USERS.map((u) => (
                <div key={u} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: u === "Alli" ? 10 : 0 }}>
                  <div style={{ width: 40, fontSize: 11, color: USER_COLOR[u], fontWeight: 700 }}>{u}</div>
                  <div style={{ display: "flex", gap: 3, flex: 1 }}>
                    {streaks.days.map((d, i) => (
                      <div key={d} title={`${fmtDate(d)}: ${streaks.result[u][i] ? "logged" : "nothing logged"}`}
                        style={{ flex: 1, height: 18, borderRadius: 3, background: streaks.result[u][i] ? USER_COLOR[u] : SURFACE_2, border: `1px solid ${streaks.result[u][i] ? USER_COLOR[u] : BORDER}` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "goals" && (
          <>
            <div style={cardStyle}>
              <div style={headingStyle}>Goal — {activeUser}</div>
              <div style={fieldLabel}>Goal weight (lb)</div>
              <input type="number" step="0.1" inputMode="decimal" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={saveGoal} style={{ ...bigButton(USER_COLOR[activeUser], USER_TEXT_ON[activeUser]), marginBottom: gi ? 16 : 0 }}>Save goal</button>
              {gi && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: SURFACE_2, borderRadius: 10, padding: "0.75rem 1rem" }}>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>bodyweight lost</div>
                    <div className="num" style={{ fontSize: 19 }}>{gi.pctLost.toFixed(1)}%</div>
                  </div>
                  {gi.toGoal != null && (
                    <div style={{ background: SURFACE_2, borderRadius: 10, padding: "0.75rem 1rem" }}>
                      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>to go</div>
                      <div className="num" style={{ fontSize: 19 }}>{gi.toGoal > 0 ? `${gi.toGoal.toFixed(1)} lb` : "hit it"}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={headingStyle}>Daily targets — {activeUser}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div><div style={fieldLabel}>BMR</div><input type="number" value={tBmr} onChange={(e) => setTBmr(e.target.value)} style={inputStyle} /></div>
                <div><div style={fieldLabel}>Calories</div><input type="number" value={tCal} onChange={(e) => setTCal(e.target.value)} style={inputStyle} /></div>
                <div><div style={fieldLabel}>Protein (g)</div><input type="number" value={tProtein} onChange={(e) => setTProtein(e.target.value)} style={inputStyle} /></div>
                <div><div style={fieldLabel}>Carbs (g)</div><input type="number" value={tCarbs} onChange={(e) => setTCarbs(e.target.value)} style={inputStyle} /></div>
                <div><div style={fieldLabel}>Fat (g)</div><input type="number" value={tFat} onChange={(e) => setTFat(e.target.value)} style={inputStyle} /></div>
                <div></div>
                <div><div style={fieldLabel}>Fiber min (g)</div><input type="number" value={tFiberMin} onChange={(e) => setTFiberMin(e.target.value)} style={inputStyle} /></div>
                <div><div style={fieldLabel}>Fiber max (g)</div><input type="number" value={tFiberMax} onChange={(e) => setTFiberMax(e.target.value)} style={inputStyle} /></div>
              </div>
              <button onClick={saveTargets} style={bigButton(USER_COLOR[activeUser], USER_TEXT_ON[activeUser])}>Save targets</button>
            </div>
          </>
        )}
      </div>

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: SURFACE, borderTop: `1px solid ${BORDER}`,
        paddingBottom: "env(safe-area-inset-bottom)", zIndex: 10,
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", height: NAV_H }}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3,
                color: active ? USER_COLOR[activeUser] : TEXT_MUTED,
              }}>
                <Icon style={{ width: 20, height: 20 }} strokeWidth={active ? 2.4 : 1.8} />
                <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, fontFamily: "'Fraunces', serif", fontStyle: "italic" }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
