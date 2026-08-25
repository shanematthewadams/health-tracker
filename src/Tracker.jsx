import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Zap, Footprints, Droplet, Home, PlusCircle, TrendingUp, Target, LogOut, Search, BookmarkPlus, Pencil, Trash2, Star, Users, UserCircle } from "lucide-react";
import { supabase } from "./supabase";

const USERS = ["Alli", "Shane"];
const USER_COLOR = { Shane: "#D9825B", Alli: "#8F7AAE" };
const USER_COLOR_DIM = { Shane: "#B96E4B", Alli: "#776590" };
const USER_TEXT_ON = { Shane: "#3C2418", Alli: "#2F2639" };
function userColor(name, dim=false) {
  if (USER_COLOR[name]) return dim ? USER_COLOR_DIM[name] : USER_COLOR[name];
  const palette = dim ? ["#6FA39A","#A1845C","#7F88B8","#A46E83"] : ["#9ED8CE","#D8B77E","#AEB7EA","#D69AAF"];
  let n = 0; for (const c of String(name)) n = (n + c.charCodeAt(0)) % palette.length;
  return palette[n];
}
function userText(name) { return USER_TEXT_ON[name] || "#162321"; }

const BG = "#F6F1E8";
const SURFACE = "#FFFCF7";
const SURFACE_2 = "#EFE7DA";
const BORDER = "#DDD2C2";
const TEXT = "#24302C";
const TEXT_MUTED = "#716D64";
const WARN = "#B6533C";
const NAV_H = 64;

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtGoalDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function defaultTargets(u) {
  if (u === "Alli") return { bmr: 1340, calories: 1700, protein: 115, carbs: 185, fat: 55, fiberMin: 30, fiberMax: 40 };
  if (u === "Shane") return { bmr: 1960, calories: 2500, protein: 165, carbs: 300, fat: 70, fiberMin: 35, fiberMax: 45 };
  return { bmr: 0, calories: 0, protein: 0, carbs: 0, fat: 0, fiberMin: 0, fiberMax: 0 };
}
function emptyData(u) {
  return { weights: [], foods: [], activities: [], steps: [], water: [], goalWeight: null, goalDate: null, targets: defaultTargets(u) };
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
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function fullTodayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

const inputStyle = {
  background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT,
  borderRadius: 12, padding: "12px 14px", fontSize: 16, width: "100%",
  boxShadow: "0 1px 0 rgba(45,35,25,.03)",
};
const cardStyle = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "1.25rem", marginBottom: "1rem", boxShadow: "0 6px 24px rgba(65,48,30,.045)" };
const headingStyle = { fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 20, letterSpacing: "0", marginBottom: "0.9rem" };
const fieldLabel = { fontSize: 12, color: TEXT_MUTED, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" };
const bigButton = (color, textColor) => ({
  background: color, color: textColor, border: "none", borderRadius: 12,
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

function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(""); setMessage("");
    if (mode === "forgot") {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (authError) setError(authError.message);
      else setMessage("Check your email for a password reset link.");
    } else if (mode === "signin") {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message);
    } else {
      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) setError(authError.message);
      else if (!data.session) setMessage("Check your email to confirm your account, then come back and sign in.");
      else setMessage("Account created. Setting up your group…");
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, display: "grid", placeItems: "center", padding: 20, fontFamily: "'Karla', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,500;1,600;1,700&family=Karla:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'); * { box-sizing: border-box; } body { margin: 0; } input, button { font-family: inherit; }`}</style>
      <form onSubmit={submit} style={{ ...cardStyle, width: "100%", maxWidth: 420, marginBottom: 0 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 700, fontSize: 34, lineHeight: 1, marginBottom: 6 }}>WITH</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, marginBottom: 8 }}>We’re in this together.</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 22 }}>
          {mode === "forgot" ? "We’ll send you a link to choose a new password." : "Your health is personal, but you don't have to do it alone."}
        </div>

        {mode !== "forgot" && (
          <div style={{ display: "flex", background: SURFACE_2, borderRadius: 9, padding: 3, marginBottom: 20 }}>
            {["signin","signup"].map((m) => <button type="button" key={m} onClick={() => { setMode(m); setError(""); setMessage(""); }} style={{ flex: 1, border: "none", borderRadius: 7, padding: 9, background: mode === m ? SURFACE : "transparent", color: mode === m ? TEXT : TEXT_MUTED, fontWeight: 700 }}>{m === "signin" ? "Sign in" : "Create account"}</button>)}
          </div>
        )}

        <div style={fieldLabel}>Email</div>
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />

        {mode !== "forgot" && <>
          <div style={fieldLabel}>Password</div>
          <input type="password" minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} required value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
        </>}

        {error && <div style={{ color: WARN, fontSize: 13, marginBottom: 10 }}>{error}</div>}
        {message && <div style={{ color: USER_COLOR.Alli, fontSize: 13, marginBottom: 10 }}>{message}</div>}

        <button disabled={busy} style={{ ...bigButton(USER_COLOR.Shane, USER_TEXT_ON.Shane), opacity: busy ? 0.65 : 1 }}>
          {busy ? "Working…" : mode === "forgot" ? "Send reset link" : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        {mode === "signin" && <button type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: TEXT_MUTED, width: "100%", padding: "13px 8px 2px", fontSize: 13 }}>Forgot password?</button>}
        {mode === "forgot" && <button type="button" onClick={() => { setMode("signin"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: TEXT_MUTED, width: "100%", padding: "13px 8px 2px", fontSize: 13 }}>Back to sign in</button>}
      </form>
    </div>
  );
}

function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function updatePassword(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Use at least 6 characters."); return; }
    if (password !== confirm) { setError("Those passwords don't match."); return; }
    setBusy(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) setError(authError.message);
    else onDone();
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, display: "grid", placeItems: "center", padding: 20, fontFamily: "'Karla', -apple-system, sans-serif" }}>
      <form onSubmit={updatePassword} style={{ ...cardStyle, width: "100%", maxWidth: 420, marginBottom: 0 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 700, fontSize: 34, lineHeight: 1, marginBottom: 6 }}>WITH</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 18, marginBottom: 20 }}>Choose a new password.</div>
        <div style={fieldLabel}>New password</div>
        <input type="password" minLength={6} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
        <div style={fieldLabel}>Confirm password</div>
        <input type="password" minLength={6} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
        {error && <div style={{ color: WARN, fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button disabled={busy} style={{ ...bigButton(USER_COLOR.Shane, USER_TEXT_ON.Shane), opacity: busy ? .65 : 1 }}>{busy ? "Saving…" : "Save new password"}</button>
      </form>
    </div>
  );
}

function Onboarding({ onComplete }) {
  const [mode, setMode] = useState(null);
  const [householdName, setHouseholdName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function createHousehold(e) {
    e.preventDefault(); setBusy(true); setError("");
    const { error } = await supabase.rpc("create_household", { household_name: householdName.trim(), profile_name: profileName.trim() });
    if (error) setError(error.message); else await onComplete();
    setBusy(false);
  }
  async function joinHousehold(e) {
    e.preventDefault(); setBusy(true); setError("");
    const { error } = await supabase.rpc("join_household", { invite_code_input: inviteCode.trim().toUpperCase(), profile_name: profileName.trim() });
    if (error) setError(error.message); else await onComplete();
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, display: "grid", placeItems: "center", padding: 20, fontFamily: "'Karla', -apple-system, sans-serif" }}>
      <div style={{ ...cardStyle, width: "100%", maxWidth: 440, marginBottom: 0 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 30, marginBottom: 8 }}>Welcome to WITH</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 22 }}>Who are you with?</div>
        {!mode ? <>
          <button onClick={() => setMode("create")} style={{ ...bigButton(USER_COLOR.Shane, USER_TEXT_ON.Shane), marginBottom: 10 }}>Start a group</button>
          <button onClick={() => setMode("join")} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Join your people</button>
        </> : (
          <form onSubmit={mode === "create" ? createHousehold : joinHousehold}>
            {mode === "create" ? <>
              <div style={fieldLabel}>Group name</div>
              <input required placeholder="e.g. Shane & Alli" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
            </> : <>
              <div style={fieldLabel}>Invite code</div>
              <input required placeholder="e.g. A7K2M9QX" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} style={{ ...inputStyle, marginBottom: 12, textTransform: "uppercase" }} />
            </>}
            <div style={fieldLabel}>Your profile name</div>
            <input required placeholder="e.g. Shane" value={profileName} onChange={(e) => setProfileName(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
            {error && <div style={{ color: WARN, fontSize: 13, marginBottom: 10 }}>{error}</div>}
            <button disabled={busy} style={{ ...bigButton(USER_COLOR.Shane, USER_TEXT_ON.Shane), opacity: busy ? .65 : 1, marginBottom: 10 }}>{busy ? "Working…" : mode === "create" ? "Start group" : "Join group"}</button>
            <button type="button" onClick={() => { setMode(null); setError(""); }} style={{ background: "none", border: "none", color: TEXT_MUTED, width: "100%", padding: 8 }}>Back</button>
          </form>
        )}
      </div>
    </div>
  );
}

function ClaimProfile({ profiles, onClaim }) {
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const available = Object.values(profiles).filter((p) => !p.user_id);

  async function claim() {
    if (!selected) return;
    setBusy(true); setError("");
    const { error } = await supabase.rpc("claim_profile", { profile_id_input: selected });
    if (error) setError(error.message); else await onClaim();
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, display: "grid", placeItems: "center", padding: 20, fontFamily: "'Karla', -apple-system, sans-serif" }}>
      <div style={{ ...cardStyle, width: "100%", maxWidth: 440, marginBottom: 0 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 700, fontSize: 30, marginBottom: 6 }}>WITH</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 17, marginBottom: 16 }}>We’re in this together.</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 18 }}>Which profile is yours?</div>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
          <option value="">Choose your profile</option>
          {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {error && <div style={{ color: WARN, fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button disabled={!selected || busy} onClick={claim} style={{ ...bigButton(USER_COLOR.Shane, USER_TEXT_ON.Shane), opacity: !selected || busy ? .6 : 1 }}>{busy ? "Connecting…" : "This is me"}</button>
      </div>
    </div>
  );
}

export default function Tracker() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [householdId, setHouseholdId] = useState(null);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [ownedProfileId, setOwnedProfileId] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [activeUser, setActiveUser] = useState("Alli");
  const [tab, setTab] = useState("today");
  const [logTab, setLogTab] = useState(() => localStorage.getItem("with-log-tab") || "food");
  const [toast, setToast] = useState(null);
  const [buttonSuccess, setButtonSuccess] = useState(null);
  const [data, setData] = useState({ Alli: emptyData("Alli"), Shane: emptyData("Shane") });
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(null);
  const [savedFoods, setSavedFoods] = useState([]);
  const [globalFoods, setGlobalFoods] = useState([]);
  const [savedSearch, setSavedSearch] = useState("");
  const [selectedSavedFoodId, setSelectedSavedFoodId] = useState(null);
  const [foodQuantity, setFoodQuantity] = useState("1");
  const [foodServingLabel, setFoodServingLabel] = useState("1 serving");
  const [saveAsSaved, setSaveAsSaved] = useState(false);
  const [editingSavedId, setEditingSavedId] = useState(null);
  const [showManageSaved, setShowManageSaved] = useState(false);
  const [foodStates, setFoodStates] = useState([]);
  const [foodLibraryTab, setFoodLibraryTab] = useState("recent");

  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState(todayStr());
  const [weightError, setWeightError] = useState("");

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
  const [goalDateInput, setGoalDateInput] = useState("");
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
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
      if (!hid) {
        setNeedsOnboarding(true);
        setHouseholdId(null);
        setLoading(false);
        return;
      }
      setNeedsOnboarding(false);
      setHouseholdId(hid);
      const { data: householdRow } = await supabase.from("households").select("name, invite_code").eq("id", hid).single();
      setHouseholdName(householdRow?.name || "Your household");
      setInviteCode(householdRow?.invite_code || "");

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles").select("*").eq("household_id", hid);
      if (profileError) throw profileError;
      const pmap = {};
      const next = {};
      (profileRows || []).forEach((p) => {
        pmap[p.name] = p;
        next[p.name] = {
          ...emptyData(p.name),
          goalWeight: p.goal_weight == null ? null : num(p.goal_weight),
          goalDate: p.goal_date || null,
          targets: { bmr: num(p.bmr), calories: num(p.calories), protein: num(p.protein), carbs: num(p.carbs), fat: num(p.fat), fiberMin: num(p.fiber_min), fiberMax: num(p.fiber_max) },
        };
      });
      setProfiles(pmap);
      const owned = (profileRows || []).find((p) => p.user_id === session.user.id);
      setOwnedProfileId(owned?.id || null);
      if (owned) setProfileNameInput(owned.name || "");
      setEmailInput(session.user.email || "");
      if (owned) setActiveUser(owned.name);
      else if (!pmap[activeUser] && Object.keys(pmap).length) setActiveUser(Object.keys(pmap)[0]);
      const profileIds = Object.values(pmap).map((p) => p.id);
      if (!profileIds.length) throw new Error("No health profiles exist for this household.");

      const [weightsRes, foodsRes, activitiesRes, stepsRes, waterRes, savedFoodsRes, globalFoodsRes, foodStatesRes] = await Promise.all([
        supabase.from("weight_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("food_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("activity_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("step_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("water_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("saved_foods").select("*").eq("household_id", hid).order("name"),
        supabase.from("global_foods").select("*").order("name"),
        supabase.from("household_food_state").select("*").eq("household_id", hid),
      ]);
      for (const r of [weightsRes, foodsRes, activitiesRes, stepsRes, waterRes, savedFoodsRes, globalFoodsRes, foodStatesRes]) if (r.error) throw r.error;
      const nameById = Object.fromEntries(Object.values(pmap).map((p) => [p.id, p.name]));
      for (const w of weightsRes.data || []) { const n = nameById[w.profile_id]; if (next[n]) next[n].weights.push({ id: w.id, date: w.entry_date, weight: num(w.weight) }); }
      for (const f of foodsRes.data || []) { const n = nameById[f.profile_id]; if (next[n]) next[n].foods.push({ id: f.id, date: f.entry_date, name: f.name, calories: num(f.calories), protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat), fiber: num(f.fiber), meal: f.meal, notes: f.notes || "" }); }
      for (const a of activitiesRes.data || []) { const n = nameById[a.profile_id]; if (next[n]) next[n].activities.push({ id: a.id, date: a.entry_date, name: a.name, caloriesBurned: num(a.calories_burned) }); }
      for (const s of stepsRes.data || []) { const n = nameById[s.profile_id]; if (next[n]) next[n].steps.push({ id: s.id, date: s.entry_date, count: Number(s.step_count) }); }
      for (const w of waterRes.data || []) { const n = nameById[w.profile_id]; if (next[n]) next[n].water.push({ id: w.id, date: w.entry_date, ounces: num(w.ounces) }); }
      setSavedFoods((savedFoodsRes.data || []).map((f) => ({ ...f, source: "household", calories: num(f.calories), protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat), fiber: num(f.fiber), use_count: Number(f.use_count || 0) })));
      setGlobalFoods((globalFoodsRes.data || []).map((f) => ({ ...f, source: "global", calories: num(f.calories), protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat), fiber: num(f.fiber) })));
      setFoodStates(foodStatesRes.data || []);
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
    setGoalDateInput(u.goalDate || "");
    setTBmr(u.targets.bmr); setTCal(u.targets.calories); setTProtein(u.targets.protein);
    setTCarbs(u.targets.carbs); setTFat(u.targets.fat); setTFiberMin(u.targets.fiberMin); setTFiberMax(u.targets.fiberMax);
  }, [activeUser, loading, data]);

  const profileNames = Object.keys(profiles);
  useEffect(() => {
    if (profileNames.length && !profiles[activeUser]) setActiveUser(profileNames[0]);
  }, [profiles, activeUser]);
  useEffect(() => {
    document.title = householdName ? `WITH — ${householdName}` : "WITH";
  }, [householdName]);

  async function saveProfileName() {
    if (!ownedProfileId || !profileNameInput.trim()) return;
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const { error } = await supabase.from("profiles").update({ name: profileNameInput.trim() }).eq("id", ownedProfileId);
    if (error) setAccountError(error.message);
    else { setAccountMessage("Profile name updated."); await loadAll(); }
    setAccountBusy(false);
  }

  async function saveEmail() {
    if (!emailInput.trim()) return;
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const { error } = await supabase.auth.updateUser({ email: emailInput.trim() });
    if (error) setAccountError(error.message);
    else setAccountMessage("Email update requested. Check your inbox to confirm the change.");
    setAccountBusy(false);
  }

  async function savePassword() {
    setAccountError(""); setAccountMessage("");
    if (newPasswordInput.length < 6) { setAccountError("Use at least 6 characters."); return; }
    if (newPasswordInput !== confirmPasswordInput) { setAccountError("Those passwords don't match."); return; }
    setAccountBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPasswordInput });
    if (error) setAccountError(error.message);
    else { setAccountMessage("Password updated."); setNewPasswordInput(""); setConfirmPasswordInput(""); }
    setAccountBusy(false);
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") { setAccountError('Type DELETE to confirm.'); return; }
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) { setAccountError(error.message || "Could not delete account."); setAccountBusy(false); return; }
    await supabase.auth.signOut();
    setAccountBusy(false);
  }

  function profileFor(name) { return profiles[name]; }
  function canEdit(name) { return profiles[name]?.user_id === session?.user?.id; }
  const activeCanEdit = canEdit(activeUser);
  async function runWrite(work) {
    setSaveError(null);
    try { await work(); await loadAll(); return true; }
    catch (e) { setSaveError(e.message || "Save failed. Try again."); return false; }
  }

  function showSuccess(message, kind) {
    setToast(message);
    setButtonSuccess(kind);
    window.clearTimeout(window.__withToastTimer);
    window.clearTimeout(window.__withButtonTimer);
    window.__withToastTimer = window.setTimeout(() => setToast(null), 2800);
    window.__withButtonTimer = window.setTimeout(() => setButtonSuccess(null), 1400);
  }

  function openLog(kind = logTab) {
    setLogTab(kind);
    localStorage.setItem("with-log-tab", kind);
    setTab("log");
  }

  async function addWeight() {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    const val = parseFloat(weightInput);
    if (!weightInput || isNaN(val) || val <= 0) { setWeightError("Enter a real weight first."); return; }
    setWeightError("");
    const p = profileFor(activeUser); if (!p) return;
    const ok = await runWrite(async () => {
      const { error } = await supabase.from("weight_entries").upsert({ household_id: householdId, profile_id: p.id, entry_date: weightDate, weight: val }, { onConflict: "profile_id,entry_date" });
      if (error) throw error;
    });
    if (ok) { setWeightInput(""); showSuccess(`${val} lb logged`, "weight"); }
  }
  async function deleteWeight(id) {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; } await runWrite(async () => { const { error } = await supabase.from("weight_entries").delete().eq("id", id); if (error) throw error; }); }

  function clearFoodForm() {
    setFoodName(""); setFoodCals(""); setFoodProtein(""); setFoodCarbs(""); setFoodFat(""); setFoodFiber(""); setFoodNotes("");
    setFoodQuantity("1"); setFoodServingLabel("1 serving"); setSaveAsSaved(false); setSelectedSavedFoodId(null); setEditingSavedId(null);
  }

  function chooseSavedFood(food) {
    setSelectedSavedFoodId(`${food.source || "household"}:${food.id}`);
    setEditingSavedId(null);
    setFoodQuantity("1");
    setFoodName(food.name);
    setFoodCals(String(Math.round(food.calories * 10) / 10));
    setFoodProtein(String(Math.round(food.protein * 10) / 10));
    setFoodCarbs(String(Math.round(food.carbs * 10) / 10));
    setFoodFat(String(Math.round(food.fat * 10) / 10));
    setFoodFiber(String(Math.round(food.fiber * 10) / 10));
    setFoodMeal(food.default_meal || foodMeal);
    setFoodNotes(food.notes || "");
    setFoodServingLabel(food.serving_label || "1 serving");
    setSaveAsSaved(false);
    setSavedSearch("");
  }

  function changeQuantity(value) {
    setFoodQuantity(value);
    const [source, id] = String(selectedSavedFoodId || "").split(":");
    const collection = source === "global" ? globalFoods : savedFoods;
    const food = collection.find((f) => f.id === id);
    const q = parseFloat(value);
    if (!food || !Number.isFinite(q) || q <= 0) return;
    setFoodCals(String(Math.round(food.calories * q * 10) / 10));
    setFoodProtein(String(Math.round(food.protein * q * 10) / 10));
    setFoodCarbs(String(Math.round(food.carbs * q * 10) / 10));
    setFoodFat(String(Math.round(food.fat * q * 10) / 10));
    setFoodFiber(String(Math.round(food.fiber * q * 10) / 10));
  }

  function editSavedFood(food) {
    setEditingSavedId(food.id);
    setSelectedSavedFoodId(null);
    setFoodName(food.name); setFoodCals(String(food.calories)); setFoodProtein(String(food.protein)); setFoodCarbs(String(food.carbs)); setFoodFat(String(food.fat)); setFoodFiber(String(food.fiber));
    setFoodMeal(food.default_meal || "Breakfast"); setFoodNotes(food.notes || ""); setFoodServingLabel(food.serving_label || "1 serving"); setFoodQuantity("1"); setSaveAsSaved(true);
    setShowManageSaved(false);
  }

  async function saveSavedFoodOnly() {
    if (!foodName.trim()) { setFoodError("Give it a name."); return; }
    const payload = { household_id: householdId, name: foodName.trim(), calories: parseFloat(foodCals) || 0, protein: parseFloat(foodProtein) || 0, carbs: parseFloat(foodCarbs) || 0, fat: parseFloat(foodFat) || 0, fiber: parseFloat(foodFiber) || 0, default_meal: foodMeal, notes: foodNotes.trim() || null, serving_label: foodServingLabel.trim() || "1 serving" };
    const ok = await runWrite(async () => {
      const q = editingSavedId ? supabase.from("saved_foods").update(payload).eq("id", editingSavedId) : supabase.from("saved_foods").insert(payload);
      const { error } = await q; if (error) throw error;
    });
    if (ok) clearFoodForm();
  }

  async function deleteSavedFood(id) {
    await runWrite(async () => { const { error } = await supabase.from("saved_foods").delete().eq("id", id); if (error) throw error; });
    if (selectedSavedFoodId === `household:${id}` || editingSavedId === id) clearFoodForm();
  }

  function stateForFood(source, id) {
    return foodStates.find((s) => s.food_source === source && s.food_id === id);
  }

  function isFavoriteFood(food) {
    return !!stateForFood(food.source || "household", food.id)?.is_favorite;
  }

  async function toggleFavorite(food) {
    const source = food.source || "household";
    const current = stateForFood(source, food.id);
    const nextFavorite = !current?.is_favorite;
    await runWrite(async () => {
      const payload = { household_id: householdId, food_source: source, food_id: food.id, is_favorite: nextFavorite };
      const { error } = await supabase.from("household_food_state").upsert(payload, { onConflict: "household_id,food_source,food_id" });
      if (error) throw error;
    });
  }

  async function recordFoodUse(source, id) {
    if (!id) return;
    const current = stateForFood(source, id);
    const payload = {
      household_id: householdId, food_source: source, food_id: id,
      is_favorite: !!current?.is_favorite, use_count: Number(current?.use_count || 0) + 1,
      last_used_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("household_food_state").upsert(payload, { onConflict: "household_id,food_source,food_id" });
    if (error) throw error;
  }

  async function addFood() {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    if (!foodName.trim()) { setFoodError("Give it a name."); return; }
    const cals = parseFloat(foodCals) || 0, protein = parseFloat(foodProtein) || 0;
    const carbs = parseFloat(foodCarbs) || 0, fat = parseFloat(foodFat) || 0, fiber = parseFloat(foodFiber) || 0;
    if (!foodCals && !foodProtein && !foodCarbs && !foodFat) { setFoodError("Add at least calories or a macro."); return; }
    setFoodError(""); const p = profileFor(activeUser); if (!p) return;
    const ok = await runWrite(async () => {
      let savedId = null;
      const [selectedSource, selectedId] = String(selectedSavedFoodId || "").split(":");
      if (saveAsSaved && !selectedSavedFoodId) {
        const { data: sf, error: sfError } = await supabase.from("saved_foods").insert({ household_id: householdId, name: foodName.trim(), calories: cals, protein, carbs, fat, fiber, default_meal: foodMeal, notes: foodNotes.trim() || null, serving_label: foodServingLabel.trim() || "1 serving", use_count: 1, last_used_at: new Date().toISOString() }).select("id").single();
        if (sfError) throw sfError; savedId = sf.id;
        await recordFoodUse("household", savedId);
      } else if (selectedSavedFoodId && selectedSource === "household") {
        savedId = selectedId;
        const food = savedFoods.find((f) => f.id === selectedId);
        const { error: useError } = await supabase.from("saved_foods").update({ use_count: (food?.use_count || 0) + 1, last_used_at: new Date().toISOString() }).eq("id", selectedId);
        if (useError) throw useError;
      }
      if (selectedSavedFoodId) await recordFoodUse(selectedSource, selectedId);
      const { error } = await supabase.from("food_entries").insert({ household_id: householdId, profile_id: p.id, saved_food_id: savedId, entry_date: foodDate, name: foodName.trim(), calories: cals, protein, carbs, fat, fiber, meal: foodMeal, notes: foodNotes.trim() || null });
      if (error) throw error;
    });
    if (ok) { const loggedName = foodName.trim(); clearFoodForm(); showSuccess(`${loggedName} added`, "food"); }
  }
  async function deleteFood(id) {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; } await runWrite(async () => { const { error } = await supabase.from("food_entries").delete().eq("id", id); if (error) throw error; }); }

  async function saveSteps() {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    const val = parseInt(stepsInput, 10); if (!stepsInput || isNaN(val) || val < 0) return;
    const p = profileFor(activeUser); if (!p) return;
    const ok = await runWrite(async () => { const { error } = await supabase.from("step_entries").upsert({ household_id: householdId, profile_id: p.id, entry_date: stepsDate, step_count: val }, { onConflict: "profile_id,entry_date" }); if (error) throw error; });
    if (ok) { setStepsInput(""); showSuccess(`${val.toLocaleString()} steps saved`, "steps"); }
  }
  async function addWater(amount) {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    const val = amount != null ? amount : parseFloat(waterOz); if (!val || isNaN(val) || val <= 0) return;
    const p = profileFor(activeUser); if (!p) return;
    const ok = await runWrite(async () => { const { error } = await supabase.from("water_entries").insert({ household_id: householdId, profile_id: p.id, entry_date: waterDate, ounces: val }); if (error) throw error; });
    if (ok) { setWaterOz(""); showSuccess(`${val} oz water added`, "water"); }
  }
  async function addActivity() {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    if (!actName.trim()) return; const cals = parseFloat(actCals) || 0; if (!cals) return;
    const p = profileFor(activeUser); if (!p) return;
    const ok = await runWrite(async () => { const { error } = await supabase.from("activity_entries").insert({ household_id: householdId, profile_id: p.id, entry_date: actDate, name: actName.trim(), calories_burned: cals }); if (error) throw error; });
    if (ok) { const loggedActivity = actName.trim(); setActName(""); setActCals(""); showSuccess(`${loggedActivity} added`, "activity"); }
  }
  async function deleteActivity(id) {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; } await runWrite(async () => { const { error } = await supabase.from("activity_entries").delete().eq("id", id); if (error) throw error; }); }

  async function saveGoal() {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    const val = parseFloat(goalInput); const p = profileFor(activeUser); if (!p) return;
    await runWrite(async () => { const { error } = await supabase.from("profiles").update({ goal_weight: isNaN(val) ? null : val, goal_date: goalDateInput || null }).eq("id", p.id); if (error) throw error; });
  }
  async function saveTargets() {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    const p = profileFor(activeUser); if (!p) return;
    await runWrite(async () => {
      const { error } = await supabase.from("profiles").update({ bmr: parseFloat(tBmr) || 0, calories: parseFloat(tCal) || 0, protein: parseFloat(tProtein) || 0, carbs: parseFloat(tCarbs) || 0, fat: parseFloat(tFat) || 0, fiber_min: parseFloat(tFiberMin) || 0, fiber_max: parseFloat(tFiberMax) || 0 }).eq("id", p.id);
      if (error) throw error;
    });
  }

  const allLibraryFoods = useMemo(() => [...savedFoods, ...globalFoods], [savedFoods, globalFoods]);

  const managedSavedFoods = useMemo(() => {
    const q = savedSearch.trim().toLowerCase();
    return savedFoods.filter((f) => !q || f.name.toLowerCase().includes(q)).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [savedFoods, savedSearch]);

  const visibleLibraryFoods = useMemo(() => {
    const q = savedSearch.trim().toLowerCase();
    let list = allLibraryFoods;
    if (q) {
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    } else if (foodLibraryTab === "favorites") {
      list = list.filter(isFavoriteFood);
    } else if (foodLibraryTab === "mine") {
      list = list.filter((f) => f.source === "household");
    } else if (foodLibraryTab === "shared") {
      list = list.filter((f) => f.source === "global");
    } else {
      list = list.filter((f) => !!stateForFood(f.source, f.id)?.last_used_at);
    }
    return list.slice().sort((a, b) => {
      if (q) return a.name.localeCompare(b.name);
      if (foodLibraryTab === "recent") {
        const ad = stateForFood(a.source, a.id)?.last_used_at || "";
        const bd = stateForFood(b.source, b.id)?.last_used_at || "";
        return bd.localeCompare(ad);
      }
      return a.name.localeCompare(b.name);
    });
  }, [allLibraryFoods, savedSearch, foodLibraryTab, foodStates]);

  const chartData = useMemo(() => {
    const dateSet = new Set();
    profileNames.forEach((u) => data[u].weights.forEach((w) => dateSet.add(w.date)));
    const dates = Array.from(dateSet).sort();
    const avgMaps = {};
    profileNames.forEach((u) => { avgMaps[u] = rollingAvgSeries(data[u].weights.slice().sort((a, b) => a.date.localeCompare(b.date)), 7); });
    return dates.map((d) => {
      const row = { date: d, label: fmtDate(d) };
      profileNames.forEach((u) => {
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
    profileNames.forEach((u) => {
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
    profileNames.forEach((u) => {
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

  const activeGoalDate = data[activeUser]?.goalDate || null;
  const weeksLeft = activeGoalDate ? weeksUntil(activeGoalDate) : null;

  if (!authReady) {
    return <div style={{ minHeight: "100vh", background: BG, color: TEXT_MUTED, padding: "3rem", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>checking your session...</div>;
  }
  if (passwordRecovery && session) return <ResetPasswordScreen onDone={() => setPasswordRecovery(false)} />;
  if (!session) return <AuthScreen />;
  if (needsOnboarding) return <Onboarding onComplete={loadAll} />;
  if (!loading && session && !ownedProfileId && Object.values(profiles).some((p) => !p.user_id)) return <ClaimProfile profiles={profiles} onClaim={loadAll} />;
  if (loading) {
    return <div style={{ minHeight: "100vh", background: BG, color: TEXT_MUTED, padding: "3rem", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>loading the shared space...</div>;
  }

  const gi = goalInfo(activeUser);
  const ts = todayStats[activeUser];

  const NAV_ITEMS = [
    { id: "today", label: "Today", icon: Home },
    { id: "log", label: "Log", icon: PlusCircle },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "goals", label: "Goals", icon: Target },
    { id: "profile", label: "Profile", icon: UserCircle },
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
              WITH
              <div style={{ fontFamily: "'Karla', sans-serif", fontStyle: "normal", fontWeight: 500, fontSize: 11, color: TEXT_MUTED, marginTop: 3 }}>{householdName}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3 }}>
              {profileNames.map((u) => (
                <button key={u} onClick={() => setActiveUser(u)} style={{
                  border: "none", padding: "9px 16px", borderRadius: 8,
                  fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 15,
                  background: activeUser === u ? userColor(u) : "transparent",
                  color: activeUser === u ? USER_TEXT_ON[u] : TEXT_MUTED,
                }}>{u}</button>
              ))}
              </div>
              <button title="Sign out" onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", color: TEXT_MUTED, padding: 7, display: "grid", placeItems: "center" }}><LogOut style={{ width: 18, height: 18 }} /></button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>
              {activeGoalDate ? `${weeksLeft} ${weeksLeft === 1 ? "week" : "weeks"} until ${fmtGoalDate(activeGoalDate)}` : "No goal date set"}
            </div>
            {inviteCode && <button onClick={() => navigator.clipboard?.writeText(inviteCode)} title={`Invite code: ${inviteCode}. Tap to copy.`} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><Users style={{ width: 13, height: 13 }} /> Invite someone</button>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "1rem 1rem", paddingBottom: NAV_H + 32 }}>
        {saveError && (
          <div style={{ background: "#3A2420", border: `1px solid ${WARN}`, color: WARN, padding: "10px 14px", borderRadius: 10, marginBottom: "1rem", fontSize: 13 }}>{saveError}</div>
        )}
        {!activeCanEdit && (
          <div style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, color: TEXT_MUTED, padding: "10px 14px", borderRadius: 10, marginBottom: "1rem", fontSize: 12 }}>
            You’re viewing {activeUser}’s health information. Only {activeUser} can make changes.
          </div>
        )}

        {tab === "today" && (
          <>
            {(() => {
              const u = data[activeUser];
              const targets = u.targets;
              const todaysFoods = u.foods.filter((f) => f.date === today);
              const todaysActivities = u.activities.filter((a) => a.date === today);
              const todaysWeight = u.weights.filter((w) => w.date === today);
              const hasAnything = todaysFoods.length > 0 || todaysActivities.length > 0 || ts.water > 0 || ts.steps != null || todaysWeight.length > 0;
              const isMine = activeCanEdit;
              const otherPeople = profileNames.filter((n) => n !== activeUser);
              const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snack"];
              const groups = {};
              todaysFoods.forEach((f) => { const key = f.meal || "Other"; if (!groups[key]) groups[key] = []; groups[key].push(f); });
              const orderedKeys = [...MEAL_ORDER.filter((m) => groups[m]), ...Object.keys(groups).filter((k) => !MEAL_ORDER.includes(k))];

              const quick = [
                ["Food", "food"],
                ["Weight", "weight"],
                ["Activity", "activity"],
                ["Water", "water"],
                ["Steps", "steps"],
              ];

              return <>
                <div style={{ padding: "0.35rem 0.15rem 1rem" }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 30, lineHeight: 1.08, color: TEXT }}>
                    {isMine ? `${greeting()}, ${activeUser}.` : `${activeUser} today`}
                  </div>
                  <div style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 5 }}>{fullTodayLabel()}</div>
                </div>

                {!hasAnything && (
                  <div style={{ ...cardStyle, padding: "1.45rem", background: "#FFF8EE", borderColor: "#E6D6C1" }}>
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
                      {isMine ? "Nothing here yet." : "Nothing shared yet."}
                    </div>
                    <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginBottom: isMine ? 16 : 0 }}>
                      {isMine ? "Add something whenever you’re ready. A little information is still useful information." : `${activeUser} hasn’t added anything today.`}
                    </div>
                    {isMine && <button onClick={() => openLog("food")} style={{ ...bigButton(userColor(activeUser), userText(activeUser)), width: "auto", paddingInline: 20 }}>Add something</button>}
                  </div>
                )}

                {isMine && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 700, margin: "0 2px 8px", textTransform: "uppercase", letterSpacing: ".06em" }}>Quick add</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
                      {quick.map(([label, kind]) => (
                        <button key={label} onClick={() => openLog(kind)} style={{ background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "11px 4px", fontSize: 11, fontWeight: 700, boxShadow: "0 3px 12px rgba(65,48,30,.035)" }}>+ {label}</button>
                      ))}
                    </div>
                  </div>
                )}

                {hasAnything && (
                  <div style={{ ...cardStyle, padding: "1.35rem" }}>
                    <div style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Today at a glance</div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600 }}>Calories</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{Math.round(ts.calories)} <span style={{ color: TEXT_MUTED, fontSize: 13, fontWeight: 500 }}>/ {targets.calories}</span></div>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: SURFACE_2, overflow: "hidden", marginBottom: 16 }}>
                      <div style={{ width: `${targets.calories ? Math.min(100, ts.calories / targets.calories * 100) : 0}%`, height: "100%", background: userColor(activeUser), borderRadius: 99 }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "9px 16px", marginBottom: 15 }}>
                      {[
                        ["Protein", ts.protein, targets.protein, "g"],
                        ["Carbs", ts.carbs, targets.carbs, "g"],
                        ["Fat", ts.fat, targets.fat, "g"],
                        ["Fiber", ts.fiber, `${targets.fiberMin}–${targets.fiberMax}`, "g"],
                      ].map(([label,val,target,unit]) => (
                        <div key={label} style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                          <div style={{ color: TEXT_MUTED, fontSize: 11 }}>{label}</div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{Math.round(val)}{unit} <span style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 500 }}>/ {target}{unit}</span></div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 18, paddingTop: 12, borderTop: `1px solid ${BORDER}`, color: TEXT_MUTED, fontSize: 13 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Zap style={{ width: 15 }} />{Math.round(ts.burned)} cal activity</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Footprints style={{ width: 15 }} />{ts.steps != null ? ts.steps.toLocaleString() : "No steps"}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Droplet style={{ width: 15 }} />{Math.round(ts.water)} oz</span>
                    </div>
                  </div>
                )}

                <div style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={headingStyle}>Today so far</div>
                    {isMine && <button onClick={() => openLog("food")} style={{ background: "none", border: "none", color: userColor(activeUser, true), fontWeight: 700, fontSize: 12 }}>+ Add food</button>}
                  </div>

                  {todaysFoods.length === 0 && todaysActivities.length === 0 && ts.water === 0 && ts.steps == null && todaysWeight.length === 0 ? (
                    <div style={{ color: TEXT_MUTED, fontSize: 13 }}>Nothing logged yet.</div>
                  ) : <>
                    {orderedKeys.map((meal) => (
                      <div key={meal} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 5 }}>{meal}</div>
                        {groups[meal].map((f) => (
                          <div key={f.id} style={{ padding: "8px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <span style={{ fontWeight: 600 }}>{f.name}</span>
                              <span style={{ color: TEXT_MUTED }}>{Math.round(f.calories)} cal</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    {todaysActivities.length > 0 && <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 5 }}>Activity</div>
                      {todaysActivities.map((a) => <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}><span style={{ fontWeight: 600 }}>{a.name}</span><span style={{ color: TEXT_MUTED }}>{Math.round(a.caloriesBurned)} cal</span></div>)}
                    </div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
                      {todaysWeight.length > 0 && <span style={{ background: SURFACE_2, borderRadius: 999, padding: "7px 10px", fontSize: 12 }}>Weight {todaysWeight[todaysWeight.length-1].weight} lb</span>}
                      {ts.water > 0 && <span style={{ background: SURFACE_2, borderRadius: 999, padding: "7px 10px", fontSize: 12 }}>Water {Math.round(ts.water)} oz</span>}
                      {ts.steps != null && <span style={{ background: SURFACE_2, borderRadius: 999, padding: "7px 10px", fontSize: 12 }}>Steps {ts.steps.toLocaleString()}</span>}
                    </div>
                  </>}
                </div>

                {otherPeople.length > 0 && (
                  <div style={cardStyle}>
                    <div style={headingStyle}>People you’re with</div>
                    {otherPeople.map((name) => {
                      const o = todayStats[name];
                      const od = data[name];
                      const hasOther = od.foods.some((f) => f.date === today) || od.activities.some((a) => a.date === today) || o?.water > 0 || o?.steps != null || od.weights.some((w) => w.date === today);
                      return <button key={name} onClick={() => setActiveUser(name)} style={{ width: "100%", textAlign: "left", background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px", color: TEXT, marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600 }}>{name}</span>
                          <span style={{ color: TEXT_MUTED, fontSize: 12 }}>View day →</span>
                        </div>
                        <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 4 }}>{hasOther ? `${Math.round(o.calories)} cal logged${o.steps != null ? ` · ${o.steps.toLocaleString()} steps` : ""}${o.water > 0 ? ` · ${Math.round(o.water)} oz water` : ""}` : "Nothing shared today yet."}</div>
                      </button>;
                    })}
                  </div>
                )}
              </>;
            })()}
          </>
        )}

        {tab === "log" && (
          <>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "2px 1px 10px", marginBottom: 6, WebkitOverflowScrolling: "touch" }}>
              {[["food","Food"],["weight","Weight"],["activity","Activity"],["water","Water"],["steps","Steps"]].map(([id,label]) => (
                <button key={id} onClick={() => { setLogTab(id); localStorage.setItem("with-log-tab", id); }} style={{ flexShrink: 0, border: `1px solid ${logTab === id ? userColor(activeUser) : BORDER}`, background: logTab === id ? "#FFF8EE" : SURFACE, color: logTab === id ? TEXT : TEXT_MUTED, borderRadius: 999, padding: "9px 13px", fontSize: 12, fontWeight: 700 }}>{label}</button>
              ))}
            </div>
            {logTab === "food" && <>
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ ...headingStyle, marginBottom: 0 }}>Food</div>
                {savedFoods.length > 0 && <button onClick={() => setShowManageSaved(!showManageSaved)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12 }}>{showManageSaved ? "done" : `manage mine (${savedFoods.length})`}</button>}
              </div>

              {(savedFoods.length > 0 || globalFoods.length > 0) && (
                <div style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, ...fieldLabel }}><Search style={{ width: 13, height: 13 }} /> Find a food</div>
                  <input type="text" placeholder="Search all foods" value={savedSearch} onChange={(e) => setSavedSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                  {!showManageSaved && <>
                    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 4 }}>
                      {[
                        ["recent", "Recent"], ["favorites", "★ Favorites"], ["mine", "All Mine"], ["shared", "Shared"],
                      ].map(([id, label]) => (
                        <button key={id} onClick={() => { setFoodLibraryTab(id); setSavedSearch(""); }} style={{ flexShrink: 0, border: `1px solid ${foodLibraryTab === id ? userColor(activeUser) : BORDER}`, background: foodLibraryTab === id ? SURFACE : "transparent", color: foodLibraryTab === id ? TEXT : TEXT_MUTED, borderRadius: 999, padding: "7px 10px", fontSize: 11, fontWeight: 700 }}>{label}</button>
                      ))}
                    </div>
                    <div style={{ display: "grid", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                      {visibleLibraryFoods.slice(0, savedSearch ? 20 : 12).map((f) => (
                        <div key={`${f.source}-${f.id}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 5, alignItems: "stretch" }}>
                          <button onClick={() => chooseSavedFood(f)} style={{ textAlign: "left", background: selectedSavedFoodId === `${f.source}:${f.id}` ? SURFACE : "transparent", border: `1px solid ${selectedSavedFoodId === `${f.source}:${f.id}` ? userColor(activeUser) : BORDER}`, color: TEXT, borderRadius: 8, padding: "9px 10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontWeight: 700 }}>{f.name}</span><span className="num" style={{ color: TEXT_MUTED, fontSize: 11 }}>{Math.round(f.calories)} cal</span></div>
                            <div className="num" style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2 }}>{f.serving_label || "1 serving"} · P{Math.round(f.protein)} C{Math.round(f.carbs)} F{Math.round(f.fat)} · Fiber {Math.round(f.fiber)}g</div>
                            <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>{f.source === "global" ? "Shared" : "Household"}</div>
                          </button>
                          <button aria-label={`${isFavoriteFood(f) ? "Remove" : "Add"} ${f.name} ${isFavoriteFood(f) ? "from" : "to"} favorites`} onClick={() => toggleFavorite(f)} style={{ width: 42, background: "transparent", border: `1px solid ${BORDER}`, color: isFavoriteFood(f) ? userColor(activeUser) : TEXT_MUTED, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Star style={{ width: 18, height: 18 }} fill={isFavoriteFood(f) ? "currentColor" : "none"} />
                          </button>
                        </div>
                      ))}
                      {visibleLibraryFoods.length === 0 && <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "8px 0" }}>{savedSearch ? "No foods match that search." : foodLibraryTab === "recent" ? "No recent foods yet. Log a saved or shared food and it’ll show up here." : foodLibraryTab === "favorites" ? "No favorites yet. Tap a star beside any food." : "Nothing here yet."}</div>}
                    </div>
                  </>}
                  {showManageSaved && <div style={{ display: "grid", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                    {managedSavedFoods.map((f) => <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottom: `1px solid ${BORDER}`, padding: "8px 0" }}>
                      <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{f.name}</div><div className="num" style={{ fontSize: 11, color: TEXT_MUTED }}>{f.serving_label || "1 serving"} · {Math.round(f.calories)} cal</div></div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button aria-label={`Edit ${f.name}`} onClick={() => editSavedFood(f)} style={{ background: "none", border: "none", color: TEXT_MUTED, padding: 6 }}><Pencil style={{ width: 15, height: 15 }} /></button>
                        <button aria-label={`Delete ${f.name}`} onClick={() => deleteSavedFood(f.id)} style={{ background: "none", border: "none", color: WARN, padding: 6 }}><Trash2 style={{ width: 15, height: 15 }} /></button>
                      </div>
                    </div>)}
                  </div>}
                </div>
              )}

              {selectedSavedFoodId && <>
                <div style={fieldLabel}>Quantity</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input type="number" step="0.25" min="0.25" inputMode="decimal" value={foodQuantity} onChange={(e) => changeQuantity(e.target.value)} style={inputStyle} />
                  <div style={{ display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 8, background: SURFACE_2, color: TEXT_MUTED, fontSize: 13 }}>{foodServingLabel} each</div>
                </div>
              </>}

              <div style={fieldLabel}>Food name</div>
              <input type="text" placeholder="Food name" value={foodName} onChange={(e) => { setFoodName(e.target.value); if (selectedSavedFoodId) setSelectedSavedFoodId(null); }} style={{ ...inputStyle, marginBottom: 10 }} />
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
              {!selectedSavedFoodId && <>
                <div style={fieldLabel}>Serving description</div>
                <input type="text" placeholder="e.g. 1 bar, 2 tbsp, 3/4 cup" value={foodServingLabel} onChange={(e) => setFoodServingLabel(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              </>}
              <div style={fieldLabel}>Notes (optional)</div>
              <input type="text" placeholder="Restaurant, brand, whatever helps" value={foodNotes} onChange={(e) => setFoodNotes(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />

              {!selectedSavedFoodId && !editingSavedId && <label style={{ display: "flex", alignItems: "center", gap: 9, color: TEXT_MUTED, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={saveAsSaved} onChange={(e) => setSaveAsSaved(e.target.checked)} style={{ width: 18, height: 18 }} />
                <BookmarkPlus style={{ width: 15, height: 15 }} /> Save this to household foods
              </label>}

              {foodError && <div style={{ color: WARN, fontSize: 12, marginBottom: 8 }}>{foodError}</div>}
              {editingSavedId ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={clearFoodForm} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
                <button onClick={saveSavedFoodOnly} style={bigButton(userColor(activeUser), userText(activeUser))}>Save changes</button>
              </div> : <button onClick={addFood} disabled={!activeCanEdit} style={bigButton(userColor(activeUser), userText(activeUser))}>{buttonSuccess === "food" ? "✓ Added" : selectedSavedFoodId ? `Log ${foodQuantity || 1} × serving` : "Log food"}</button>}
            </div>

            </>}
            {logTab === "weight" && <>
            <div style={cardStyle}>
              <div style={headingStyle}>Weight</div>
              <div style={fieldLabel}>Weight (lb)</div>
              <input type="number" step="0.1" inputMode="decimal" placeholder="e.g. 182.4" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={fieldLabel}>Date</div>
              <input type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              {weightError && <div style={{ color: WARN, fontSize: 12, marginBottom: 8 }}>{weightError}</div>}
              <button onClick={addWeight} disabled={!activeCanEdit} style={bigButton(userColor(activeUser), userText(activeUser))}>{buttonSuccess === "weight" ? "✓ Logged" : "Log weight"}</button>
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

            </>}
            {logTab === "activity" && <>
            <div style={cardStyle}>
              <div style={headingStyle}>Activity</div>
              <div style={fieldLabel}>Activity</div>
              <input type="text" placeholder="e.g. run, lifting, walk" value={actName} onChange={(e) => setActName(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={fieldLabel}>Calories burned</div>
              <input type="number" inputMode="numeric" value={actCals} onChange={(e) => setActCals(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={fieldLabel}>Date</div>
              <input type="date" value={actDate} onChange={(e) => setActDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={addActivity} disabled={!activeCanEdit} style={bigButton(userColor(activeUser), userText(activeUser))}>{buttonSuccess === "activity" ? "✓ Added" : "Log activity"}</button>
            </div>

            </>}
            {logTab === "water" && <>
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
              <button onClick={() => addWater()} disabled={!activeCanEdit} style={bigButton(userColor(activeUser), userText(activeUser))}>{buttonSuccess === "water" ? "✓ Added" : "Add water"}</button>
            </div>
            </>}
            {logTab === "steps" && <>
            <div style={cardStyle}>
              <div style={headingStyle}>Steps</div>
              <div style={fieldLabel}>Step count</div>
              <input type="number" inputMode="numeric" value={stepsInput} onChange={(e) => setStepsInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={fieldLabel}>Date</div>
              <input type="date" value={stepsDate} onChange={(e) => setStepsDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={saveSteps} disabled={!activeCanEdit} style={bigButton(userColor(activeUser), userText(activeUser))}>{buttonSuccess === "steps" ? "✓ Saved" : "Save steps"}</button>
            </div>

            </>}
          </>
        )}

        {tab === "trends" && (
          <>
            <div style={cardStyle}>
              <div style={headingStyle}>Weight trend</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 10 }}>solid = actual, dashed = 7-day avg</div>
              <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                {profileNames.map((u) => {
                  const info = goalInfo(u);
                  return (
                    <div key={u}>
                      <div style={{ fontSize: 11, color: userColor(u), fontWeight: 700 }}>{u}</div>
                      <div className="num" style={{ fontSize: 16 }}>
                        {info ? `${info.latest} lb` : "—"}
                        {info && info.latest !== info.start && (
                          <span style={{ color: info.latest < info.start ? userColor(u) : WARN, fontSize: 12, marginLeft: 6 }}>
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
                      {profileNames.map((u) => <Line key={u} type="monotone" dataKey={u} name={u} stroke={userColor(u)} strokeWidth={2} dot={{ r: 2.5 }} connectNulls />)}
                      {profileNames.map((u) => <Line key={`${u}-avg`} type="monotone" dataKey={`${u}Avg`} name={`${u} avg`} stroke={userColor(u)} strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />)}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={headingStyle}>Last 14 days</div>
              {profileNames.map((u) => (
                <div key={u} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: u === "Alli" ? 10 : 0 }}>
                  <div style={{ width: 40, fontSize: 11, color: userColor(u), fontWeight: 700 }}>{u}</div>
                  <div style={{ display: "flex", gap: 3, flex: 1 }}>
                    {streaks.days.map((d, i) => (
                      <div key={d} title={`${fmtDate(d)}: ${streaks.result[u][i] ? "logged" : "nothing logged"}`}
                        style={{ flex: 1, height: 18, borderRadius: 3, background: streaks.result[u][i] ? userColor(u) : SURFACE_2, border: `1px solid ${streaks.result[u][i] ? userColor(u) : BORDER}` }} />
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
              <div style={fieldLabel}>Goal date</div>
              <input type="date" value={goalDateInput} onChange={(e) => setGoalDateInput(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={saveGoal} disabled={!activeCanEdit} style={{ ...bigButton(userColor(activeUser), userText(activeUser)), marginBottom: gi ? 16 : 0 }}>Save goal</button>
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
              <button onClick={saveTargets} disabled={!activeCanEdit} style={bigButton(userColor(activeUser), userText(activeUser))}>Save targets</button>
            </div>
          </>
        )}
        {tab === "profile" && (
          <>
            <div style={cardStyle}>
              <div style={headingStyle}>Your profile</div>
              <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 16 }}>This is how your name appears to the people you’re with.</div>
              <div style={fieldLabel}>Profile name</div>
              <input type="text" value={profileNameInput} onChange={(e) => setProfileNameInput(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={saveProfileName} disabled={accountBusy} style={bigButton(USER_COLOR.Shane, USER_TEXT_ON.Shane)}>Save profile</button>
            </div>

            <div style={cardStyle}>
              <div style={headingStyle}>Account</div>
              <div style={fieldLabel}>Email</div>
              <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <button onClick={saveEmail} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, marginBottom: 18 }}>Update email</button>

              <div style={fieldLabel}>New password</div>
              <input type="password" minLength={6} value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={fieldLabel}>Confirm new password</div>
              <input type="password" minLength={6} value={confirmPasswordInput} onChange={(e) => setConfirmPasswordInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <button onClick={savePassword} disabled={accountBusy || !newPasswordInput} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Change password</button>

              {accountError && <div style={{ color: WARN, fontSize: 13, marginTop: 12 }}>{accountError}</div>}
              {accountMessage && <div style={{ color: USER_COLOR.Alli, fontSize: 13, marginTop: 12 }}>{accountMessage}</div>}
            </div>

            <div style={cardStyle}>
              <div style={headingStyle}>Your With</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{householdName}</div>
              <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 12 }}>{profileNames.length} {profileNames.length === 1 ? "person" : "people"} you’re with</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {profileNames.map((name) => <span key={name} style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "6px 9px", fontSize: 12 }}>{name}</span>)}
              </div>
            </div>

            <div style={cardStyle}>
              <button onClick={() => supabase.auth.signOut()} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Sign out</button>
            </div>

            <div style={{ ...cardStyle, borderColor: "#6E3531" }}>
              <div style={{ ...headingStyle, color: WARN }}>Delete account</div>
              <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.45, marginBottom: 12 }}>
                This permanently removes your login, your profile, and your personal health entries. It does not delete other people or their data.
              </div>
              <div style={fieldLabel}>Type DELETE to confirm</div>
              <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              <button onClick={deleteAccount} disabled={accountBusy || deleteConfirm !== "DELETE"} style={{ ...bigButton("#6E3531", "#FFE8E4"), opacity: deleteConfirm === "DELETE" ? 1 : .55 }}>Delete my account</button>
            </div>
          </>
        )}

      </div>

      {toast && (
        <div role="status" aria-live="polite" style={{ position: "fixed", left: "50%", bottom: NAV_H + 18, transform: "translateX(-50%)", zIndex: 30, background: TEXT, color: SURFACE, borderRadius: 999, padding: "10px 15px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 30px rgba(45,35,25,.18)", whiteSpace: "nowrap", maxWidth: "calc(100vw - 32px)", overflow: "hidden", textOverflow: "ellipsis" }}>
          ✓ {toast}
        </div>
      )}

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: SURFACE, borderTop: `1px solid ${BORDER}`,
        paddingBottom: "env(safe-area-inset-bottom)", zIndex: 10,
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", height: NAV_H }}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => id === "log" ? openLog(logTab) : setTab(id)} style={{
                flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3,
                color: active ? userColor(activeUser) : TEXT_MUTED,
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
