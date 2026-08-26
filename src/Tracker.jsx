import { useState, useEffect, useMemo } from "react";
import { Zap, Footprints, Droplet, Home, PlusCircle, TrendingUp, Target, LogOut, Search, BookmarkPlus, Pencil, Trash2, Star, Users, UserCircle, Utensils, Scale, Dumbbell, CheckCircle2, ChevronRight } from "lucide-react";
import { supabase } from "./supabase";
import TodayTab from "./tabs/TodayTab.jsx";
import LogTab from "./tabs/LogTab.jsx";
import TrendsTab from "./tabs/TrendsTab.jsx";

const USERS = ["Alli", "Shane"];
const PROFILE_COLORS = [
  { name: "Terracotta", value: "#D9825B", dim: "#B96E4B", text: "#3C2418" },
  { name: "Lavender", value: "#8F7AAE", dim: "#776590", text: "#2F2639" },
  { name: "Sage", value: "#7E9A7B", dim: "#667E64", text: "#1F2D20" },
  { name: "Dusty blue", value: "#6F8FA8", dim: "#5D788D", text: "#1E2A33" },
  { name: "Ochre", value: "#C4934A", dim: "#A5793C", text: "#332716" },
  { name: "Rose", value: "#B97878", dim: "#996363", text: "#332020" },
  { name: "Teal", value: "#5E918B", dim: "#4D7772", text: "#18302D" },
  { name: "Plum", value: "#8A6680", dim: "#715369", text: "#2E202B" },
];

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
  const [householdRole, setHouseholdRole] = useState(null);
  const [renamingWith, setRenamingWith] = useState(false);
  const [withNameInput, setWithNameInput] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [ownedProfileId, setOwnedProfileId] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [profileColors, setProfileColors] = useState({});
  const [activeFasts, setActiveFasts] = useState({});
  const [fastBusy, setFastBusy] = useState(false);
  const [fastPromptDismissedDate, setFastPromptDismissedDate] = useState(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const [fastEditorOpen, setFastEditorOpen] = useState(false);
  const [fastStartDate, setFastStartDate] = useState(todayStr());
  const [fastStartTime, setFastStartTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  });
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
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalDateInput, setGoalDateInput] = useState("");
  const [tBmr, setTBmr] = useState("");
  const [tCal, setTCal] = useState("");
  const [tProtein, setTProtein] = useState("");
  const [tCarbs, setTCarbs] = useState("");
  const [tFat, setTFat] = useState("");
  const [tFiberMin, setTFiberMin] = useState("");
  const [tFiberMax, setTFiberMax] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_IN" && nextSession?.user) {
        setLoading(true);
        setSaveError(null);
      }
      if (event === "SIGNED_OUT") {
        setHouseholdId(null);
        setHouseholdName("");
        setHouseholdRole(null);
        setInviteCode("");
        setProfiles({});
        setProfileColors({});
        setActiveFasts({});
        setOwnedProfileId(null);
        setNeedsOnboarding(false);
        setLoading(false);
      }
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
        .from("household_members").select("household_id, role").eq("user_id", session.user.id).limit(1);
      if (memberError) throw memberError;
      const hid = memberships?.[0]?.household_id;
      setHouseholdRole(memberships?.[0]?.role || null);
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
      setWithNameInput(householdRow?.name || "Your household");
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
      setProfileColors(Object.fromEntries((profileRows || []).map((p) => [p.name, p.profile_color || null])));
      const owned = (profileRows || []).find((p) => p.user_id === session.user.id);
      setOwnedProfileId(owned?.id || null);
      if (owned) {
        setProfileNameInput(owned.name || "");
        setFastPromptDismissedDate(owned.fasting_prompt_dismissed_date || null);
      }
      setEmailInput(session.user.email || "");
      if (owned) setActiveUser(owned.name);
      else if (!pmap[activeUser] && Object.keys(pmap).length) setActiveUser(Object.keys(pmap)[0]);
      const profileIds = Object.values(pmap).map((p) => p.id);
      if (!profileIds.length) throw new Error("No health profiles exist for this household.");

      const [weightsRes, foodsRes, activitiesRes, stepsRes, waterRes, savedFoodsRes, globalFoodsRes, foodStatesRes, fastsRes] = await Promise.all([
        supabase.from("weight_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("food_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("activity_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("step_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("water_entries").select("*").eq("household_id", hid).order("entry_date"),
        supabase.from("saved_foods").select("*").eq("household_id", hid).order("name"),
        supabase.from("global_foods").select("*").order("name"),
        supabase.from("household_food_state").select("*").eq("household_id", hid),
        supabase.from("fasting_entries").select("*").in("profile_id", profileIds).is("ended_at", null),
      ]);
      for (const r of [weightsRes, foodsRes, activitiesRes, stepsRes, waterRes, savedFoodsRes, globalFoodsRes, foodStatesRes, fastsRes]) if (r.error) throw r.error;
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
      const fastMap = {};
      (fastsRes?.data || []).forEach((f) => {
        const name = Object.keys(pmap).find((n) => pmap[n].id === f.profile_id);
        if (name) fastMap[name] = f;
      });
      setActiveFasts(fastMap);
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

  async function saveProfileColor(color) {
    if (!ownedProfileId) return;
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const { error } = await supabase.from("profiles").update({ profile_color: color }).eq("id", ownedProfileId);
    if (error) setAccountError(error.message);
    else {
      setProfileColors((prev) => ({ ...prev, [profileNameInput || activeUser]: color }));
      setAccountMessage("Your color is updated.");
      await loadAll();
    }
    setAccountBusy(false);
  }

  const fastPromptDismissedToday = fastPromptDismissedDate === todayStr();

  async function dismissFastPromptToday() {
    if (!ownedProfileId) return;
    const date = todayStr();
    setFastPromptDismissedDate(date);
    const { error } = await supabase
      .from("profiles")
      .update({ fasting_prompt_dismissed_date: date })
      .eq("id", ownedProfileId);
    if (error) {
      setSaveError(`Could not dismiss fasting prompt: ${error.message}`);
      setFastPromptDismissedDate(null);
    }
  }

  function openFastEditor(existing = null) {
    const d = existing?.started_at ? new Date(existing.started_at) : new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const localTime = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    setFastStartDate(localDate);
    setFastStartTime(localTime);
    setFastEditorOpen(true);
  }

  async function startFast() {
    if (!activeCanEdit || fastBusy) {
      setSaveError(`Fasting unavailable: activeCanEdit=${activeCanEdit}, fastBusy=${fastBusy}`);
      return;
    }
    const p = profileFor(activeUser);
    if (!p) { setSaveError("Your profile could not be found."); return; }

    const started = new Date(`${fastStartDate}T${fastStartTime}:00`);
    if (Number.isNaN(started.getTime())) { setSaveError("Choose a valid start date and time."); return; }
    if (started.getTime() > Date.now()) { setSaveError("A fast can’t start in the future."); return; }

    setFastBusy(true); setSaveError(null);
    const { data: created, error } = await supabase
      .from("fasting_entries")
      .insert({
        household_id: householdId,
        profile_id: p.id,
        started_at: started.toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      setSaveError(`Could not start fast: ${error.message}`);
    } else {
      setActiveFasts((prev) => ({ ...prev, [activeUser]: created }));
      setFastEditorOpen(false);
      setClockNow(Date.now());
      showSuccess("Fast started", "fast");
    }
    setFastBusy(false);
  }

  async function updateFastStart() {
    if (!activeCanEdit || fastBusy) return;
    const fast = activeFasts[activeUser];
    if (!fast) { setSaveError("No active fast was found."); return; }

    const started = new Date(`${fastStartDate}T${fastStartTime}:00`);
    if (Number.isNaN(started.getTime())) { setSaveError("Choose a valid start date and time."); return; }
    if (started.getTime() > Date.now()) { setSaveError("A fast can’t start in the future."); return; }

    setFastBusy(true); setSaveError(null);
    const { data: updated, error } = await supabase
      .from("fasting_entries")
      .update({ started_at: started.toISOString() })
      .eq("id", fast.id)
      .select("*")
      .single();

    if (error) {
      setSaveError(`Could not update fast: ${error.message}`);
    } else {
      setActiveFasts((prev) => ({ ...prev, [activeUser]: updated }));
      setFastEditorOpen(false);
      setClockNow(Date.now());
      showSuccess("Fast start updated", "fast");
    }
    setFastBusy(false);
  }

  async function endFast() {
    if (!activeCanEdit || fastBusy) return;
    const fast = activeFasts[activeUser];
    if (!fast) { setSaveError("No active fast was found."); return; }

    setFastBusy(true); setSaveError(null);
    const { error } = await supabase
      .from("fasting_entries")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", fast.id);

    if (error) {
      setSaveError(`Could not end fast: ${error.message}`);
    } else {
      setActiveFasts((prev) => {
        const next = { ...prev };
        delete next[activeUser];
        return next;
      });
      setFastEditorOpen(false);
      showSuccess("Fast ended", "fast");
    }
    setFastBusy(false);
  }

  function fastElapsed(startedAt) {
    const ms = Math.max(0, clockNow - new Date(startedAt).getTime());
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  async function renameWith() {
    const nextName = withNameInput.trim();
    if (!nextName) { setAccountError("Your With needs a name."); return; }
    if (nextName.length > 40) { setAccountError("Keep your With name to 40 characters or fewer."); return; }
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const { error } = await supabase.rpc("rename_household", { new_name: nextName });
    if (error) setAccountError(error.message);
    else {
      setHouseholdName(nextName);
      setRenamingWith(false);
      setAccountMessage("Your With has been renamed.");
    }
    setAccountBusy(false);
  }

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

  function profileColor(name, dim=false) {
    const chosen = profileColors[name];
    if (chosen) {
      const match = PROFILE_COLORS.find((c) => c.value === chosen);
      if (match) return dim ? match.dim : match.value;
      return chosen;
    }
    return userColor(name, dim);
  }
  function profileText(name) {
    const chosen = profileColors[name];
    const match = PROFILE_COLORS.find((c) => c.value === chosen);
    return match?.text || userText(name);
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

  function openGoalsEdit() {
    setEditingGoals(true);
    setTab("goals");
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
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0.8rem 1rem 0.7rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 9 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, lineHeight: 1 }}>WITH</div>
              <div title={householdName} style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{householdName}</div>
            </div>
            <button title="Sign out" onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", color: TEXT_MUTED, padding: 5, display: "grid", placeItems: "center", flexShrink: 0 }}><LogOut style={{ width: 18, height: 18 }} /></button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", marginBottom: 8, paddingBottom: 1, WebkitOverflowScrolling: "touch" }}>
            {profileNames.map((u) => (
              <button
                key={u}
                title={u}
                onClick={() => { setActiveUser(u); setFastEditorOpen(false); }}
                style={{
                  flex: "0 1 auto",
                  minWidth: 0,
                  maxWidth: profileNames.length <= 2 ? "48%" : 160,
                  border: "none",
                  borderBottom: activeUser === u ? `2px solid ${profileColor(u)}` : "2px solid transparent",
                  background: "transparent",
                  color: activeUser === u ? TEXT : TEXT_MUTED,
                  padding: "5px 4px 6px",
                  fontFamily: "'Fraunces', serif",
                  fontStyle: "italic",
                  fontWeight: activeUser === u ? 700 : 500,
                  fontSize: 13,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 11, color: TEXT_MUTED, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeGoalDate ? `${weeksLeft} ${weeksLeft === 1 ? "week" : "weeks"} until ${fmtGoalDate(activeGoalDate)}` : "No goal date set"}
            </div>
            {inviteCode && <button onClick={() => navigator.clipboard?.writeText(inviteCode)} title={`Invite code: ${inviteCode}. Tap to copy.`} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 11, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}><Users style={{ width: 13, height: 13 }} /> Invite</button>}
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
          <TodayTab
            activeUser={activeUser}
            activeCanEdit={activeCanEdit}
            data={data}
            profileNames={profileNames}
            today={today}
            todayStats={todayStats}
            activeFasts={activeFasts}
            fastPromptDismissedToday={fastPromptDismissedToday}
            fastEditorOpen={fastEditorOpen}
            fastBusy={fastBusy}
            fastStartDate={fastStartDate}
            fastStartTime={fastStartTime}
            setFastStartDate={setFastStartDate}
            setFastStartTime={setFastStartTime}
            setFastEditorOpen={setFastEditorOpen}
            dismissFastPromptToday={dismissFastPromptToday}
            openFastEditor={openFastEditor}
            startFast={startFast}
            updateFastStart={updateFastStart}
            endFast={endFast}
            fastElapsed={fastElapsed}
            openLog={openLog}
            setActiveUser={setActiveUser}
            profileColor={profileColor}
            profileText={profileText}
            styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton }}
          />
        )}

        {tab === "log" && (
          <LogTab
            activeUser={activeUser}
            activeCanEdit={activeCanEdit}
            data={data}
            today={today}
            ts={ts}
            logTab={logTab}
            setLogTab={setLogTab}
            buttonSuccess={buttonSuccess}
            activeFasts={activeFasts}
            fastPromptDismissedToday={fastPromptDismissedToday}
            fastEditorOpen={fastEditorOpen}
            fastBusy={fastBusy}
            fastStartDate={fastStartDate}
            fastStartTime={fastStartTime}
            setFastStartDate={setFastStartDate}
            setFastStartTime={setFastStartTime}
            setFastEditorOpen={setFastEditorOpen}
            dismissFastPromptToday={dismissFastPromptToday}
            openFastEditor={openFastEditor}
            startFast={startFast}
            updateFastStart={updateFastStart}
            fastElapsed={fastElapsed}
            savedFoods={savedFoods}
            globalFoods={globalFoods}
            savedSearch={savedSearch}
            setSavedSearch={setSavedSearch}
            selectedSavedFoodId={selectedSavedFoodId}
            setSelectedSavedFoodId={setSelectedSavedFoodId}
            foodQuantity={foodQuantity}
            foodServingLabel={foodServingLabel}
            saveAsSaved={saveAsSaved}
            setSaveAsSaved={setSaveAsSaved}
            editingSavedId={editingSavedId}
            showManageSaved={showManageSaved}
            setShowManageSaved={setShowManageSaved}
            foodLibraryTab={foodLibraryTab}
            setFoodLibraryTab={setFoodLibraryTab}
            visibleLibraryFoods={visibleLibraryFoods}
            managedSavedFoods={managedSavedFoods}
            chooseSavedFood={chooseSavedFood}
            isFavoriteFood={isFavoriteFood}
            toggleFavorite={toggleFavorite}
            editSavedFood={editSavedFood}
            deleteSavedFood={deleteSavedFood}
            changeQuantity={changeQuantity}
            clearFoodForm={clearFoodForm}
            saveSavedFoodOnly={saveSavedFoodOnly}
            foodName={foodName}
            setFoodName={setFoodName}
            foodMeal={foodMeal}
            setFoodMeal={setFoodMeal}
            foodDate={foodDate}
            setFoodDate={setFoodDate}
            foodCals={foodCals}
            setFoodCals={setFoodCals}
            foodProtein={foodProtein}
            setFoodProtein={setFoodProtein}
            foodCarbs={foodCarbs}
            setFoodCarbs={setFoodCarbs}
            foodFat={foodFat}
            setFoodFat={setFoodFat}
            foodFiber={foodFiber}
            setFoodFiber={setFoodFiber}
            foodNotes={foodNotes}
            setFoodNotes={setFoodNotes}
            setFoodServingLabel={setFoodServingLabel}
            foodError={foodError}
            addFood={addFood}
            weightInput={weightInput}
            setWeightInput={setWeightInput}
            weightDate={weightDate}
            setWeightDate={setWeightDate}
            weightError={weightError}
            addWeight={addWeight}
            deleteWeight={deleteWeight}
            actName={actName}
            setActName={setActName}
            actCals={actCals}
            setActCals={setActCals}
            actDate={actDate}
            setActDate={setActDate}
            addActivity={addActivity}
            waterOz={waterOz}
            setWaterOz={setWaterOz}
            waterDate={waterDate}
            setWaterDate={setWaterDate}
            addWater={addWater}
            stepsInput={stepsInput}
            setStepsInput={setStepsInput}
            stepsDate={stepsDate}
            setStepsDate={setStepsDate}
            saveSteps={saveSteps}
            profileColor={profileColor}
            profileText={profileText}
            styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton }}
          />
        )}

        {tab === "trends" && (
          <TrendsTab
            profileNames={profileNames}
            chartData={chartData}
            streaks={streaks}
            goalInfo={goalInfo}
            profileColor={profileColor}
            fmtDate={fmtDate}
            styles={{ SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, cardStyle, headingStyle }}
          />
        )}

        {tab === "goals" && (
          <>
            <div style={{ padding: "0.25rem 0.1rem 0.9rem" }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, lineHeight: 1.05 }}>Goals</div>
              <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>What you’re working toward.</div>
            </div>

            {(!data[activeUser].goalWeight && !data[activeUser].goalDate && !data[activeUser].targets.calories) ? (
              <div style={{ ...cardStyle, background: "#FFF8EE", borderColor: "#E6D6C1" }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, marginBottom: 6 }}>What are you working toward?</div>
                <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>Set a goal and daily targets when you’re ready. They’re yours, and you can change them anytime.</div>
                {activeCanEdit && <button onClick={() => setEditingGoals(true)} style={{ ...bigButton(profileColor(activeUser), profileText(activeUser)), width: "auto", paddingInline: 18 }}>Set your goals</button>}
              </div>
            ) : !editingGoals ? (
              <>
                <div style={cardStyle}>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Your goal</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600 }}>
                      {gi ? `${gi.latest} → ${gi.goal ?? "—"} lb` : `${data[activeUser].goalWeight ?? "—"} lb`}
                    </div>
                    {data[activeUser].goalDate && <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{fmtGoalDate(data[activeUser].goalDate)}</div>}
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
                    {activeCanEdit && <button onClick={() => setEditingGoals(true)} style={{ background: "none", border: "none", color: profileColor(activeUser, true), fontWeight: 700, fontSize: 12 }}>Edit</button>}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: TEXT_MUTED }}>Calories</span><strong>{data[activeUser].targets.calories || "—"}</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: TEXT_MUTED }}>Protein</span><strong>{data[activeUser].targets.protein || "—"}g</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: TEXT_MUTED }}>Carbs</span><strong>{data[activeUser].targets.carbs || "—"}g</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: TEXT_MUTED }}>Fat</span><strong>{data[activeUser].targets.fat || "—"}g</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: TEXT_MUTED }}>Fiber</span><strong>{data[activeUser].targets.fiberMin || "—"}–{data[activeUser].targets.fiberMax || "—"}g</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: TEXT_MUTED }}>BMR</span><strong>{data[activeUser].targets.bmr || "—"}</strong></div>
                  </div>
                  {activeCanEdit && <button onClick={() => setEditingGoals(true)} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, marginTop: 16 }}>Edit goals & targets</button>}
                </div>
              </>
            ) : (
              <>
                <div style={cardStyle}>
                  <div style={headingStyle}>Edit goals & targets</div>
                  <div style={fieldLabel}>Goal weight (lb)</div>
                  <input type="number" step="0.1" inputMode="decimal" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
                  <div style={fieldLabel}>Goal date</div>
                  <input type="date" value={goalDateInput} onChange={(e) => setGoalDateInput(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />

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

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button onClick={() => setEditingGoals(false)} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
                    <button onClick={async () => { await saveGoal(); await saveTargets(); setEditingGoals(false); }} disabled={!activeCanEdit} style={bigButton(profileColor(activeUser), profileText(activeUser))}>Save changes</button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === "profile" && (
          <>
            <div style={{ padding: "0.25rem 0.1rem 0.9rem" }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, lineHeight: 1.05 }}>Profile</div>
              <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Your account, your goals, your people.</div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, marginBottom: 4 }}>{profileNameInput || activeUser}</div>
              <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{session?.user?.email}</div>
              <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 2 }}>{householdName}</div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 3 }}>Health goals & targets</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 12 }}>
                    {data[activeUser]?.goalWeight ? `${data[activeUser].goalWeight} lb${data[activeUser].goalDate ? ` by ${fmtGoalDate(data[activeUser].goalDate)}` : ""}` : "Not set yet"}
                  </div>
                </div>
                <button onClick={openGoalsEdit} style={{ background: "none", border: "none", color: profileColor(activeUser, true), display: "flex", alignItems: "center", gap: 3, fontWeight: 700, fontSize: 12 }}>Manage <ChevronRight style={{ width: 14, height: 14 }} /></button>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={headingStyle}>Your profile</div>
              <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 16 }}>This is how your name appears to the people you’re with.</div>
              <div style={fieldLabel}>Profile name</div>
              <input type="text" value={profileNameInput} onChange={(e) => setProfileNameInput(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} />
              <div style={fieldLabel}>Your color</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                {PROFILE_COLORS.map((c) => {
                  const selected = (profileColors[profileNameInput || activeUser] || profileColor(profileNameInput || activeUser)) === c.value;
                  return <button key={c.value} type="button" title={c.name} aria-label={`Choose ${c.name}`} onClick={() => saveProfileColor(c.value)} style={{ width: 36, height: 36, borderRadius: "50%", background: c.value, border: selected ? `3px solid ${TEXT}` : `2px solid ${SURFACE}`, boxShadow: selected ? `0 0 0 2px ${BORDER}` : `0 0 0 1px ${BORDER}`, padding: 0 }} />;
                })}
              </div>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ ...headingStyle, marginBottom: 0 }}>Your With</div>
                {householdRole === "owner" && !renamingWith && <button onClick={() => { setWithNameInput(householdName); setRenamingWith(true); setAccountError(""); }} style={{ background: "none", border: "none", color: profileColor(activeUser, true), fontSize: 12, fontWeight: 700 }}>Rename</button>}
              </div>

              {renamingWith ? (
                <div style={{ marginTop: 12, marginBottom: 12 }}>
                  <div style={fieldLabel}>With name</div>
                  <input type="text" maxLength={40} value={withNameInput} onChange={(e) => setWithNameInput(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button onClick={() => { setRenamingWith(false); setWithNameInput(householdName); }} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
                    <button onClick={renameWith} disabled={accountBusy} style={bigButton(profileColor(activeUser), profileText(activeUser))}>{accountBusy ? "Saving…" : "Save name"}</button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8, marginBottom: 4 }}>{householdName}</div>
              )}

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
                color: active ? profileColor(activeUser) : TEXT_MUTED,
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
