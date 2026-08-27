import { useState, useEffect, useMemo } from "react";
import { Zap, Footprints, Droplet, Home, PlusCircle, TrendingUp, Target, Search, BookmarkPlus, Pencil, Trash2, Star, UserCircle, Utensils, Scale, Dumbbell, CheckCircle2, ChevronRight } from "lucide-react";
import { supabase } from "./supabase";
import TodayTab from "./tabs/TodayTab.jsx";
import LogTab from "./tabs/LogTab.jsx";
import TrendsTab from "./tabs/TrendsTab.jsx";
import GoalsTab from "./tabs/GoalsTab.jsx";
import ProfileTab from "./tabs/ProfileTab.jsx";
import { BrandLogo, BrandLoading, brand } from "./brand.jsx";

const USERS = ["Alli", "Shane"];
const PROFILE_COLORS = [
  { name: "Orange", value: "#F06A24", dim: "#C94F12", text: "#FFFFFF" },
  { name: "Violet", value: "#7047EB", dim: "#5631C8", text: "#FFFFFF" },
  { name: "Deep Blue", value: "#4C6EF5", dim: "#3553D8", text: "#FFFFFF" },
  { name: "Coral", value: "#E7685B", dim: "#C94E44", text: "#FFFFFF" },
  { name: "Amber", value: "#D99524", dim: "#B87812", text: "#111111" },
  { name: "Rose", value: "#D95B83", dim: "#BA4068", text: "#FFFFFF" },
  { name: "Indigo", value: "#4658C9", dim: "#3545A8", text: "#FFFFFF" },
  { name: "Lilac", value: "#9B88D8", dim: "#806CC0", text: "#FFFFFF" },
];

const USER_COLOR = { Shane: "#F06A24", Alli: "#7047EB" };
const USER_COLOR_DIM = { Shane: "#C94F12", Alli: "#5631C8" };
const USER_TEXT_ON = { Shane: "#FFFFFF", Alli: "#FFFFFF" };
function userColor(name, dim=false) {
  if (USER_COLOR[name]) return dim ? USER_COLOR_DIM[name] : USER_COLOR[name];
  const palette = dim ? ["#6FA39A","#A1845C","#7F88B8","#A46E83"] : ["#9ED8CE","#D8B77E","#AEB7EA","#D69AAF"];
  let n = 0; for (const c of String(name)) n = (n + c.charCodeAt(0)) % palette.length;
  return palette[n];
}
function userText(name) { return USER_TEXT_ON[name] || "#162321"; }

const BG = brand.bg;
const SURFACE = brand.surface;
const SURFACE_2 = brand.surfaceSoft;
const BORDER = brand.border;
const TEXT = brand.text;
const TEXT_MUTED = brand.textMuted;
const WARN = brand.warn;
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
  borderRadius: 8, padding: "12px 14px", fontSize: 16, width: "100%",
  boxShadow: "0 1px 0 rgba(45,35,25,.03)",
};
const cardStyle = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "1.25rem", marginBottom: "1rem", boxShadow: "0 2px 8px rgba(28,36,48,.045)" };
const headingStyle = { fontFamily: "'Newsreader', Georgia, serif", fontWeight: 600, fontSize: 21, letterSpacing: "-0.015em", lineHeight: 1.08, marginBottom: "0.9rem" };
const fieldLabel = { fontSize: 12, color: TEXT_MUTED, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" };
const bigButton = (color, textColor) => ({
  background: color, color: textColor, border: "none", borderRadius: 8,
  padding: "13px 18px", fontWeight: 800, fontSize: 15, width: "100%",
  fontFamily: "'DM Sans', -apple-system, sans-serif", letterSpacing: "-0.01em",
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

function AuthScreen({ initialMessage = "" }) {
  const params = new URLSearchParams(window.location.search);
  const inviteFromUrl = params.get("invite")?.trim().toUpperCase() || "";
  const inviterFromUrl = params.get("inviter")?.trim() || "";
  const [mode, setMode] = useState(inviteFromUrl ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (inviteFromUrl) localStorage.setItem("with-pending-invite", inviteFromUrl);
    if (inviterFromUrl) localStorage.setItem("with-pending-inviter", inviterFromUrl);
  }, [inviteFromUrl, inviterFromUrl]);

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
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authError) setError(authError.message);
      else if (!data.session) setMessage("Check your email to confirm your account, then come back and sign in.");
      else setMessage("Account created. Setting up your group…");
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, display: "grid", placeItems: "center", padding: 20, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,500;6..72,600;6..72,700&display=swap'); * { box-sizing: border-box; } body { margin: 0; } input, button { font-family: inherit; }`}</style>
      <form onSubmit={submit} style={{ ...cardStyle, width: "100%", maxWidth: 420, marginBottom: 0 }}>
        <BrandLogo style={{ marginBottom: 10 }} />
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 22, fontWeight: 600, lineHeight: 1.1, marginBottom: 8 }}>We’re in this together.</div>
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

        <button disabled={busy} style={{ ...bigButton(brand.teal, brand.inkOn), opacity: busy ? 0.65 : 1 }}>
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
    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }

    sessionStorage.removeItem("with-password-recovery");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError("Your password was changed, but we couldn't sign you out. Please close this window and sign in again.");
      setBusy(false);
      return;
    }

    onDone();
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, display: "grid", placeItems: "center", padding: 20, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <form onSubmit={updatePassword} style={{ ...cardStyle, width: "100%", maxWidth: 420, marginBottom: 0 }}>
        <BrandLogo style={{ marginBottom: 12 }} />
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 24, fontWeight: 600, lineHeight: 1.1, marginBottom: 20 }}>Choose a new password.</div>
        <div style={fieldLabel}>New password</div>
        <input type="password" minLength={6} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
        <div style={fieldLabel}>Confirm password</div>
        <input type="password" minLength={6} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
        {error && <div style={{ color: WARN, fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button disabled={busy} style={{ ...bigButton(brand.teal, brand.inkOn), opacity: busy ? .65 : 1 }}>{busy ? "Saving…" : "Save new password"}</button>
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
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, display: "grid", placeItems: "center", padding: 20, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ ...cardStyle, width: "100%", maxWidth: 440, marginBottom: 0 }}>
        <BrandLogo style={{ marginBottom: 12 }} />
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 600, fontSize: 28, lineHeight: 1.05, marginBottom: 8 }}>Welcome to With</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 22 }}>Who are you with?</div>
        {!mode ? <>
          <button onClick={() => setMode("create")} style={{ ...bigButton(brand.teal, brand.inkOn), marginBottom: 10 }}>Start a group</button>
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
            <button disabled={busy} style={{ ...bigButton(brand.teal, brand.inkOn), opacity: busy ? .65 : 1, marginBottom: 10 }}>{busy ? "Working…" : mode === "create" ? "Start group" : "Join group"}</button>
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
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, display: "grid", placeItems: "center", padding: 20, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ ...cardStyle, width: "100%", maxWidth: 440, marginBottom: 0 }}>
        <BrandLogo style={{ marginBottom: 10 }} />
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 21, fontWeight: 600, lineHeight: 1.1, marginBottom: 16 }}>We’re in this together.</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 18 }}>Which profile is yours?</div>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
          <option value="">Choose your profile</option>
          {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {error && <div style={{ color: WARN, fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button disabled={!selected || busy} onClick={claim} style={{ ...bigButton(brand.teal, brand.inkOn), opacity: !selected || busy ? .6 : 1 }}>{busy ? "Connecting…" : "This is me"}</button>
      </div>
    </div>
  );
}

export default function Tracker() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(() => sessionStorage.getItem("with-password-recovery") === "1");
  const [authNotice, setAuthNotice] = useState("");
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [ownedProfileId, setOwnedProfileId] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [profileColors, setProfileColors] = useState({});
  const [intentions, setIntentions] = useState({});
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
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authError = searchParams.get("error_description") || hashParams.get("error_description");
    if (authError) {
      setAuthNotice("That password reset link is invalid or has expired. Request a new one.");
    }

    if (sessionStorage.getItem("with-password-recovery") === "1") {
      setPasswordRecovery(true);
    }

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
        sessionStorage.removeItem("with-password-recovery");
        setPasswordRecovery(false);
        setHouseholdId(null);
        setHouseholdName("");
        setHouseholdRole(null);
        setInviteCode("");
        setProfiles({});
        setProfileColors({});
        setIntentions({});
        setActiveFasts({});
        setOwnedProfileId(null);
        setNeedsOnboarding(false);
        setLoading(false);
      }
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem("with-password-recovery", "1");
        setPasswordRecovery(true);
        setAuthNotice("");
      }
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
      setIntentions(Object.fromEntries((profileRows || []).map((p) => [p.name, p.intention_date === todayStr() ? (p.current_intention || "") : ""])));
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

  async function saveIntention(text) {
    if (!activeCanEdit) {
      setSaveError("Only the owner of this profile can edit its intention.");
      return false;
    }
    const p = profileFor(activeUser);
    if (!p) return false;
    const next = String(text || "").trim().slice(0, 280);
    setSaveError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ current_intention: next || null, intention_date: todayStr() })
      .eq("id", p.id);
    if (error) {
      setSaveError(`Could not save intention: ${error.message}`);
      return false;
    }
    setIntentions((prev) => ({ ...prev, [activeUser]: next }));
    showSuccess(next ? "Intention saved" : "Intention cleared", "intention");
    return true;
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
    const nextName = profileNameInput.trim();
    if (!ownedProfileId || !nextName) { setAccountError("Your profile needs a name."); return; }
    if (nextName.length > 40) { setAccountError("Keep your profile name to 40 characters or fewer."); return; }
    const currentName = Object.values(profiles).find((p) => p.id === ownedProfileId)?.name || activeUser;
    const duplicate = Object.values(profiles).some((p) =>
      p.id !== ownedProfileId && String(p.name || "").trim().toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) { setAccountError("Someone in this With already uses that name."); return; }
    if (nextName === currentName) { setAccountError(""); setAccountMessage("Your profile name is already up to date."); return; }
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const { error } = await supabase.from("profiles").update({ name: nextName }).eq("id", ownedProfileId);
    if (error) setAccountError(error.message);
    else { setAccountMessage("Profile name updated."); await loadAll(); }
    setAccountBusy(false);
  }

  async function saveEmail() {
    const nextEmail = emailInput.trim();
    if (!nextEmail) { setAccountError("Enter an email address."); return; }
    if (nextEmail.toLowerCase() === String(session?.user?.email || "").toLowerCase()) {
      setAccountError("");
      setAccountMessage("That’s already your account email.");
      return;
    }
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const { error } = await supabase.auth.updateUser(
      { email: nextEmail },
      { emailRedirectTo: window.location.origin }
    );
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

  function inviteUrl() {
    const url = new URL(window.location.origin);
    const inviterName = Object.values(profiles).find((p) => p.user_id === session?.user?.id)?.name || profileNameInput || activeUser;
    url.searchParams.set("invite", inviteCode);
    if (inviterName) url.searchParams.set("inviter", inviterName);
    return url.toString();
  }

  async function sendInviteEmail() {
    const email = inviteEmail.trim();
    setInviteError(""); setInviteMessage("");
    if (!email) { setInviteError("Enter an email address."); return; }
    if (!inviteCode) { setInviteError("Invite code isn’t available yet. Refresh and try again."); return; }

    setInviteBusy(true);
    const { error } = await supabase.functions.invoke("send-with-invite", {
      body: { email, inviteCode, inviteUrl: inviteUrl() },
    });
    if (error) {
      setInviteError(error.message || "The invite email could not be sent.");
    } else {
      setInviteMessage(`Invite sent to ${email}.`);
      setInviteEmail("");
      showSuccess("Invite sent");
    }
    setInviteBusy(false);
  }

  async function shareInvite() {
    if (!inviteCode) { setInviteError("Invite code isn’t available yet. Refresh and try again."); return; }
    const url = inviteUrl();
    const shareData = {
      title: `Join ${householdName} on With`,
      text: `Join my With, ${householdName}. Your health stays yours; we’ll just be doing life With each other.`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setInviteMessage("Invite link copied.");
        showSuccess("Invite link copied");
      }
    } catch (error) {
      if (error?.name !== "AbortError") setInviteError("Couldn’t share the invite. Copy the invite code instead.");
    }
  }

  async function copyInviteCode() {
    if (!inviteCode) { setAccountError("Invite code isn’t available yet. Refresh and try again."); return; }
    try {
      await navigator.clipboard.writeText(inviteUrl());
      setAccountError("");
      setAccountMessage("Invite link copied.");
      showSuccess("Invite link copied");
    } catch {
      setAccountError(`Invite code: ${inviteCode}. Copy it manually if needed.`);
    }
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

  function openLog(kind = logTab, date = todayStr()) {
    setLogTab(kind);
    localStorage.setItem("with-log-tab", kind);
    if (kind === "food") setFoodDate(date);
    if (kind === "weight") setWeightDate(date);
    if (kind === "activity") setActDate(date);
    if (kind === "water") setWaterDate(date);
    if (kind === "steps") setStepsDate(date);
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
    const start = w[0].weight;
    const latest = w[w.length - 1].weight;
    const goal = data[u].goalWeight;

    if (goal == null || goal === start) {
      return {
        start,
        latest,
        goal,
        plannedChange: goal == null ? null : 0,
        progressAmount: 0,
        progressPct: goal == null ? null : 100,
        remaining: goal == null ? null : 0,
      };
    }

    const direction = Math.sign(goal - start);
    const plannedChange = Math.abs(goal - start);
    const directionalProgress = (latest - start) * direction;
    const progressAmount = Math.max(0, Math.min(plannedChange, directionalProgress));
    const progressPct = plannedChange ? (progressAmount / plannedChange) * 100 : 100;
    const remaining = Math.max(0, plannedChange - progressAmount);

    return { start, latest, goal, plannedChange, progressAmount, progressPct, remaining };
  }

  if (!authReady) {
    return <BrandLoading>Checking your session…</BrandLoading>;
  }
  if (passwordRecovery && session) return <ResetPasswordScreen onDone={() => { setPasswordRecovery(false); setAuthNotice("Password updated. Sign in with your new password."); }} />;
  if (!session) return <AuthScreen initialMessage={authNotice} />;
  if (needsOnboarding) return <Onboarding onComplete={loadAll} />;
  if (!loading && session && !ownedProfileId && Object.values(profiles).some((p) => !p.user_id)) return <ClaimProfile profiles={profiles} onClaim={loadAll} />;
  if (loading) {
    return <BrandLoading>Getting your With ready…</BrandLoading>;
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
    <div style={{ background: BG, color: TEXT, minHeight: "100vh", fontFamily: "'DM Sans', -apple-system, sans-serif", boxSizing: "border-box" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,500;6..72,600;6..72,700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; }
        input, select, textarea, button { font-family: inherit; }
        .num { font-family: 'DM Sans', -apple-system, sans-serif; font-variant-numeric: tabular-nums; }
        button { cursor: pointer; -webkit-appearance: none; }
        ::placeholder { color: #5A5E60; }
        textarea { resize: vertical; }
      `}</style>

      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(255,251,245,.97)", borderBottom: `1px solid ${BORDER}`, paddingTop: "env(safe-area-inset-top)", backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0.65rem 1rem 0.6rem", display: "grid", gridTemplateColumns: "auto auto", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <BrandLogo compact style={{ width: 110, flexShrink: 0 }} />
          <div style={{ minWidth: 0, width: "fit-content", maxWidth: "100%", justifySelf: "end", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "8px 10px 9px", boxShadow: "0 2px 8px rgba(17,17,17,.035)" }}>
            <div title={householdName} style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, letterSpacing: ".055em", textTransform: "uppercase", textAlign: "right", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {householdName}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5, overflowX: "auto", paddingBottom: 1, WebkitOverflowScrolling: "touch" }}>
              {profileNames.map((u) => (
                <button
                  key={u}
                  title={u}
                  onClick={() => { setActiveUser(u); setFastEditorOpen(false); if (tab === "profile") setTab("today"); }}
                  style={{
                    flexShrink: 0,
                    border: activeUser === u ? `1px solid ${profileColor(u)}` : `1px solid ${BORDER}`,
                    background: activeUser === u ? brand.surfaceSoft : "transparent",
                    color: activeUser === u ? TEXT : TEXT_MUTED,
                    borderRadius: 999,
                    padding: "5px 9px",
                    fontFamily: "'DM Sans', -apple-system, sans-serif",
                    fontWeight: activeUser === u ? 700 : 500,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span aria-hidden="true" style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: profileColor(u), marginRight: 5 }} />
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "1rem 1rem", paddingBottom: NAV_H + 32 }}>
        {saveError && (
          <div style={{ background: "#FFF1F0", border: `1px solid ${WARN}`, color: WARN, padding: "10px 14px", borderRadius: 10, marginBottom: "1rem", fontSize: 13 }}>{saveError}</div>
        )}
        {tab !== "profile" && !activeCanEdit && (
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
            deleteFood={deleteFood}
            setActiveUser={setActiveUser}
            profileColor={profileColor}
            profileText={profileText}
            intentions={intentions}
            saveIntention={saveIntention}
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
          <GoalsTab
            activeUser={activeUser}
            activeCanEdit={activeCanEdit}
            data={data}
            gi={gi}
            editingGoals={editingGoals}
            setEditingGoals={setEditingGoals}
            goalInput={goalInput}
            setGoalInput={setGoalInput}
            goalDateInput={goalDateInput}
            setGoalDateInput={setGoalDateInput}
            tBmr={tBmr}
            setTBmr={setTBmr}
            tCal={tCal}
            setTCal={setTCal}
            tProtein={tProtein}
            setTProtein={setTProtein}
            tCarbs={tCarbs}
            setTCarbs={setTCarbs}
            tFat={tFat}
            setTFat={setTFat}
            tFiberMin={tFiberMin}
            setTFiberMin={setTFiberMin}
            tFiberMax={tFiberMax}
            setTFiberMax={setTFiberMax}
            saveGoal={saveGoal}
            saveTargets={saveTargets}
            profileColor={profileColor}
            profileText={profileText}
            fmtGoalDate={fmtGoalDate}
            styles={{ SURFACE_2, BORDER, TEXT, TEXT_MUTED, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton }}
          />
        )}

        {tab === "profile" && (
          <ProfileTab
            activeUser={activeUser}
            data={data}
            session={session}
            householdName={householdName}
            householdRole={householdRole}
            inviteCode={inviteCode}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            inviteBusy={inviteBusy}
            inviteMessage={inviteMessage}
            inviteError={inviteError}
            sendInviteEmail={sendInviteEmail}
            shareInvite={shareInvite}
            copyInviteCode={copyInviteCode}
            profileNames={profileNames}
            profileNameInput={profileNameInput}
            setProfileNameInput={setProfileNameInput}
            profileColors={profileColors}
            profileColor={profileColor}
            profileText={profileText}
            profileColorOptions={PROFILE_COLORS}
            saveProfileColor={saveProfileColor}
            saveProfileName={saveProfileName}
            openGoalsEdit={openGoalsEdit}
            fmtGoalDate={fmtGoalDate}
            emailInput={emailInput}
            setEmailInput={setEmailInput}
            saveEmail={saveEmail}
            newPasswordInput={newPasswordInput}
            setNewPasswordInput={setNewPasswordInput}
            confirmPasswordInput={confirmPasswordInput}
            setConfirmPasswordInput={setConfirmPasswordInput}
            savePassword={savePassword}
            accountBusy={accountBusy}
            accountError={accountError}
            accountMessage={accountMessage}
            renamingWith={renamingWith}
            setRenamingWith={setRenamingWith}
            withNameInput={withNameInput}
            setWithNameInput={setWithNameInput}
            renameWith={renameWith}
            clearAccountError={() => setAccountError("")}
            signOut={() => supabase.auth.signOut()}
            deleteConfirm={deleteConfirm}
            setDeleteConfirm={setDeleteConfirm}
            deleteAccount={deleteAccount}
            profileSaveColor={brand.teal}
            profileSaveText={brand.inkOn}
            successColor={brand.teal}
            styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton }}
          />
        )}

      </div>

      {toast && (
        <div role="status" aria-live="polite" style={{ position: "fixed", left: "50%", bottom: NAV_H + 18, transform: "translateX(-50%)", zIndex: 30, background: TEXT, color: SURFACE, borderRadius: 999, padding: "10px 15px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 30px rgba(28,36,48,.16)", whiteSpace: "nowrap", maxWidth: "calc(100vw - 32px)", overflow: "hidden", textOverflow: "ellipsis" }}>
          ✓ {toast}
        </div>
      )}

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,253,249,.96)", borderTop: `1px solid ${BORDER}`,
        paddingBottom: "env(safe-area-inset-bottom)", zIndex: 10,
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", height: NAV_H }}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => id === "log" ? openLog(logTab) : setTab(id)} style={{
                flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3,
                color: active ? brand.teal : TEXT_MUTED,
              }}>
                <Icon style={{ width: 20, height: 20 }} strokeWidth={active ? 2.4 : 1.8} />
                <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, fontFamily: "'DM Sans', -apple-system, sans-serif", fontStyle: "normal" }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
