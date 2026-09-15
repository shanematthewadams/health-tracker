import { useEffect, useState } from "react";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";

function Toggle({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 25,
        borderRadius: 999,
        border: "none",
        padding: 3,
        background: checked ? brand.teal : "#D7D7D2",
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        flexShrink: 0,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{ width: 19, height: 19, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
    </button>
  );
}

export default function SupportPreferencePanel({ session, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, WARN } = styles;
  const [profileId, setProfileId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!session?.user?.id) return;
      setLoading(true);
      setError("");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,support_enabled")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (profileError) {
        console.error("Could not load support preference", profileError);
        setError("We couldn’t load your support setting. Try again.");
        setLoading(false);
        return;
      }

      setProfileId(profile?.id || "");
      setEnabled(profile?.support_enabled !== false);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  async function setSupportEnabled(nextEnabled) {
    if (!profileId || busy) return;
    const previous = enabled;
    setEnabled(nextEnabled);
    setBusy(true);
    setError("");

    const { error: saveError } = await supabase
      .from("profiles")
      .update({ support_enabled: nextEnabled })
      .eq("id", profileId);

    if (saveError) {
      console.error("Could not save support preference", saveError);
      setEnabled(previous);
      setError("We couldn’t save that support setting. Try again.");
    } else {
      window.dispatchEvent(new CustomEvent("with-support-preference-changed", { detail: { enabled: nextEnabled } }));
    }
    setBusy(false);
  }

  if (loading || !profileId) return null;

  return (
    <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>Support</div>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 21, fontWeight: 600, lineHeight: 1.2, color: TEXT }}>Get support from people you’re With.</div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>
            When this is on, people you’re With can leave you a short note of encouragement on Today. Turn it off anytime.
          </div>
          {!enabled && (
            <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, marginTop: 8 }}>
              People you’re With won’t see the support prompt for you. Notes you’ve already received stay put.
            </div>
          )}
        </div>
        <Toggle
          checked={enabled}
          disabled={busy}
          onChange={setSupportEnabled}
          label={`${enabled ? "Turn off" : "Turn on"} support from people you’re With`}
        />
      </div>
      {error && <div role="alert" style={{ color: WARN, fontSize: 11, marginTop: 10 }}>{error}</div>}
    </section>
  );
}
