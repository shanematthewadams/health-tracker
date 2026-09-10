import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { BrandLogo, BrandLoading, brand } from "./brand.jsx";
import { WithMark, WITHMARK_OPTIONS } from "./WithMarks.jsx";

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

function OnboardingScreen({ onComplete }) {
  const [mode, setMode] = useState(null);
  const [householdName, setHouseholdName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [existingProfile, setExistingProfile] = useState(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("membership");
  const [profileId, setProfileId] = useState(null);
  const [profileColor, setProfileColor] = useState(PROFILE_COLORS[2]);
  const [profileWithmark, setProfileWithmark] = useState("star");
  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  useEffect(() => {
    let cancelled = false;
    async function loadExistingProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id || cancelled) {
        if (!cancelled) setExistingProfile(null);
        return;
      }
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, profile_color, profile_withmark")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (profileError) {
        setError("We couldn’t load your profile. Try again.");
        setExistingProfile(null);
        return;
      }
      setExistingProfile(data || null);
      if (data?.name) setProfileName(data.name);
    }
    loadExistingProfile();
    return () => { cancelled = true; };
  }, []);

  async function createHousehold(event) {
    event.preventDefault();
    const cleanHouseholdName = householdName.trim();
    const cleanProfileName = profileName.trim();

    if (!cleanHouseholdName || (!existingProfile && !cleanProfileName)) return;

    setBusy(true);
    setError("");

    const { error: createError } = await supabase.rpc("create_with_v2", {
      with_name: cleanHouseholdName,
      profile_name: existingProfile ? null : cleanProfileName,
    });

    if (createError) {
      setError(friendlyOnboardingError(createError, "We couldn’t create your With. Try again."));
      setBusy(false);
      return;
    }

    if (existingProfile) {
      await onComplete();
      setBusy(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: createdProfile } = await supabase.from("profiles").select("id").eq("user_id", user?.id).limit(1).maybeSingle();
    setProfileId(createdProfile?.id || null);
    setStep("personalize");
    setBusy(false);
  }

  async function finishPersonalization() {
    setBusy(true);
    setError("");
    try {
      if (profileId) {
        const { error: profileError } = await supabase.from("profiles").update({ profile_color: profileColor, profile_withmark: profileWithmark }).eq("id", profileId);
        if (profileError) throw profileError;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const currentData = user?.user_metadata || {};
      const { error: userError } = await supabase.auth.updateUser({ data: { ...currentData, timezone: deviceTimeZone } });
      if (userError) throw userError;
      localStorage.setItem("with-first-today-pending", "1");
      localStorage.setItem("with-walkthrough-state", JSON.stringify({ active: true, logIntroSeen: false, goalsIntroSeen: false, firstLogDone: false, todaySoFarSeen: false }));
      await onComplete();
    } catch (saveError) {
      setError(friendlyOnboardingError(saveError, "We couldn’t save that. Try again."));
      setBusy(false);
    }
  }

  if (existingProfile === undefined) return <BrandLoading>Getting your profile ready…</BrandLoading>;

  if (step === "personalize") {
    return (
      <ScreenShell>
        <BrandIntro eyebrow="A little piece of With that’s yours." />
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05, marginBottom: 8 }}>This is you in With.</div>
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

  if (!mode) {
    return (
      <ScreenShell>
        <BrandIntro eyebrow="We’re in this together." />
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600, lineHeight: 1.05, marginBottom: 10 }}>
          {existingProfile ? "You’re between Withs." : "Take care of yourself. With people who care about you."}
        </div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.55, marginBottom: 12 }}>
          {existingProfile
            ? `Your profile${existingProfile.name ? ` as ${existingProfile.name}` : ""} and your health history are still here. Start a new With or join one from an invitation whenever you’re ready.`
            : "With is a private place to track things like food, movement, water, weight and everyday intentions alongside people you trust."}
        </div>
        {!existingProfile && (
          <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.55, marginBottom: 22 }}>
            Everyone has their own goals. You’re simply doing life together.
          </div>
        )}
        <button type="button" onClick={() => setMode("create")} style={{ ...primaryButton, marginBottom: 12 }}>Start a new With</button>
        <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, textAlign: "center" }}>
          Have an invitation? Open the invitation link from your email. Invitations are private and tied to the email address they were sent to.
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <BrandIntro eyebrow={existingProfile ? "Your profile stays yours. This just gives it a new place to belong." : "Start with yourself. Add your people when you’re ready."} />
      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05, marginBottom: 8 }}>Who are you with?</div>
      <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
        A With is your private space with the people you choose. Give it a name{existingProfile ? ". Your existing profile and health history come with you." : ", then tell us what to call you."}
      </div>

      <form onSubmit={createHousehold}>
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

        {existingProfile ? (
          <div style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 13, marginBottom: 16 }}>
            <div style={{ ...fieldLabel, marginBottom: 4 }}>Your profile</div>
            <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>{existingProfile.name || "Your existing profile"}</div>
            <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginTop: 4 }}>Your goals and health history stay exactly as they are.</div>
          </div>
        ) : (
          <>
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
          </>
        )}

        {error && (
          <div role="alert" style={{ color: WARN, fontSize: 13, lineHeight: 1.4, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={busy} style={{ ...primaryButton, opacity: busy ? 0.65 : 1, marginBottom: 8 }}>
          {busy ? "Setting things up…" : "Create my With"}
        </button>
        <button type="button" onClick={() => { setMode(null); setError(""); }} disabled={busy} style={{ background: "none", border: "none", color: TEXT_MUTED, width: "100%", padding: 9, fontSize: 13 }}>
          Back
        </button>
      </form>
    </ScreenShell>
  );
}

export default function OnboardingGate({ children }) {
  const [session, setSession] = useState(null);
  const sessionRef = useRef(null);
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkError, setCheckError] = useState("");

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
    return <OnboardingScreen onComplete={finishOnboarding} />;
  }

  return children;
}
