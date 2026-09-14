import { useEffect, useState } from "react";
import { Heart, Timer } from "lucide-react";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";

function elapsedLabel(startedAt, now) {
  const ms = Math.max(0, now - new Date(startedAt).getTime());
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function startedLabel(startedAt, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startedAt));
}

export default function SharedActiveFastCard({ activeFast, personName, timeZone, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, SURFACE, SURFACE_2, cardStyle } = styles;
  const [now, setNow] = useState(Date.now());
  const [senderProfileId, setSenderProfileId] = useState(null);
  const [supportSent, setSupportSent] = useState(false);
  const [supportBusy, setSupportBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError("");
      setSupportSent(false);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || cancelled) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profileError || !profile?.id) {
        setError("Support isn’t available right now.");
        return;
      }
      setSenderProfileId(profile.id);

      const { data: existing, error: supportError } = await supabase
        .from("fasting_supports")
        .select("id")
        .eq("fasting_entry_id", activeFast.id)
        .eq("sender_profile_id", profile.id)
        .maybeSingle();
      if (cancelled) return;
      if (supportError) {
        setError("Support isn’t available right now.");
        return;
      }
      setSupportSent(Boolean(existing?.id));
    })();
    return () => { cancelled = true; };
  }, [activeFast.id]);

  async function sendSupport() {
    if (!senderProfileId || supportBusy || supportSent) return;
    setSupportBusy(true);
    setError("");
    const { error: sendError } = await supabase
      .from("fasting_supports")
      .insert({
        fasting_entry_id: activeFast.id,
        sender_profile_id: senderProfileId,
        recipient_profile_id: activeFast.profile_id,
      });

    if (sendError && sendError.code !== "23505") {
      setError("We couldn’t send support. Try again.");
    } else {
      setSupportSent(true);
    }
    setSupportBusy(false);
  }

  return (
    <section style={{ ...cardStyle, marginBottom: 22, padding: "1.15rem", borderTop: `3px solid ${brand.teal}`, background: SURFACE }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <Timer size={15} color={brand.teal} strokeWidth={2} />
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".11em", fontWeight: 800, color: TEXT_MUTED }}>Active fast</div>
      </div>
      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 24, fontWeight: 600, color: TEXT, lineHeight: 1.12 }}>
        {personName} is fasting
      </div>
      <div className="num" style={{ fontSize: 27, fontWeight: 800, color: TEXT, marginTop: 9 }}>
        {elapsedLabel(activeFast.started_at, now)}
      </div>
      <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 2 }}>
        Started {startedLabel(activeFast.started_at, timeZone)}
      </div>

      <button
        type="button"
        disabled={supportBusy || supportSent}
        onClick={sendSupport}
        style={{
          marginTop: 14,
          width: "100%",
          minHeight: 42,
          border: `1px solid ${supportSent ? BORDER : brand.teal}`,
          borderRadius: 9,
          background: supportSent ? SURFACE_2 : brand.teal,
          color: supportSent ? TEXT_MUTED : brand.inkOn,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          fontSize: 13,
          fontWeight: 800,
          opacity: supportBusy ? 0.65 : 1,
        }}
      >
        <Heart size={15} strokeWidth={2} />
        {supportBusy ? "Sending…" : supportSent ? "Support sent" : "Send support"}
      </button>
      {error && <div role="alert" style={{ color: "#A64B43", fontSize: 11, marginTop: 8 }}>{error}</div>}
    </section>
  );
}
