import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { brand } from "../brand.jsx";

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
  const { TEXT, TEXT_MUTED, SURFACE, cardStyle } = styles;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

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
    </section>
  );
}
