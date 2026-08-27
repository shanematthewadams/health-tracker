import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const BG = "#FCFCFB";
const SURFACE = "#FFFFFF";
const SURFACE_2 = "#F4F6F8";
const BORDER = "#D8DDE5";
const TEXT = "#1C2430";
const TEXT_MUTED = "#68717D";
const WARN = "#C83D34";
const ACCENT = "#D9825B";
const ACCENT_TEXT = "#3C2418";

const inputStyle = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  color: TEXT,
  borderRadius: 8,
  padding: "12px 14px",
  fontSize: 16,
  width: "100%",
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
  borderRadius: 8,
  padding: "13px 18px",
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
        background: BG,
        color: TEXT,
        display: "grid",
        placeItems: "center",
        padding: 20,
        fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,500;6..72,600;6..72,700&display=swap'); * { box-sizing: border-box; } body { margin: 0; } input, button { font-family: inherit; } button { cursor: pointer; }`}</style>
      <div
        style={{
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: "1.4rem",
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 2px 8px rgba(28,36,48,.045)",
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
      <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", fontWeight: 700, fontSize: 32, lineHeight: 1, marginBottom: 6 }}>With</div>
      {eyebrow && <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 20 }}>{eyebrow}</div>}
    </>
  );
}

function OnboardingScreen({ onComplete }) {
  const [mode, setMode] = useState(null);
  const [householdName, setHouseholdName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function goBack() {
    setMode(null);
    setError("");
    setHouseholdName("");
    setInviteCode("");
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
      setError(createError.message);
      setBusy(false);
      return;
    }

    await onComplete();
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
      setError(joinError.message);
      setBusy(false);
      return;
    }

    await onComplete();
    setBusy(false);
  }

  if (!mode) {
    return (
      <ScreenShell>
        <BrandIntro eyebrow="We’re in this together." />
        <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", fontSize: 28, fontWeight: 600, lineHeight: 1.08, marginBottom: 10 }}>Who are you with?</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginBottom: 22 }}>
          With is a private place to track your own health alongside people you trust. Your goals and health information stay yours.
        </div>
        <button type="button" onClick={() => setMode("create")} style={{ ...primaryButton, marginBottom: 10 }}>Start your With</button>
        <button type="button" onClick={() => setMode("join")} style={secondaryButton}>Join someone</button>
      </ScreenShell>
    );
  }

  const isCreate = mode === "create";

  return (
    <ScreenShell>
      <BrandIntro eyebrow={isCreate ? "Start with yourself. Add your people when you’re ready." : "Your goals are still yours. You’ll just have company."} />
      <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", fontSize: 27, fontWeight: 600, lineHeight: 1.08, marginBottom: 8 }}>
        {isCreate ? "Create your With" : "Join a With"}
      </div>
      <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
        {isCreate
          ? "Give your private space a name, then create your own health profile."
          : "Enter the invite code you received, then create your own health profile."}
      </div>

      <form onSubmit={isCreate ? createHousehold : joinHousehold}>
        {isCreate ? (
          <>
            <div style={fieldLabel}>Name your With</div>
            <input
              type="text"
              maxLength={40}
              required
              autoFocus
              placeholder="e.g. Shane & Alli"
              value={householdName}
              onChange={(event) => setHouseholdName(event.target.value)}
              style={{ ...inputStyle, marginBottom: 14 }}
            />
          </>
        ) : (
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
        )}

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
          This creates your personal profile. Your goals, nutrition targets, activity and other health information belong to you.
        </div>

        {error && (
          <div role="alert" style={{ color: WARN, fontSize: 13, lineHeight: 1.4, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={busy} style={{ ...primaryButton, opacity: busy ? 0.65 : 1, marginBottom: 8 }}>
          {busy ? "Setting things up…" : isCreate ? "Create my With" : "Join With"}
        </button>
        <button type="button" onClick={goBack} disabled={busy} style={{ background: "none", border: "none", color: TEXT_MUTED, width: "100%", padding: 9, fontSize: 13 }}>
          Back
        </button>
      </form>
    </ScreenShell>
  );
}

export default function OnboardingGate({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkError, setCheckError] = useState("");

  async function checkMembership(nextSession) {
    if (!nextSession?.user) {
      setSession(null);
      setNeedsOnboarding(false);
      setCheckError("");
      setChecking(false);
      return;
    }

    setSession(nextSession);
    setChecking(true);
    setCheckError("");

    const { data, error } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", nextSession.user.id)
      .limit(1);

    if (error) {
      setCheckError(error.message);
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
        setSession(nextSession);
        setNeedsOnboarding(false);
        setCheckError("");
        setChecking(false);
        return;
      }

      checkMembership(nextSession);
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
    return (
      <div style={{ minHeight: "100vh", background: BG, color: TEXT_MUTED, padding: "3rem", textAlign: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
        getting your With ready…
      </div>
    );
  }

  if (checkError && session) {
    return (
      <ScreenShell>
        <BrandIntro eyebrow="We’re in this together." />
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 25, fontWeight: 600, marginBottom: 10 }}>We couldn’t load your With.</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>Nothing has been changed. Try signing out and back in.</div>
        <div style={{ color: WARN, fontSize: 12, marginBottom: 14 }}>{checkError}</div>
        <button type="button" onClick={() => supabase.auth.signOut()} style={secondaryButton}>Sign out</button>
      </ScreenShell>
    );
  }

  if (session && needsOnboarding) {
    return <OnboardingScreen onComplete={finishOnboarding} />;
  }

  return children;
}
