import { useState } from "react";
import withLogo from "./assets/brand/with-logo.svg";
import EditorialLine from "./components/EditorialLine.jsx";

const OPENING_MIN_DWELL_MS = 2500;
let initialOpeningStartedAt = null;
let initialOpeningFinished = false;

function beginInitialOpening() {
  if (initialOpeningFinished) return false;
  if (initialOpeningStartedAt === null) initialOpeningStartedAt = Date.now();
  return true;
}

export async function finishInitialOpening() {
  if (initialOpeningFinished) return;
  if (initialOpeningStartedAt === null) initialOpeningStartedAt = Date.now();
  const remaining = Math.max(0, OPENING_MIN_DWELL_MS - (Date.now() - initialOpeningStartedAt));
  if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
  initialOpeningFinished = true;
}

export const brand = {
  teal: "#1F5E57",
  tealDark: "#174E49",
  logoPrimary: "#1F5E57",
  logoDark: "#232321",
  logoLight: "#F9F7F5",
  sage: "#B7C8BF",
  clay: "#E08A6A",
  sun: "#F2C96D",
  stone: "#F1EEE8",
  bg: "#FCFBF8",
  surface: "#FFFFFF",
  surfaceSoft: "#F5F3EE",
  border: "#E7E3DB",
  text: "#171816",
  textMuted: "#5D615F",
  textSoft: "#8A8F94",
  warn: "#C83D34",
  inkOn: "#FFFFFF",
};

export const metricColors = {
  food: "#1F5E57",
  weight: "#D96C57",
  activity: "#6E9F8E",
  water: "#6E9DB5",
  steps: "#D9A642",
};

function logoMark(compact, style) {
  return (
    <span
      aria-label="With"
      role="img"
      style={{
        display: "inline-block",
        width: compact ? 76 : 138,
        aspectRatio: "3590 / 1620",
        backgroundColor: brand.logoPrimary,
        WebkitMaskImage: `url(${withLogo})`,
        maskImage: `url(${withLogo})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        ...style,
      }}
    />
  );
}

export function BrandLogo({ compact = false, style = {} }) {
  if (!compact) return logoMark(false, style);

  function goToToday() {
    const todayButton = Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Today");
    todayButton?.click();
  }

  return (
    <button
      type="button"
      aria-label="Go to Today"
      onClick={goToToday}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        padding: 0,
        margin: 0,
        lineHeight: 0,
        cursor: "pointer",
      }}
    >
      {logoMark(true, style)}
    </button>
  );
}

export function BrandLoading({ children = "Getting your With ready…" }) {
  const [showEditorialOpening] = useState(beginInitialOpening);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100vh",
        minHeight: "100dvh",
        background: brand.teal,
        color: "rgba(255,255,255,.78)",
        display: "grid",
        placeItems: "center",
        padding: 24,
        paddingTop: "calc(24px + env(safe-area-inset-top))",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: showEditorialOpening ? 460 : 320, textAlign: "center" }}>
        <BrandLogo style={{ width: 136, margin: "0 auto 18px", backgroundColor: brand.inkOn }} />
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".035em", lineHeight: 1.45 }}>
          {showEditorialOpening ? "Preparing your With" : children}
        </div>
        {showEditorialOpening && (
          <EditorialLine
            placement="preparing_with"
            deferFallbackUntilLoaded
            style={{
              marginTop: 22,
              paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,.18)",
              color: "rgba(255,255,255,.96)",
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: "clamp(20px, 4.8vw, 25px)",
              fontStyle: "italic",
              lineHeight: 1.45,
              textWrap: "balance",
            }}
            attributionStyle={{ fontFamily: "'DM Sans', -apple-system, sans-serif", fontStyle: "normal", fontSize: "0.58em", marginTop: 8 }}
          />
        )}
      </div>
    </div>
  );
}
