import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { BrandLogo, BrandLoading, brand } from "./brand.jsx";
import { WithMark, WITHMARK_OPTIONS } from "./WithMarks.jsx";
import { storeActiveWithId } from "./withMemberships.js";

const SURFACE = brand.surface;
const SURFACE_2 = brand.surfaceSoft;
const BORDER = brand.border;
const TEXT = brand.text;
const TEXT_MUTED = brand.textMuted;
const WARN = brand.warn;
const PROFILE_COLORS = ["#F06A24", "#7047EB", "#4C6EF5", "#E7685B", "#D99524", "#D95B83", "#4658C9", "#9B88D8"];

const inputStyle = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  color: TEXT,
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 16,
  width: "100%",
  minHeight: 46,
};

const primaryButton = {
  background: brand.teal,
  color: brand.inkOn,
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

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", minHeight: "100dvh", background: brand.teal, display: "grid", placeItems: "center", padding: 20, color: TEXT, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440, background: brand.bg, borderRadius: 20, padding: "1.5rem", boxShadow: "0 18px 48px rgba(17,50,46,.22)" }}>
        <BrandLogo style={{ width: 132, marginBottom: 14 }} />
        {children}
      </div>
    </div>
  );
}

function cleanPendingInvite() {
  localStorage.removeItem("with-pending-invite");
  localStorage.removeItem("with-pending-inviter");
  const url = new URL(window.location.href);
  url.searchParams.delete("invite");
  url.searchParams.delete("inviter");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

async function sha256(value) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function inviteErrorMessage(code) {
  if (code === "INVITE_EXPIRED") return "This invitation has expired. Ask the person who invited you to send a new one.";
  if (code === "INVITE_ALREADY_USED") return "This invitation has already been used.";
  if (code === "INVITE_EMAIL_MISMATCH") return "This invitation belongs to a different email address.";
  if (code === "INVITE_INVALID" || code === "INVITE_NOT_ACTIVE") return "This invitation is no longer valid.";
  return "We couldn’t use this invitation. Nothing has been changed.";
}

export default function InvitationGate({ children }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const inviteFromUrl = params.get("invite")?.trim() || "";
  const inviterFromUrl = params.get("inviter")?.trim() || "";
  const pendingInvite = inviteFromUrl || localStorage.getItem("with-pending-invite") || "";
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(Boolean(pendingInvite));
  const [inviteInfo, setInviteInfo] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const [existingProfile, setExistingProfile] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [profileColor, setProfileColor] = useState(PROFILE_COLORS[2]);
  const [profileWithmark, setProfileWithmark] = useState("star");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (inviteFromUrl) localStorage.setItem("with-pending-invite", inviteFromUrl);
    if (inviterFromUrl) localStorage.setItem("with-pending-inviter", inviterFromUrl);
  }, [inviteFromUrl, inviterFromUrl]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !session?.user || !pendingInvite || sessionStorage.getItem("with-password-recovery") === "1") {
      setCheckingInvite(false);
      return;
    }

    let cancelled = false;
    async function inspectInvite() {
      setCheckingInvite(true);
      setInviteError("");
      const [{ data: inspection, error: inspectError }, { data: profileRows, error: profileError }] = await Promise.all([
        supabase.functions.invoke("with-invitation", { body: { action: "inspect", token: pendingInvite } }),
        supabase.from("profiles").select("id, name").eq("user_id", session.user.id).limit(1),
      ]);
      if (cancelled) return;
      if (inspectError || inspection?.error) {
        setInviteError(inviteErrorMessage(inspection?.error));
        setCheckingInvite(false);
        return;
      }
      if (profileError) {
        setInviteError("We couldn’t load your profile for this invitation.");
        setCheckingInvite(false);
        return;
      }
      const profile = profileRows?.[0] || null;
      setExistingProfile(profile);
      setProfileName(profile?.name || "");
      setInviteInfo(inspection);
      setCheckingInvite(false);
    }
    inspectInvite();
    return () => { cancelled = true; };
  }, [authReady, session?.user?.id, pendingInvite]);

  async function acceptInvite() {
    if (!session?.user || !pendingInvite || busy) return;
    if (!existingProfile && !profileName.trim()) return;
    setBusy(true);
    setInviteError("");
    const tokenHash = await sha256(pendingInvite);
    const { data, error } = await supabase.rpc("accept_with_invitation_v2", {
      invitation_token_hash: tokenHash,
      profile_name: existingProfile ? null : profileName.trim(),
    });

    if (error) {
      const raw = String(error.message || "");
      const codes = ["INVITE_INVALID", "INVITE_ALREADY_USED", "INVITE_NOT_ACTIVE", "INVITE_EXPIRED", "INVITE_EMAIL_MISMATCH", "PROFILE_NAME_REQUIRED", "PROFILE_NAME_TOO_LONG"];
      setInviteError(inviteErrorMessage(codes.find((code) => raw.includes(code))));
      setBusy(false);
      return;
    }

    const result = data?.[0] || null;
    if (!existingProfile) {
      const { data: createdProfile } = await supabase.from("profiles").select("id").eq("user_id", session.user.id).limit(1).maybeSingle();
      if (createdProfile?.id) {
        await supabase.from("profiles").update({ profile_color: profileColor, profile_withmark: profileWithmark }).eq("id", createdProfile.id);
      }
      const currentData = session.user.user_metadata || {};
      await supabase.auth.updateUser({ data: { ...currentData, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" } });
      localStorage.setItem("with-first-today-pending", "1");
      localStorage.setItem("with-walkthrough-state", JSON.stringify({ active: true, logIntroSeen: false, goalsIntroSeen: false, firstLogDone: false, todaySoFarSeen: false }));
    }

    if (result?.household_id) storeActiveWithId(result.household_id);
    cleanPendingInvite();
    window.location.reload();
  }

  if (!pendingInvite || !authReady || !session || sessionStorage.getItem("with-password-recovery") === "1") return children;
  if (checkingInvite) return <BrandLoading>Checking your invitation…</BrandLoading>;

  if (inviteError && !inviteInfo) {
    return (
      <Shell>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 28, fontWeight: 600, lineHeight: 1.08, marginBottom: 10 }}>We couldn’t use this invitation.</div>
        <div role="alert" style={{ color: WARN, fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>{inviteError}</div>
        <button type="button" onClick={() => { cleanPendingInvite(); window.location.reload(); }} style={secondaryButton}>Continue to With</button>
      </Shell>
    );
  }

  const accountEmail = String(session.user.email || "").trim().toLowerCase();
  const inviteEmail = String(inviteInfo?.email || "").trim().toLowerCase();
  const wrongAccount = inviteEmail && accountEmail !== inviteEmail;

  if (wrongAccount) {
    return (
      <Shell>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 28, fontWeight: 600, lineHeight: 1.08, marginBottom: 10 }}>This invitation is for another email.</div>
        <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.55, marginBottom: 18 }}>It was sent to <strong style={{ color: TEXT }}>{inviteInfo.email}</strong>, but you’re signed in as <strong style={{ color: TEXT }}>{session.user.email}</strong>.</div>
        <button type="button" onClick={() => supabase.auth.signOut()} style={secondaryButton}>Sign out and use the invited account</button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 18 }}>{inviteInfo?.inviterName ? `${inviteInfo.inviterName} invited you.` : "You’ve been invited."}</div>
      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.08, marginBottom: 10 }}>Join {inviteInfo?.householdName || "this With"}.</div>
      <div style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.55, marginBottom: 20 }}>
        {existingProfile
          ? "Your profile and health history stay exactly as they are. You only log once. This simply adds another group of people you’re doing life With."
          : "Your health stays yours. Create your profile once, then you’ll be part of this With."}
      </div>

      {!existingProfile && (
        <>
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>What should we call you?</div>
          <input type="text" maxLength={40} value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Your name" style={{ ...inputStyle, marginBottom: 16 }} />
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Your color</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 7, marginBottom: 16 }}>
            {PROFILE_COLORS.map((color) => <button key={color} type="button" aria-label={`Choose ${color}`} onClick={() => setProfileColor(color)} style={{ width: "100%", aspectRatio: "1", borderRadius: "50%", background: color, border: profileColor === color ? `3px solid ${TEXT}` : "3px solid transparent" }} />)}
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Your Withmark</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 7, marginBottom: 18 }}>
            {WITHMARK_OPTIONS.map(({ id, name }) => <button key={id} type="button" aria-label={name} onClick={() => setProfileWithmark(id)} style={{ minHeight: 40, borderRadius: 10, background: profileWithmark === id ? profileColor : SURFACE, color: profileWithmark === id ? "#fff" : TEXT, border: `1px solid ${profileWithmark === id ? profileColor : BORDER}`, display: "grid", placeItems: "center" }}><WithMark id={id} size={19} /></button>)}
          </div>
        </>
      )}

      {inviteError && <div role="alert" style={{ color: WARN, fontSize: 13, lineHeight: 1.45, marginBottom: 12 }}>{inviteError}</div>}
      <button type="button" disabled={busy || (!existingProfile && !profileName.trim())} onClick={acceptInvite} style={{ ...primaryButton, opacity: busy || (!existingProfile && !profileName.trim()) ? .6 : 1 }}>{busy ? "Joining…" : `Join ${inviteInfo?.householdName || "this With"}`}</button>
    </Shell>
  );
}
