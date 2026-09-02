import { useState, useEffect, useMemo, useRef } from "react";
import { Zap, Footprints, Droplet, Home, PlusCircle, TrendingUp, Target, Search, BookmarkPlus, Pencil, Trash2, Star, UserCircle, Utensils, Scale, Dumbbell, CheckCircle2, ChevronRight } from "lucide-react";
import { supabase } from "./supabase";
import TodayTab from "./tabs/TodayTab.jsx";
import LogTab from "./tabs/LogTab.jsx";
import TrendsTab from "./tabs/TrendsTab.jsx";
import GoalsTab from "./tabs/GoalsTab.jsx";
import ProfileTab from "./tabs/ProfileTab.jsx";
import { BrandLogo, BrandLoading, brand } from "./brand.jsx";
import { CheckMark, WithMark, WITHMARK_OPTIONS } from "./WithMarks.jsx";

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
const IS_STAGING = typeof window !== "undefined" && (window.location.hostname.includes("staging--") || window.location.hostname.startsWith("staging."));

function dateKeyInTimeZone(date = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function todayStr(timeZone) { return dateKeyInTimeZone(new Date(), timeZone); }
function zonedParts(date = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}
function zonedDateTimeToDate(dateStr, timeStr, timeZone) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desired;
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), timeZone);
    const shownAsUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), 0);
    guess += desired - shownAsUtc;
  }
  return new Date(guess);
}
function addCalendarDays(dateStr, amount) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
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
  return { weights: [], foods: [], activities: [], steps: [], water: [], fasts: [], goalWeight: null, goalDate: null, goalStatement: "", targets: { ...defaultTargets(u), water: null, steps: null } };
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
function friendlyError(error, fallback = "Something went wrong. Try again.") {
  const raw = String(error?.message || error || "").toLowerCase();
  if (raw.includes("invalid login credentials")) return "That email or password doesn’t look right.";
  if (raw.includes("email not confirmed")) return "Confirm your email before signing in.";
  if (raw.includes("user already registered")) return "An account already exists for that email.";
  if (raw.includes("network") || raw.includes("fetch")) return "We couldn’t connect to With. Check your connection and try again.";
  if (raw.includes("jwt") || raw.includes("expired")) return "Your session has expired. Sign in again.";
  if (raw.includes("duplicate key") || raw.includes("unique constraint")) return "That’s already in use.";
  return fallback;
}
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
  borderRadius: 10, padding: "12px 14px", fontSize: 16, width: "100%", minHeight: 46,
  boxShadow: "0 1px 0 rgba(45,35,25,.025)",
};
const cardStyle = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "1.15rem", marginBottom: "0.9rem", boxShadow: "0 3px 12px rgba(28,36,48,.04)" };
const headingStyle = { fontFamily: "'Newsreader', Georgia, serif", fontWeight: 600, fontSize: 22, letterSpacing: "-0.015em", lineHeight: 1.1, marginBottom: "0.85rem" };
const fieldLabel = { fontSize: 11, color: TEXT_MUTED, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.055em" };
const bigButton = (color, textColor) => ({
  background: color, color: textColor, border: "none", borderRadius: 10,
  padding: "12px 18px", minHeight: 46, fontWeight: 700, fontSize: 15, width: "100%",
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
  const storedInvite = localStorage.getItem("with-pending-invite") || "";
  const storedInviter = localStorage.getItem("with-pending-inviter") || "";
  const hasInvite = Boolean(inviteFromUrl || storedInvite);
  const inviterName = inviterFromUrl || storedInviter;
  const [mode, setMode] = useState(hasInvite ? "signup" : "welcome");
  const [email, setEmail] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (inviteFromUrl) localStorage.setItem("with-pending-invite", inviteFromUrl);
    if (inviterFromUrl) localStorage.setItem("with-pending-inviter", inviterFromUrl);
  }, [inviteFromUrl, inviterFromUrl]);

  function changeMode(next) {
    setMode(next);
    setError("");
    setMessage("");
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(""); setMessage("");
    if (mode === "forgot") {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (authError) setError(friendlyError(authError, "We couldn’t complete that. Try again."));
      else setMessage("Check your email for a password reset link.");
    } else if (mode === "signin") {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(friendlyError(authError, "We couldn’t complete that. Try again."));
    } else {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authError) setError(friendlyError(authError, "We couldn’t complete that. Try again."));
      else if (!data.session) {
        setConfirmationEmail(email);
        setMode("confirm");
      } else {
        setMessage("Account created. Getting your With ready…");
      }
    }
    setBusy(false);
  }

  const shell = {
    minHeight: "100vh", minHeight: "100dvh", background: brand.teal, color: TEXT,
    display: "grid", placeItems: "center", padding: 20,
    fontFamily: "'DM Sans', -apple-system, sans-serif"
  };
  const panel = { ...cardStyle, width: "100%", maxWidth: 420, marginBottom: 0, background: brand.bg, borderRadius: 20, boxShadow: "0 18px 48px rgba(17,50,46,.22)" };
  const linkButton = { background: "none", border: "none", color: brand.tealDark, width: "100%", padding: "13px 8px 2px", fontSize: 13, fontWeight: 700 };

  if (mode === "welcome") {
    return (
      <div style={shell}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,500;1,6..72,600;1,6..72,700&display=swap'); * { box-sizing: border-box; } body { margin: 0; } input, button { font-family: inherit; }`}</style>
        <div style={panel}>
          <BrandLogo style={{ width: 132, marginBottom: 14 }} />
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600, lineHeight: 1.06, marginBottom: 12 }}>
            Take care of yourself. With people who care about you.
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.55, marginBottom: 22 }}>
            With is a private place to keep track of the things that matter to your health, alongside the people who matter to you. Start on your own or start with someone. Either way, your goals and your health are yours.
          </div>
          <button type="button" onClick={() => changeMode("signup")} style={{ ...bigButton(brand.teal, brand.inkOn), marginBottom: 8 }}>Get started</button>
          <button type="button" onClick={() => changeMode("signin")} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>I already have an account</button>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <a href="/privacy" style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>Privacy policy</a>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "confirm") {
    return (
      <div style={shell}>
        <div style={panel}>
          <BrandLogo style={{ width: 132, marginBottom: 14 }} />
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.06, marginBottom: 10 }}>Check your email.</div>
          <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.55, marginBottom: 8 }}>We sent a confirmation link to</div>
          <div style={{ color: TEXT, fontSize: 15, fontWeight: 800, overflowWrap: "anywhere", marginBottom: 16 }}>{confirmationEmail}</div>
          <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.55, marginBottom: 20 }}>
            {hasInvite && inviterName
              ? `Confirm your email and we’ll keep going with ${inviterName}’s invitation.`
              : "Confirm your email and we’ll keep setting up your With."}
          </div>
          <button type="button" onClick={() => { setEmail(confirmationEmail); changeMode("signin"); }} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, marginBottom: 6 }}>I’ve confirmed my email</button>
          <button type="button" onClick={() => { setConfirmationEmail(""); setPassword(""); changeMode("signup"); }} style={linkButton}>Used the wrong email? Go back</button>
        </div>
      </div>
    );
  }

  const isForgot = mode === "forgot";
  const isSignup = mode === "signup";
  const title = isForgot
    ? "Reset your password."
    : isSignup
      ? (hasInvite && inviterName ? `${inviterName} invited you to With.` : "Create your account.")
      : (hasInvite && inviterName ? `Sign in to join ${inviterName}.` : "Welcome back.");
  const intro = isForgot
    ? "We’ll send you a link to choose a new password."
    : isSignup
      ? (hasInvite && inviterName
          ? "You’ll each have your own goals and health profile. With gives you a private place to share the experience and support each other."
          : "Start with yourself. You can invite someone you trust whenever you’re ready.")
      : (hasInvite && inviterName ? "Your invitation is waiting for you." : "Good to have you back.");

  return (
    <div style={shell}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,500;1,6..72,600;1,6..72,700&display=swap'); * { box-sizing: border-box; } body { margin: 0; } input, button { font-family: inherit; }`}</style>
      <form onSubmit={submit} style={panel}>
        <BrandLogo style={{ width: 132, marginBottom: 14 }} />
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 29, fontWeight: 600, lineHeight: 1.08, marginBottom: 8 }}>{title}</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>{intro}</div>

        <div style={fieldLabel}>Email</div>
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />

        {!isForgot && <>
          <div style={fieldLabel}>Password</div>
          <input type="password" minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} required value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
        </>}

        {isSignup && hasInvite && inviterName && (
          <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, margin: "2px 0 14px" }}>Your goals don’t need to match {inviterName}’s.</div>
        )}
        {error && <div role="alert" style={{ color: WARN, fontSize: 13, marginBottom: 10 }}>{error}</div>}
        {message && <div style={{ color: brand.tealDark, fontSize: 13, marginBottom: 10 }}>{message}</div>}

        <button disabled={busy} style={{ ...bigButton(brand.teal, brand.inkOn), opacity: busy ? 0.65 : 1 }}>
          {busy ? "Working…" : isForgot ? "Send reset link" : mode === "signin" ? "Sign in" : hasInvite ? "Create my account and continue" : "Create my account"}
        </button>

        {mode === "signin" && <button type="button" onClick={() => changeMode("forgot")} style={linkButton}>Forgot password?</button>}
        {mode === "signin" && hasInvite && <button type="button" onClick={() => changeMode("signup")} style={linkButton}>{inviterName ? `Need an account? Continue joining ${inviterName}.` : "Need an account? Continue with your invitation."}</button>}
        {isForgot && <button type="button" onClick={() => changeMode("signin")} style={linkButton}>Back to sign in</button>}
        {isSignup && <button type="button" onClick={() => changeMode("signin")} style={linkButton}>{hasInvite && inviterName ? `Already use With? Sign in to join ${inviterName}.` : "Already have an account? Sign in"}</button>}
        {mode === "signin" && !hasInvite && <button type="button" onClick={() => changeMode("signup")} style={linkButton}>New to With? Get started</button>}
        {mode === "signin" && !hasInvite && <button type="button" onClick={() => changeMode("welcome")} style={{ ...linkButton, color: TEXT_MUTED, fontWeight: 600 }}>Back to welcome</button>}

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <a href="/privacy" style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>Privacy policy</a>
        </div>
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
      setError(friendlyError(authError, "We couldn’t complete that. Try again."));
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
    <div style={{ minHeight: "100vh", minHeight: "100dvh", background: brand.teal, color: TEXT, display: "grid", placeItems: "center", padding: 20, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <form onSubmit={updatePassword} style={{ ...cardStyle, width: "100%", maxWidth: 420, marginBottom: 0, background: brand.bg, borderRadius: 20, boxShadow: "0 18px 48px rgba(17,50,46,.22)" }}>
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
    if (error) setError(friendlyError(error, "We couldn’t create your With. Try again.")); else await onComplete();
    setBusy(false);
  }
  async function joinHousehold(e) {
    e.preventDefault(); setBusy(true); setError("");
    const { error } = await supabase.rpc("join_household", { invite_code_input: inviteCode.trim().toUpperCase(), profile_name: profileName.trim() });
    if (error) setError(friendlyError(error, "We couldn’t join that With. Check the invite and try again.")); else await onComplete();
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", minHeight: "100dvh", background: brand.teal, color: TEXT, display: "grid", placeItems: "center", padding: 20, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ ...cardStyle, width: "100%", maxWidth: 440, marginBottom: 0, background: brand.bg, borderRadius: 20, boxShadow: "0 18px 48px rgba(17,50,46,.22)" }}>
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
    if (error) setError(friendlyError(error, "We couldn’t connect that profile. Try again.")); else await onClaim();
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", minHeight: "100dvh", background: brand.teal, color: TEXT, display: "grid", placeItems: "center", padding: 20, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
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
  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [timeZone, setTimeZone] = useState(deviceTimeZone);
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
  const [profileWithmarks, setProfileWithmarks] = useState({});
  const [intentions, setIntentions] = useState({});
  const [activeFasts, setActiveFasts] = useState({});
  const [fastBusy, setFastBusy] = useState(false);
  const [fastPromptDismissedDate, setFastPromptDismissedDate] = useState(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const [fastEditorOpen, setFastEditorOpen] = useState(false);
  const [fastStartDate, setFastStartDate] = useState(() => todayStr());
  const [fastStartTime, setFastStartTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  });
  const [activeUser, setActiveUser] = useState("Alli");
  const [tab, setTab] = useState("today");
  const [logTab, setLogTab] = useState(() => localStorage.getItem("with-log-tab") || "food");
  const [toast, setToast] = useState(null);
  const [buttonSuccess, setButtonSuccess] = useState(null);
  const [logBusy, setLogBusy] = useState(null);
  const logBusyRef = useRef(null);
  const [data, setData] = useState({ Alli: emptyData("Alli"), Shane: emptyData("Shane") });
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(null);
  const [walkthrough, setWalkthrough] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("with-walkthrough-state") || "null");
      return saved?.active ? saved : null;
    } catch {
      return null;
    }
  });

  function updateWalkthrough(patch) {
    setWalkthrough((prev) => {
      if (!prev?.active) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem("with-walkthrough-state", JSON.stringify(next));
      return next;
    });
  }
  const [savedFoods, setSavedFoods] = useState([]);
  const [globalFoods, setGlobalFoods] = useState([]);
  const [savedSearch, setSavedSearch] = useState("");
  const [selectedSavedFoodId, setSelectedSavedFoodId] = useState(null);
  const [foodQuantity, setFoodQuantity] = useState("1");
  const [foodServingLabel, setFoodServingLabel] = useState("1 serving");
  const [saveAsSaved, setSaveAsSaved] = useState(false);
  const [editingSavedId, setEditingSavedId] = useState(null);
  const [editingFoodId, setEditingFoodId] = useState(null);
  const [showManageSaved, setShowManageSaved] = useState(false);
  const [foodStates, setFoodStates] = useState([]);
  const [foodLibraryTab, setFoodLibraryTab] = useState("recent");

  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState(() => todayStr());
  const [weightError, setWeightError] = useState("");

  const [foodName, setFoodName] = useState("");
  const [foodCals, setFoodCals] = useState("");
  const [foodProtein, setFoodProtein] = useState("");
  const [foodCarbs, setFoodCarbs] = useState("");
  const [foodFat, setFoodFat] = useState("");
  const [foodFiber, setFoodFiber] = useState("");
  const [foodMeal, setFoodMeal] = useState("Breakfast");
  const [foodNotes, setFoodNotes] = useState("");
  const [foodDate, setFoodDate] = useState(() => todayStr());
  const [foodError, setFoodError] = useState("");

  const [stepsInput, setStepsInput] = useState("");
  const [stepsError, setStepsError] = useState("");
  const [stepsDate, setStepsDate] = useState(() => todayStr());
  const [waterOz, setWaterOz] = useState("");
  const [waterError, setWaterError] = useState("");
  const [waterDate, setWaterDate] = useState(() => todayStr());
  const [waterShortcuts, setWaterShortcuts] = useState([8, 16, 24]);
  const [actName, setActName] = useState("");
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [activityError, setActivityError] = useState("");
  const [actCals, setActCals] = useState("");
  const [actDate, setActDate] = useState(() => todayStr());
  const previousTodayRef = useRef(todayStr(deviceTimeZone));

  useEffect(() => {
    const nextToday = todayStr(timeZone);
    const previousToday = previousTodayRef.current;
    if (nextToday !== previousToday) {
      const moveIfToday = (setter) => setter((value) => value === previousToday ? nextToday : value);
      moveIfToday(setWeightDate);
      moveIfToday(setFoodDate);
      moveIfToday(setStepsDate);
      moveIfToday(setWaterDate);
      moveIfToday(setActDate);
      moveIfToday(setFastStartDate);
      previousTodayRef.current = nextToday;
    }
  }, [timeZone, clockNow]);

  const [goalInput, setGoalInput] = useState("");
  const [goalStatementInput, setGoalStatementInput] = useState("");
  const [goalError, setGoalError] = useState("");
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalDateInput, setGoalDateInput] = useState("");
  const [tBmr, setTBmr] = useState("");
  const [tCal, setTCal] = useState("");
  const [tProtein, setTProtein] = useState("");
  const [tCarbs, setTCarbs] = useState("");
  const [tFat, setTFat] = useState("");
  const [tFiberMin, setTFiberMin] = useState("");
  const [tFiberMax, setTFiberMax] = useState("");
  const [tWater, setTWater] = useState("");
  const [tSteps, setTSteps] = useState("");

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
      if (session?.user) {
        setTimeZone(session.user.user_metadata?.timezone || deviceTimeZone);
        const savedWater = session.user.user_metadata?.water_shortcuts;
        if (Array.isArray(savedWater) && savedWater.length === 3 && savedWater.every((n) => Number.isFinite(Number(n)) && Number(n) > 0)) {
          setWaterShortcuts(savedWater.map(Number));
        }
      }
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("with-password-recovery");
        setPasswordRecovery(false);
        setHouseholdId(null);
        setHouseholdName("");
        setHouseholdRole(null);
        setInviteCode("");
        setProfiles({});
        setProfileColors({});
        setProfileWithmarks({});
        setIntentions({});
        setActiveFasts({});
        setOwnedProfileId(null);
        setNeedsOnboarding(false);
        setLoading(false);
      }
      setSession(nextSession);
      if (nextSession?.user) {
        setTimeZone(nextSession.user.user_metadata?.timezone || deviceTimeZone);
        const savedWater = nextSession.user.user_metadata?.water_shortcuts;
        if (Array.isArray(savedWater) && savedWater.length === 3 && savedWater.every((n) => Number.isFinite(Number(n)) && Number(n) > 0)) {
          setWaterShortcuts(savedWater.map(Number));
        }
      }
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
    const shouldBlock = !householdId || !Object.keys(profiles).length;
    if (shouldBlock) setLoading(true);
    setSaveError(null);
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
      const { data: householdRow, error: householdError } = await supabase.from("households").select("name, invite_code").eq("id", hid).single();
      if (householdError) throw householdError;
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
          goalStatement: p.goal_statement || "",
          targets: { bmr: num(p.bmr), calories: num(p.calories), protein: num(p.protein), carbs: num(p.carbs), fat: num(p.fat), fiberMin: num(p.fiber_min), fiberMax: num(p.fiber_max), water: p.water_target == null ? null : num(p.water_target), steps: p.steps_target == null ? null : Number(p.steps_target) },
        };
      });
      setProfiles(pmap);
      setProfileColors(Object.fromEntries((profileRows || []).map((p) => [p.name, p.profile_color || null])));
      setProfileWithmarks(Object.fromEntries((profileRows || []).map((p) => [p.name, p.profile_withmark || null])));
      setIntentions(Object.fromEntries((profileRows || []).map((p) => [p.name, p.intention_date === todayStr(timeZone) ? (p.current_intention || "") : ""])));
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
        supabase.from("fasting_entries").select("*").in("profile_id", profileIds).order("started_at"),
      ]);
      for (const r of [weightsRes, foodsRes, activitiesRes, stepsRes, waterRes, savedFoodsRes, globalFoodsRes, foodStatesRes, fastsRes]) if (r.error) throw r.error;
      const nameById = Object.fromEntries(Object.values(pmap).map((p) => [p.id, p.name]));
      for (const w of weightsRes.data || []) { const n = nameById[w.profile_id]; if (next[n]) next[n].weights.push({ id: w.id, date: w.entry_date, weight: num(w.weight) }); }
      for (const f of foodsRes.data || []) { const n = nameById[f.profile_id]; if (next[n]) next[n].foods.push({ id: f.id, date: f.entry_date, name: f.name, calories: num(f.calories), protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat), fiber: num(f.fiber), meal: f.meal, notes: f.notes || "" }); }
      for (const a of activitiesRes.data || []) { const n = nameById[a.profile_id]; if (next[n]) next[n].activities.push({ id: a.id, date: a.entry_date, name: a.name, caloriesBurned: num(a.calories_burned) }); }
      for (const s of stepsRes.data || []) { const n = nameById[s.profile_id]; if (next[n]) next[n].steps.push({ id: s.id, date: s.entry_date, count: Number(s.step_count) }); }
      for (const w of waterRes.data || []) { const n = nameById[w.profile_id]; if (next[n]) next[n].water.push({ id: w.id, date: w.entry_date, ounces: num(w.ounces) }); }
      for (const fast of fastsRes.data || []) { const n = nameById[fast.profile_id]; if (next[n]) next[n].fasts.push({ id: fast.id, startedAt: fast.started_at, endedAt: fast.ended_at || null }); }
      setSavedFoods((savedFoodsRes.data || []).map((f) => ({ ...f, source: "household", calories: num(f.calories), protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat), fiber: num(f.fiber), use_count: Number(f.use_count || 0) })));
      setGlobalFoods((globalFoodsRes.data || []).map((f) => ({ ...f, source: "global", calories: num(f.calories), protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat), fiber: num(f.fiber) })));
      setFoodStates(foodStatesRes.data || []);
      setData(next);
      const fastMap = {};
      (fastsRes?.data || []).filter((f) => !f.ended_at).forEach((f) => {
        const name = Object.keys(pmap).find((n) => pmap[n].id === f.profile_id);
        if (name) fastMap[name] = f;
      });
      setActiveFasts(fastMap);
    } catch (e) {
      setSaveError(friendlyError(e, "We couldn’t load your With. Refresh and try again."));
    } finally { setLoading(false); }
  }

  useEffect(() => { if (session?.user) loadAll(); else if (authReady) setLoading(false); }, [session?.user?.id, authReady, timeZone, todayStr(timeZone)]);

  useEffect(() => {
    if (loading) return;
    const u = data[activeUser];
    setGoalInput(u.goalWeight || "");
    setGoalStatementInput(u.goalStatement || "");
    setGoalDateInput(u.goalDate || "");
    setTBmr(u.targets.bmr); setTCal(u.targets.calories); setTProtein(u.targets.protein);
    setTCarbs(u.targets.carbs); setTFat(u.targets.fat); setTFiberMin(u.targets.fiberMin); setTFiberMax(u.targets.fiberMax);
    setTWater(u.targets.water ?? ""); setTSteps(u.targets.steps ?? "");
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
    if (error) setAccountError(friendlyError(error, "We couldn’t save that account change. Try again."));
    else {
      setProfileColors((prev) => ({ ...prev, [profileNameInput || activeUser]: color }));
      setAccountMessage("Your color is updated.");
      await loadAll();
    }
    setAccountBusy(false);
  }

  async function saveProfileWithmark(withmark) {
    if (!ownedProfileId) return false;
    const allowed = WITHMARK_OPTIONS.some((option) => option.id === withmark);
    if (!allowed) {
      setAccountError("Choose one of the available Withmarks.");
      return false;
    }
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const { error } = await supabase.from("profiles").update({ profile_withmark: withmark }).eq("id", ownedProfileId);
    if (error) {
      setAccountError(friendlyError(error, "We couldn’t save your Withmark. Try again."));
      setAccountBusy(false);
      return false;
    }
    setProfileWithmarks((prev) => ({ ...prev, [profileNameInput || activeUser]: withmark }));
    setAccountMessage("Your Withmark is updated.");
    setAccountBusy(false);
    return true;
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
      .update({ current_intention: next || null, intention_date: todayStr(timeZone) })
      .eq("id", p.id);
    if (error) {
      setSaveError(friendlyError(error, "We couldn’t save your intention. Try again."));
      return false;
    }
    setIntentions((prev) => ({ ...prev, [activeUser]: next }));
    showSuccess(next ? "Intention saved" : "Intention cleared", "intention");
    return true;
  }

  const fastPromptDismissedToday = fastPromptDismissedDate === todayStr(timeZone);

  async function dismissFastPromptToday() {
    if (!ownedProfileId) return;
    const date = todayStr(timeZone);
    setFastPromptDismissedDate(date);
    const { error } = await supabase
      .from("profiles")
      .update({ fasting_prompt_dismissed_date: date })
      .eq("id", ownedProfileId);
    if (error) {
      setSaveError(friendlyError(error, "We couldn’t save that preference. Try again."));
      setFastPromptDismissedDate(null);
    }
  }

  function openFastEditor(existing = null) {
    const d = existing?.started_at ? new Date(existing.started_at) : new Date();
    const p = zonedParts(d, timeZone);
    setFastStartDate(`${p.year}-${p.month}-${p.day}`);
    setFastStartTime(`${p.hour}:${p.minute}`);
    setFastEditorOpen(true);
  }

  async function startFast() {
    if (!activeCanEdit || fastBusy) {
      setSaveError(activeCanEdit ? "Fasting is already being updated. Give it a moment and try again." : "Only the owner of this profile can manage fasting.");
      return;
    }
    const p = profileFor(activeUser);
    if (!p) { setSaveError("Your profile could not be found."); return; }

    const started = zonedDateTimeToDate(fastStartDate, fastStartTime, timeZone);
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
      setSaveError(friendlyError(error, "We couldn’t start your fast. Try again."));
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

    const started = zonedDateTimeToDate(fastStartDate, fastStartTime, timeZone);
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
      setSaveError(friendlyError(error, "We couldn’t update your fast. Try again."));
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
      setSaveError(friendlyError(error, "We couldn’t end your fast. Try again."));
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
    if (error) setAccountError(friendlyError(error, "We couldn’t save that account change. Try again."));
    else {
      setHouseholdName(nextName);
      setRenamingWith(false);
      setAccountMessage("Your With has been renamed.");
    }
    setAccountBusy(false);
  }

  async function saveProfileName() {
    const nextName = profileNameInput.trim();
    if (!ownedProfileId || !nextName) { setAccountError("Your profile needs a name."); return false; }
    if (nextName.length > 40) { setAccountError("Keep your profile name to 40 characters or fewer."); return false; }
    const currentName = Object.values(profiles).find((p) => p.id === ownedProfileId)?.name || activeUser;
    const duplicate = Object.values(profiles).some((p) =>
      p.id !== ownedProfileId && String(p.name || "").trim().toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) { setAccountError("Someone in this With already uses that name."); return false; }
    if (nextName === currentName) { setAccountError(""); setAccountMessage("Your profile name is already up to date."); return true; }
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const { error } = await supabase.from("profiles").update({ name: nextName }).eq("id", ownedProfileId);
    if (error) { setAccountError(friendlyError(error, "We couldn’t update your profile name. Try again.")); setAccountBusy(false); return false; }
    setAccountMessage("Profile name updated."); await loadAll();
    setAccountBusy(false);
    return true;
  }

  async function saveEmail() {
    const nextEmail = emailInput.trim();
    if (!nextEmail) { setAccountError("Enter an email address."); return false; }
    if (nextEmail.toLowerCase() === String(session?.user?.email || "").toLowerCase()) {
      setAccountError("");
      setAccountMessage("That’s already your account email.");
      return true;
    }
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const { error } = await supabase.auth.updateUser(
      { email: nextEmail },
      { emailRedirectTo: window.location.origin }
    );
    if (error) { setAccountError(friendlyError(error, "We couldn’t update your email. Try again.")); setAccountBusy(false); return false; }
    setAccountMessage("Email update requested. Check your inbox to confirm the change.");
    setAccountBusy(false);
    return true;
  }

  async function savePassword() {
    setAccountError(""); setAccountMessage("");
    if (newPasswordInput.length < 6) { setAccountError("Use at least 6 characters."); return false; }
    if (newPasswordInput !== confirmPasswordInput) { setAccountError("Those passwords don't match."); return false; }
    setAccountBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPasswordInput });
    if (error) { setAccountError(friendlyError(error, "We couldn’t update your password. Try again.")); setAccountBusy(false); return false; }
    setAccountMessage("Password updated."); setNewPasswordInput(""); setConfirmPasswordInput("");
    setAccountBusy(false);
    return true;
  }

  async function saveTimeZone(nextZone) {
    if (!nextZone) return false;
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const currentData = session?.user?.user_metadata || {};
    const { data: updated, error } = await supabase.auth.updateUser({ data: { ...currentData, timezone: nextZone } });
    if (error) {
      setAccountError(friendlyError(error, "We couldn’t update your time zone. Try again."));
      setAccountBusy(false);
      return false;
    }
    setTimeZone(updated?.user?.user_metadata?.timezone || nextZone);
    setAccountMessage("Time zone updated.");
    setAccountBusy(false);
    return true;
  }

  async function saveWaterShortcuts(nextShortcuts) {
    const parsed = (nextShortcuts || []).map((value) => Number(value));
    if (parsed.length !== 3 || parsed.some((value) => !Number.isFinite(value) || value <= 0 || value > 999)) {
      setAccountError("Use three water amounts between 1 and 999 oz.");
      return false;
    }
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const currentData = session?.user?.user_metadata || {};
    const clean = parsed.map((value) => Math.round(value * 10) / 10);
    const { data: updated, error } = await supabase.auth.updateUser({ data: { ...currentData, water_shortcuts: clean } });
    if (error) {
      setAccountError(friendlyError(error, "We couldn’t update your water shortcuts. Try again."));
      setAccountBusy(false);
      return false;
    }
    const saved = updated?.user?.user_metadata?.water_shortcuts || clean;
    setWaterShortcuts(saved.map(Number));
    setAccountMessage("Water shortcuts updated.");
    setAccountBusy(false);
    return true;
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") { setAccountError('Type DELETE to confirm.'); return; }
    setAccountBusy(true); setAccountError(""); setAccountMessage("");
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) { setAccountError(friendlyError(error, "We couldn’t delete your account. Nothing was removed. Try again.")); setAccountBusy(false); return false; }
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
      setInviteError(friendlyError(error, "We couldn’t send that invitation. Try again."));
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
    setInviteError(""); setInviteMessage("");
    if (!inviteCode) { setInviteError("Invite code isn’t available yet. Refresh and try again."); return; }
    try {
      await navigator.clipboard.writeText(inviteUrl());
      setInviteMessage("Invite link copied.");
      showSuccess("Invite link copied");
    } catch {
      setInviteError(`We couldn’t copy the link. You can still use invite code ${inviteCode}.`);
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
  function profileWithmark(name) {
    const chosen = profileWithmarks[name];
    if (WITHMARK_OPTIONS.some((option) => option.id === chosen)) return chosen;
    const ids = WITHMARK_OPTIONS.map((option) => option.id);
    let total = 0;
    for (const char of String(name || "")) total += char.charCodeAt(0);
    return ids[total % ids.length] || "star";
  }

  function profileFor(name) { return profiles[name]; }
  function canEdit(name) { return profiles[name]?.user_id === session?.user?.id; }
  const activeCanEdit = canEdit(activeUser);
  async function runWrite(work) {
    setSaveError(null);
    try { await work(); await loadAll(); return true; }
    catch (e) { setSaveError(friendlyError(e, "We couldn’t save that. Try again.")); return false; }
  }

  async function runLogWrite(kind, work) {
    if (logBusyRef.current) return false;
    logBusyRef.current = kind;
    setLogBusy(kind);
    setSaveError(null);
    try {
      await work();
      await loadAll();
      if (walkthrough?.active && !walkthrough.firstLogDone) {
        updateWalkthrough({ firstLogDone: true });
        setToast("There it is. Today fills in as you go.");
        window.clearTimeout(window.__withToastTimer);
        window.__withToastTimer = window.setTimeout(() => setToast(null), 3200);
      }
      return true;
    } catch (e) {
      setSaveError(friendlyError(e, "We couldn’t save that. Try again."));
      return false;
    } finally {
      logBusyRef.current = null;
      setLogBusy(null);
    }
  }

  function showSuccess(message, kind) {
    setToast(message);
    setButtonSuccess(kind);
    window.clearTimeout(window.__withToastTimer);
    window.clearTimeout(window.__withButtonTimer);
    window.__withToastTimer = window.setTimeout(() => setToast(null), 2800);
    window.__withButtonTimer = window.setTimeout(() => setButtonSuccess(null), 1400);
  }

  function defaultMealForNow() {
    const h = Number(zonedParts(new Date(), timeZone).hour);
    if (h < 11) return "Breakfast";
    if (h < 15) return "Lunch";
    if (h < 21) return "Dinner";
    return "Snack";
  }

  function openLog(kind = logTab, date = todayStr(timeZone), meal = null) {
    setLogTab(kind);
    localStorage.setItem("with-log-tab", kind);
    if (kind === "food") {
      if (!editingFoodId) clearFoodForm();
      setFoodDate(date);
      setFoodMeal(meal || defaultMealForNow());
    }
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
    const ok = await runLogWrite("weight", async () => {
      const { error } = await supabase.from("weight_entries").upsert({ household_id: householdId, profile_id: p.id, entry_date: weightDate, weight: val }, { onConflict: "profile_id,entry_date" });
      if (error) throw error;
    });
    if (ok) { setWeightInput(""); showSuccess(`${val} lb logged`, "weight"); }
  }
  async function deleteWeight(id) {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; } await runWrite(async () => { const { error } = await supabase.from("weight_entries").delete().eq("id", id); if (error) throw error; }); }

  function clearFoodForm() {
    setFoodName(""); setFoodCals(""); setFoodProtein(""); setFoodCarbs(""); setFoodFat(""); setFoodFiber(""); setFoodNotes("");
    setFoodQuantity("1"); setFoodServingLabel("1 serving"); setSaveAsSaved(false); setSelectedSavedFoodId(null); setEditingSavedId(null); setEditingFoodId(null);
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

  function editLoggedFood(food) {
    clearFoodForm();
    setEditingFoodId(food.id);
    setFoodName(food.name || "");
    setFoodCals(String(food.calories ?? ""));
    setFoodFat(String(food.fat ?? ""));
    setFoodCarbs(String(food.carbs ?? ""));
    setFoodFiber(String(food.fiber ?? ""));
    setFoodProtein(String(food.protein ?? ""));
    setFoodMeal(food.meal || defaultMealForNow());
    setFoodNotes(food.notes || "");
    setFoodDate(food.date || todayStr(timeZone));
    setLogTab("food");
    setTab("log");
  }

  async function addFood() {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    if (!foodName.trim()) { setFoodError("Give it a name."); return; }
    const cals = parseFloat(foodCals) || 0, protein = parseFloat(foodProtein) || 0;
    const carbs = parseFloat(foodCarbs) || 0, fat = parseFloat(foodFat) || 0, fiber = parseFloat(foodFiber) || 0;
    if (!foodCals && !foodProtein && !foodCarbs && !foodFat) { setFoodError("Add at least calories or a macro."); return; }
    setFoodError(""); const p = profileFor(activeUser); if (!p) return;
    const ok = await runLogWrite("food", async () => {
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
      const entryPayload = { household_id: householdId, profile_id: p.id, saved_food_id: savedId, entry_date: foodDate, name: foodName.trim(), calories: cals, protein, carbs, fat, fiber, meal: foodMeal, notes: foodNotes.trim() || null };
      const { error } = editingFoodId
        ? await supabase.from("food_entries").update(entryPayload).eq("id", editingFoodId)
        : await supabase.from("food_entries").insert(entryPayload);
      if (error) throw error;
    });
    if (ok) { const loggedName = foodName.trim(); const wasEditing = !!editingFoodId; clearFoodForm(); showSuccess(`${loggedName} ${wasEditing ? "updated" : "added"}`, "food"); }
  }
  async function deleteFood(id) {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; } await runWrite(async () => { const { error } = await supabase.from("food_entries").delete().eq("id", id); if (error) throw error; }); }

  async function saveSteps() {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    const val = parseInt(stepsInput, 10); if (!stepsInput || isNaN(val) || val < 0) { setStepsError("Enter a valid step total."); return; }
    setStepsError("");
    const p = profileFor(activeUser); if (!p) return;
    const ok = await runLogWrite("steps", async () => { const { error } = await supabase.from("step_entries").upsert({ household_id: householdId, profile_id: p.id, entry_date: stepsDate, step_count: val }, { onConflict: "profile_id,entry_date" }); if (error) throw error; });
    if (ok) { setStepsInput(""); showSuccess(`${val.toLocaleString()} steps saved`, "steps"); }
  }
  async function addWater(amount, pendingKey = "water") {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    const val = amount != null ? amount : parseFloat(waterOz); if (!val || isNaN(val) || val <= 0) { setWaterError("Enter an amount greater than 0."); return; }
    setWaterError("");
    const p = profileFor(activeUser); if (!p) return;
    const ok = await runLogWrite(pendingKey, async () => { const { error } = await supabase.from("water_entries").insert({ household_id: householdId, profile_id: p.id, entry_date: waterDate, ounces: val }); if (error) throw error; });
    if (ok) { setWaterOz(""); showSuccess(`${val} oz water added`, "water"); }
  }
  async function addActivity() {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    if (!actName.trim()) { setActivityError("Add an activity name."); return; }
    const cals = parseFloat(actCals) || 0; if (!cals || cals <= 0) { setActivityError("Enter calories burned."); return; }
    setActivityError("");
    const p = profileFor(activeUser); if (!p) return;
    const payload = { household_id: householdId, profile_id: p.id, entry_date: actDate, name: actName.trim(), calories_burned: cals };
    const ok = await runLogWrite("activity", async () => {
      const query = editingActivityId
        ? supabase.from("activity_entries").update(payload).eq("id", editingActivityId)
        : supabase.from("activity_entries").insert(payload);
      const { error } = await query;
      if (error) throw error;
    });
    if (ok) {
      const loggedActivity = actName.trim();
      setActName(""); setActCals(""); setEditingActivityId(null);
      showSuccess(editingActivityId ? `${loggedActivity} updated` : `${loggedActivity} added`, "activity");
    }
  }

  function editActivity(activity) {
    if (!activeCanEdit) return;
    setEditingActivityId(activity.id);
    setActName(activity.name || "");
    setActCals(String(activity.caloriesBurned || ""));
    setActDate(activity.date || todayStr(timeZone));
    setActivityError("");
    setTab("log");
    setLogTab("activity");
  }

  function cancelActivityEdit() {
    setEditingActivityId(null);
    setActName("");
    setActCals("");
    setActivityError("");
  }

  async function deleteActivity(id) {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    const ok = await runWrite(async () => { const { error } = await supabase.from("activity_entries").delete().eq("id", id); if (error) throw error; });
    if (ok && editingActivityId === id) cancelActivityEdit();
  }

  async function saveGoal() {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    const val = parseFloat(goalInput); const p = profileFor(activeUser); if (!p) { setGoalError("We couldn’t find your profile. Refresh and try again."); return false; }
    if (goalInput && (!Number.isFinite(val) || val <= 0)) { setGoalError("Enter a valid goal weight."); return false; }
    setGoalError("");
    return await runWrite(async () => { const { error } = await supabase.from("profiles").update({ goal_weight: isNaN(val) ? null : val, goal_date: goalDateInput || null, goal_statement: goalStatementInput.trim() || null }).eq("id", p.id); if (error) throw error; });
  }
  async function saveTargets() {
    if (!activeCanEdit) { setSaveError("You can view this profile, but only its owner can make changes."); return; }
    const p = profileFor(activeUser); if (!p) { setGoalError("We couldn’t find your profile. Refresh and try again."); return false; }
    const nums = [tBmr, tCal, tProtein, tCarbs, tFat, tFiberMin, tFiberMax, tWater, tSteps].map((v) => v === "" ? 0 : Number(v));
    if (nums.some((v) => !Number.isFinite(v) || v < 0)) { setGoalError("Check your daily targets and use numbers 0 or higher."); return false; }
    if (Number(tFiberMax || 0) && Number(tFiberMin || 0) > Number(tFiberMax || 0)) { setGoalError("Fiber max should be higher than fiber min."); return false; }
    setGoalError("");
    return await runWrite(async () => {
      const { error } = await supabase.from("profiles").update({ bmr: parseFloat(tBmr) || 0, calories: parseFloat(tCal) || 0, protein: parseFloat(tProtein) || 0, carbs: parseFloat(tCarbs) || 0, fat: parseFloat(tFat) || 0, fiber_min: parseFloat(tFiberMin) || 0, fiber_max: parseFloat(tFiberMax) || 0, water_target: tWater === "" ? null : Number(tWater), steps_target: tSteps === "" ? null : Math.round(Number(tSteps)) }).eq("id", p.id);
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
    for (let i = 13; i >= 0; i--) days.push(addCalendarDays(todayStr(timeZone), -i));
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

  const today = todayStr(timeZone);
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
    const latestEntry = w[w.length - 1];
    const windowStart = new Date(latestEntry.date + "T12:00:00Z");
    windowStart.setUTCDate(windowStart.getUTCDate() - 6);
    const windowStartStr = windowStart.toISOString().slice(0, 10);
    const recentWeights = w.filter((entry) => entry.date >= windowStartStr && entry.date <= latestEntry.date);
    const latest = recentWeights.reduce((sum, entry) => sum + entry.weight, 0) / recentWeights.length;
    const latestActual = latestEntry.weight;
    const averageCount = recentWeights.length;
    const goal = data[u].goalWeight;

    if (goal == null || goal === start) {
      return {
        start,
        latest,
        latestActual,
        averageCount,
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

    return { start, latest, latestActual, averageCount, goal, plannedChange, progressAmount, progressPct, remaining };
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,500;1,6..72,600;1,6..72,700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; }
        input, select, textarea, button { font-family: inherit; }
        .num { font-family: 'DM Sans', -apple-system, sans-serif; font-variant-numeric: tabular-nums; }
        button { cursor: pointer; -webkit-appearance: none; }
        button:disabled { cursor: default; }
        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, summary:focus-visible {
          outline: 3px solid rgba(31,94,87,.18);
          outline-offset: 2px;
        }
        ::placeholder { color: #747875; }
        textarea { resize: vertical; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
        }
      `}</style>

      <div style={{ position: "sticky", top: 0, zIndex: 10, background: brand.teal, borderBottom: `1px solid ${brand.tealDark}`, paddingTop: "env(safe-area-inset-top)", boxShadow: "0 2px 10px rgba(23,78,73,.12)" }}>
        {IS_STAGING && (
          <div style={{ height: 18, background: WARN, color: brand.inkOn, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, letterSpacing: ".16em", lineHeight: 1, textTransform: "uppercase" }}>
            Staging
          </div>
        )}
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "0.72rem 1rem 0.68rem", display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
            <BrandLogo compact style={{ width: 96, backgroundColor: brand.inkOn }} />
            <div style={{ color: "rgba(255,255,255,.72)", fontSize: 9, fontWeight: 500, letterSpacing: ".01em", lineHeight: 1.15, whiteSpace: "nowrap" }}>We’re in this together.</div>
          </div>
          <div style={{ minWidth: 0, width: "fit-content", maxWidth: "100%", justifySelf: "end", background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.18)", borderRadius: 12, padding: "7px 9px 8px" }}>
            <div title={householdName} style={{ fontSize: 11, color: "rgba(255,255,255,.76)", fontWeight: 800, letterSpacing: ".055em", textTransform: "uppercase", textAlign: "center", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                    border: activeUser === u ? "1px solid rgba(255,255,255,.78)" : "1px solid rgba(255,255,255,.22)",
                    background: activeUser === u ? "rgba(255,255,255,.16)" : "transparent",
                    color: brand.inkOn,
                    borderRadius: 999,
                    padding: "5px 9px",
                    minHeight: 30,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    lineHeight: 1,
                    fontFamily: "'DM Sans', -apple-system, sans-serif",
                    fontWeight: activeUser === u ? 700 : 500,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  <WithMark id={profileWithmark(u)} size={15} color={activeUser === u ? brand.inkOn : "rgba(255,255,255,.72)"} />
                  <span style={{ display: "block", lineHeight: 1 }}>{u}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "1.05rem 1rem", paddingBottom: NAV_H + 36 }}>
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
            timeZone={timeZone}
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
            openGoals={() => setTab("goals")}
            openProfile={() => setTab("profile")}
            walkthrough={walkthrough}
            updateWalkthrough={updateWalkthrough}
            deleteFood={deleteFood}
            editLoggedFood={editLoggedFood}
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
            logBusy={logBusy}
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
            editingFoodId={editingFoodId}
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
            deleteFood={deleteFood}
            weightInput={weightInput}
            setWeightInput={setWeightInput}
            weightDate={weightDate}
            setWeightDate={setWeightDate}
            weightError={weightError}
            addWeight={addWeight}
            deleteWeight={deleteWeight}
            actName={actName}
            editingActivityId={editingActivityId}
            editActivity={editActivity}
            cancelActivityEdit={cancelActivityEdit}
            activityError={activityError}
            setActName={setActName}
            actCals={actCals}
            setActCals={setActCals}
            actDate={actDate}
            setActDate={setActDate}
            addActivity={addActivity}
            deleteActivity={deleteActivity}
            waterOz={waterOz}
            waterError={waterError}
            setWaterOz={setWaterOz}
            waterDate={waterDate}
            setWaterDate={setWaterDate}
            waterShortcuts={waterShortcuts}
            addWater={addWater}
            stepsInput={stepsInput}
            stepsError={stepsError}
            setStepsInput={setStepsInput}
            stepsDate={stepsDate}
            setStepsDate={setStepsDate}
            saveSteps={saveSteps}
            profileColor={profileColor}
            profileText={profileText}
            walkthrough={walkthrough}
            updateWalkthrough={updateWalkthrough}
            styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton }}
          />
        )}

        {tab === "trends" && (
          <TrendsTab
            activeUser={activeUser}
            data={data}
            today={today}
            goalInfo={goalInfo}
            profileColor={profileColor}
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
            goalStatementInput={goalStatementInput}
            setGoalStatementInput={setGoalStatementInput}
            goalDateInput={goalDateInput}
            goalError={goalError}
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
            tWater={tWater}
            setTWater={setTWater}
            tSteps={tSteps}
            setTSteps={setTSteps}
            saveGoal={saveGoal}
            saveTargets={saveTargets}
            profileColor={profileColor}
            profileText={profileText}
            fmtGoalDate={fmtGoalDate}
            walkthrough={walkthrough}
            updateWalkthrough={updateWalkthrough}
            styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton }}
          />
        )}

        {tab === "profile" && (
          <ProfileTab
            activeUser={activeUser}
            data={data}
            session={session}
            timeZone={timeZone}
            deviceTimeZone={deviceTimeZone}
            saveTimeZone={saveTimeZone}
            waterShortcuts={waterShortcuts}
            saveWaterShortcuts={saveWaterShortcuts}
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
            profileWithmarks={profileWithmarks}
            profileWithmark={profileWithmark}
            withmarkOptions={WITHMARK_OPTIONS}
            profileColorOptions={PROFILE_COLORS}
            saveProfileColor={saveProfileColor}
            saveProfileWithmark={saveProfileWithmark}
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
            signOut={async () => { const { error } = await supabase.auth.signOut(); if (error) setAccountError(friendlyError(error, "We couldn’t sign you out. Try again.")); }}
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <CheckMark size={15} color={SURFACE} />
            {toast}
          </span>
        </div>
      )}

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: brand.teal, borderTop: `1px solid ${brand.tealDark}`,
        paddingBottom: "env(safe-area-inset-bottom)", zIndex: 10, boxShadow: "0 -2px 10px rgba(23,78,73,.10)",
      }}>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", height: NAV_H }}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => id === "log" ? openLog(logTab) : setTab(id)} style={{
                flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3,
                color: active ? brand.inkOn : "rgba(255,255,255,.62)",
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
