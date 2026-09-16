import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables.");
}

const RECOVERY_FLAG = "with-password-recovery";
const RECOVERY_STARTED_AT = "with-password-recovery-started-at";
const RECOVERY_QUERY_PARAM = "password-recovery";
const RECOVERY_MAX_AGE_MS = 30 * 60 * 1000;

function recoveryReturnIsPresent() {
  if (typeof window === "undefined") return false;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get(RECOVERY_QUERY_PARAM) === "1" || hash.get("type") === "recovery";
}

function clearRecoveryState() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(RECOVERY_FLAG);
  sessionStorage.removeItem(RECOVERY_STARTED_AT);
}

function clearRecoveryMarkerFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(RECOVERY_QUERY_PARAM)) return;
  url.searchParams.delete(RECOVERY_QUERY_PARAM);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

if (typeof window !== "undefined") {
  const hasRecoveryFlag = sessionStorage.getItem(RECOVERY_FLAG) === "1";
  const startedAt = Number(sessionStorage.getItem(RECOVERY_STARTED_AT));
  const recoveryIsStale = Number.isFinite(startedAt) && Date.now() - startedAt > RECOVERY_MAX_AGE_MS;

  // A recovery flag should never follow someone back into an ordinary app load.
  // This clears the sticky state that could strand a person on the reset screen.
  if ((hasRecoveryFlag && !recoveryReturnIsPresent()) || recoveryIsStale) {
    clearRecoveryState();
    if (recoveryIsStale) clearRecoveryMarkerFromUrl();
  }
}

const client = createClient(supabaseUrl, supabaseKey);

// Keep email-confirmation links in the environment where signup started.
// Staging signups return to staging; production signups return to production.
const originalSignUp = client.auth.signUp.bind(client.auth);
client.auth.signUp = (credentials) => originalSignUp({
  ...credentials,
  options: {
    ...credentials.options,
    emailRedirectTo: credentials.options?.emailRedirectTo || window.location.origin,
  },
});

// Give recovery links an explicit return marker. Supabase exchanges the recovery
// token on arrival; the marker lets a refresh stay in the recovery experience
// without letting an old sessionStorage flag trap future sign-ins.
const originalResetPasswordForEmail = client.auth.resetPasswordForEmail.bind(client.auth);
client.auth.resetPasswordForEmail = (email, options = {}) => {
  const redirectUrl = new URL(options.redirectTo || window.location.origin, window.location.origin);
  redirectUrl.searchParams.set(RECOVERY_QUERY_PARAM, "1");
  return originalResetPasswordForEmail(email, { ...options, redirectTo: redirectUrl.toString() });
};

// During password recovery, end only this browser session. Normal sign-out calls
// keep their existing Supabase behavior.
const originalSignOut = client.auth.signOut.bind(client.auth);
client.auth.signOut = (options = {}) => {
  const nextOptions = recoveryReturnIsPresent() && !options?.scope
    ? { ...options, scope: "local" }
    : options;
  return originalSignOut(nextOptions);
};

client.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    sessionStorage.setItem(RECOVERY_STARTED_AT, String(Date.now()));
  }
  if (event === "SIGNED_OUT") {
    clearRecoveryState();
    clearRecoveryMarkerFromUrl();
  }
});

export const supabase = client;
