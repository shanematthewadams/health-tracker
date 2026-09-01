import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { BrandLogo, BrandLoading, brand } from "./brand.jsx";
import { WithMark, WITHMARK_OPTIONS } from "./WithMarks.jsx";

const BG = brand.bg;
const SURFACE = brand.surface;
const SURFACE_2 = brand.surfaceSoft;
const BORDER = brand.border;
const TEXT = brand.text;
const TEXT_MUTED = brand.textMuted;
const WARN = brand.warn;
const ACCENT = brand.teal;
const ACCENT_TEXT = brand.inkOn;
const PROFILE_COLORS = ["#F06A24","#7047EB","#4C6EF5","#E7685B","#D99524","#D95B83","#4658C9","#9B88D8"];

function friendlyOnboardingError(error, fallback) {
  const raw = String(error?.message || error || "").toLowerCase();
  if (raw.includes("invalid") && raw.includes("invite")) return "That invite doesn’t look right. Check the code and try again.";
  if (raw.includes("duplicate") || raw.includes("unique")) return "That name is already being used in this With.";
  if (raw.includes("network") || raw.includes("fetch")) return "We couldn’t connect to With. Check your connection and try again.";
  return fallback;
}

const inputStyle = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  color: TEXT,
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 16,
  width: "100%",
  minHeight: 46,
  boxShadow: "0 1px 0 rgba(45,35,25,.03)",
};

const fieldLabel = {
  fontSize: 12,
  color: TEXT_MUTED,
  marginBottom: 6,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const primaryButton = {
  background: ACCENT,
  color: ACCENT_TEXT,
  border: "none",
  borderRadius: 10,
  padding: "12px 18px",
  minHeight: 46,
  fontWeight: 700,
  fontSize: 15,
  width: "100%",
  fontFamily: "'DM Sans', -apple-system, sans-serif",
  
};

const secondaryButton = {
  ...primaryButton,
  background: SURFACE_2,
  color: TEXT,
  border: `1px solid ${BORDER}`,
};

function ScreenShell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: brand.teal,
        color: TEXT,
        display: "grid",
        placeItems: "center",
        padding: 20,
        fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,500;1,6..72,600;1,6..72,700&display=swap'); * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; } body { margin: 0; } input, select, textarea, button { font-family: inherit; } button { cursor: pointer; } button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid rgba(31,94,87,.18); outline-offset: 2px; }`}</style>
      <div
        style={{
          background: brand.bg,
          border: "1px solid rgba(255,255,255,.16)",
          borderRadius: 20,
          padding: "1.5rem",
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 18px 48px rgba(17,50,46,.22)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function BrandIntro({ eyebrow }) {
  return (
    <>
      <BrandLogo style={{ width: 132, marginBottom: 12 }} />
      {eyebrow && <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.45, marginBottom: 22 }}>{eyebrow}</div>}
    </>
  );
}

function OnboardingScreen({ onComplete, initialInviteCode = "", inviterName = "" }) {
  const [mode, setMode] = useState(initialInviteCode ? "join" : null);
  const [householdName, setHouseholdName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("membership");
  const [profileId, setProfileId] = useState(null);
  const [profileColor, setProfileColor] = useState(PROFILE_COLORS[2]);
  const [profileWithmark, setProfileWithmark] = useState("star");
  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  function goBack() {
    setMode(null);
    setError("");
    setHouseholdName("");
    setInviteCode(initialInviteCode);
  }

  async function createHousehold(event) {
    event.preventDefault();
    const cleanHouseholdName = householdName.trim();
    const cleanProfileName = profileName.trim();

    if (!cleanHouseholdName || !cleanProfileName) return;

    setBusy(true);
    setError("");

    const { error: createError } = await supabase.rpc("create_household", {
      household_name: cleanHouseholdName,
      profile_name: cleanProfileName,
    });

    if (createError) {
      setError(friendlyOnboardingError(createError, "We couldn’t create your With. Try again."));
      setBusy(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: createdProfile } = await supabase.from("profiles").select("id").eq("user_id", user?.id).limit(1).maybeSingle();
    setProfileId(createdProfile?.id || null);
    setStep("personalize");
    setBusy(false);
  }

  async function joinHousehold(event) {
    event.preventDefault();
    const cleanCode = inviteCode.trim().toUpperCase();
    const cleanProfileName = profileName.trim();

    if (!cleanCode || !cleanProfileName) return;

    setBusy(true);
    setError("");

    const { error: joinError } = await supabase.rpc("join_household", {
      invite_code_input: cleanCode,
      profile_name: cleanProfileName,
    });

    if (joinError) {
      setError(friendlyOnboardingError(joinError, "We couldn’t join that With. Check the invite and try again."));
      setBusy(false);
      return;
    }

    localStorage.removeItem("with-pending-invite");
    localStorage.removeItem("with-pending-inviter");
    const { data: { user } } = await supabase.auth.getUser();
    const { data: joinedProfile } = await supabase.from("profiles").select("id").eq("user_id", user?.id).limit(1).maybeSingle();
    setProfileId(joinedProfile?.id || null);
    setStep("personalize");
    setBusy(false);
  }

  async function finishPersonalization() {
    setBusy(true); setError("");
    try {
      if (profileId) {
        const { error: profileError } = await supabase.from("profiles").update({ profile_color: profileColor, profile_withmark: profileWithmark }).eq("id", profileId);
        if (profileError) throw profileError;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const currentData = user?.user_metadata || {};
      const { error: userError } = await supabase.auth.updateUser({ data: { ...currentData, timezone: deviceTimeZone } });
      if (userError) throw userError;
      await onComplete();
    } catch (saveError) {
      setError(friendlyOnboardingError(saveError, "We couldn’t save that. Try again.")); setBusy(false);
    }
  }

  if (step === "personalize") {
    return (
      <ScreenShell>
        <BrandIntro eyebrow="A little piece of With that’s yours." />
        <div style={{ fontFamily: "\'Newsreader\', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05, marginBottom: 8 }}>This is you in With.</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>Pick a color and a Withmark, or keep what we chose. You can change either one later.</div>
        <div style={{ ...fieldLabel, marginBottom: 9 }}>Your color</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8, marginBottom: 20 }}>
          {PROFILE_COLORS.map((color) => <button key={color} type="button" aria-label={"Choose " + color} onClick={() => setProfileColor(color)} style={{ width: "100%", aspectRatio: "1", borderRadius: "50%", background: color, border: profileColor === color ? "3px solid " + TEXT : "3px solid transparent", boxShadow: profileColor === color ? "0 0 0 2px " + SURFACE : "none" }} />)}
        </div>
        <div style={{ ...fieldLabel, marginBottom: 9 }}>Your Withmark</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 20 }}>
          {WITHMARK_OPTIONS.map(({ id, name }) => <button key={id} type="button" aria-label={name} title={name} onClick={() => setProfileWithmark(id)} style={{ minHeight: 42, display: "grid", placeItems: "center", borderRadius: 10, background: profileWithmark === id ? profileColor : SURFACE, color: profileWithmark === id ? "#fff" : TEXT, border: "1px solid " + (profileWithmark === id ? profileColor : BORDER) }}><WithMark id={id} size={20} /></button>)}
        </div>
        <div style={{ background: SURFACE_2, border: "1px solid " + BORDER, borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: profileColor, color: "#fff", display: "grid", placeItems: "center" }}><WithMark id={profileWithmark} size={23} /></div>
          <div><div style={{ fontWeight: 700 }}>{profileName || "You"}</div><div style={{ color: TEXT_MUTED, fontSize: 12 }}>{deviceTimeZone.replaceAll("_", " ")}</div></div>
        </div>
        {error && <div role="alert" style={{ color: WARN, fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button type="button" disabled={busy} onClick={finishPersonalization} style={{ ...primaryButton, opacity: busy ? .65 : 1 }}>{busy ? "Saving…" : "Continue to Today"}</button>
      </ScreenShell>
    );
  }

  if (!mode && !initialInviteCode) {
    return (
      <ScreenShell>
        <BrandIntro eyebrow="We’re in this together." />
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600, lineHeight: 1.05, marginBottom: 10 }}>Take care of yourself. With people who care about you.</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.55, marginBottom: 12 }}>
          With is a private place to track things like food, movement, water, weight and everyday intentions alongside people you trust.
        </div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.55, marginBottom: 22 }}>
          Everyone has their own goals. You’re simply doing life together.
        </div>
        <button type="button" onClick={() => setMode("create")} style={{ ...primaryButton, marginBottom: 10 }}>Start a new With</button>
        <button type="button" onClick={() => setMode("join")} style={secondaryButton}>I have an invite code</button>
      </ScreenShell>
    );
  }

  const isCreate = mode === "create";

  return (
    <ScreenShell>
      <BrandIntro eyebrow={isCreate ? "Start with yourself. Add your people when you’re ready." : "Your goals are still yours. You’ll just have company."} />
      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05, marginBottom: 8 }}>
        {isCreate ? "Who are you with?" : inviterName ? `${inviterName} invited you to With.` : "Join a With"}
      </div>
      <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
        {isCreate
          ? "A With is your private space with the people you choose. Give it a name, then tell us what to call you."
          : initialInviteCode
            ? inviterName
              ? `You’ll each track your own health and goals. With gives you a private place to share the experience and support each other.`
              : "You’ve been invited to join this With. Create your own health profile to continue."
            : "Enter the invite code you received, then create your own health profile."}
      </div>

      <form onSubmit={isCreate ? createHousehold : joinHousehold}>
        {isCreate ? (
          <>
            <div style={fieldLabel}>What should we call your With?</div>
            <input
              type="text"
              maxLength={40}
              required
              autoFocus
              placeholder="e.g. Shane & Alli, The Adamses, Morning Crew"
              value={householdName}
              onChange={(event) => setHouseholdName(event.target.value)}
              style={{ ...inputStyle, marginBottom: 14 }}
            />
          </>
        ) : !initialInviteCode ? (
          <>
            <div style={fieldLabel}>Invite code</div>
            <input
              type="text"
              required
              autoFocus
              autoCapitalize="characters"
              placeholder="e.g. A7K2M9QX"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              style={{ ...inputStyle, marginBottom: 14, textTransform: "uppercase" }}
            />
          </>
        ) : null}

        <div style={fieldLabel}>What should we call you?</div>
        <input
          type="text"
          maxLength={40}
          required
          placeholder="Your name"
          value={profileName}
          onChange={(event) => setProfileName(event.target.value)}
          style={{ ...inputStyle, marginBottom: 8 }}
        />
        <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginBottom: 16 }}>
          Your profile is yours. Your goals don’t have to match anyone else’s, even when you’re doing this together.
        </div>

        {error && (
          <div role="alert" style={{ color: WARN, fontSize: 13, lineHeight: 1.4, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={busy} style={{ ...primaryButton, opacity: busy ? 0.65 : 1, marginBottom: 8 }}>
          {busy ? "Setting things up…" : isCreate ? "Create my With" : inviterName ? `Join ${inviterName}’s With` : "Join With"}
        </button>
        <button type="button" onClick={goBack} disabled={busy} style={{ background: "none", border: "none", color: TEXT_MUTED, width: "100%", padding: 9, fontSize: 13 }}>
          Back
        </button>
      </form>
    </ScreenShell>
  );
}

export default function OnboardingGate({ children }) {
  const params = new URLSearchParams(window.location.search);
  const inviteFromUrl = params.get("invite")?.trim().toUpperCase() || "";
  const inviterFromUrl = params.get("inviter")?.trim() || "";
  const initialInviteCode = inviteFromUrl || localStorage.getItem("with-pending-invite") || "";
  const initialInviterName = inviterFromUrl || localStorage.getItem("with-pending-inviter") || "";
  const [session, setSession] = useState(null);
  const sessionRef = useRef(null);
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkError, setCheckError] = useState("");

  useEffect(() => {
    if (inviteFromUrl) localStorage.setItem("with-pending-invite", inviteFromUrl);
    if (inviterFromUrl) localStorage.setItem("with-pending-inviter", inviterFromUrl);
  }, [inviteFromUrl, inviterFromUrl]);

  async function checkMembership(nextSession) {
    if (!nextSession?.user) {
      sessionRef.current = null;
      setSession(null);
      setNeedsOnboarding(false);
      setCheckError("");
      setChecking(false);
      return;
    }

    sessionRef.current = nextSession;
    setSession(nextSession);
    setChecking(true);
    setCheckError("");

    const { data, error } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", nextSession.user.id)
      .limit(1);

    if (error) {
      setCheckError(friendlyOnboardingError(error, "We couldn’t load your With. Try again."));
      setNeedsOnboarding(false);
    } else {
      setNeedsOnboarding(!data?.length);
    }

    setChecking(false);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (mounted) checkMembership(currentSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem("with-password-recovery", "1");
        sessionRef.current = nextSession;
        setSession(nextSession);
        setNeedsOnboarding(false);
        setCheckError("");
        setChecking(false);
        return;
      }

      if (event === "SIGNED_OUT") {
        checkMembership(nextSession);
        return;
      }

      if (event === "SIGNED_IN") {
        const currentSession = sessionRef.current;
        const changedUser = currentSession?.user?.id && nextSession?.user?.id && currentSession.user.id !== nextSession.user.id;
        if (changedUser || !currentSession) {
          checkMembership(nextSession);
        } else {
          sessionRef.current = nextSession;
          setSession(nextSession);
        }
        return;
      }

      // TOKEN_REFRESHED, USER_UPDATED and other routine auth events should not
      // blank the app or re-run onboarding checks. Keep the session current silently.
      sessionRef.current = nextSession;
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function finishOnboarding() {
    if (!session) return;
    await checkMembership(session);
  }

  if (checking && session) {
    return <BrandLoading>Getting your With ready…</BrandLoading>;
  }

  if (checkError && session) {
    return (
      <ScreenShell>
        <BrandIntro eyebrow="We’re in this together." />
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 25, fontWeight: 600, marginBottom: 10 }}>We couldn’t load your With.</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>Nothing has been changed. Try signing out and back in.</div>
        <div role="alert" style={{ color: WARN, fontSize: 13, marginBottom: 14 }}>{checkError}</div>
        <button type="button" onClick={() => supabase.auth.signOut()} style={secondaryButton}>Sign out</button>
      </ScreenShell>
    );
  }

  if (session && needsOnboarding) {
    return <OnboardingScreen onComplete={finishOnboarding} initialInviteCode={initialInviteCode} inviterName={initialInviterName} />;
  }

  return children;
}
