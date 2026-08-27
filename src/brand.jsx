import withLogo from "./assets/brand/with-logo.svg";

export const brand = {
  teal: "#1F5E57",
  tealDark: "#174E49",
  sage: "#B7C8BF",
  clay: "#E08A6A",
  sun: "#F2C96D",
  stone: "#F0ECE4",
  bg: "#FFFBF5",
  surface: "#FFFFFF",
  surfaceSoft: "#F7F3EC",
  border: "#E9E4DA",
  text: "#111111",
  textMuted: "#53565A",
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

export function BrandLogo({ compact = false, style = {} }) {
  return (
    <span
      aria-label="With"
      role="img"
      style={{
        display: "inline-block",
        width: compact ? 78 : 146,
        aspectRatio: "1170 / 519",
        backgroundColor: brand.teal,
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

export function BrandLoading({ children = "Getting your With ready…" }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: brand.bg,
        color: brand.textMuted,
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}
    >
      <div
        role="status"
        aria-live="polite"
        style={{
          width: "100%",
          maxWidth: 260,
          textAlign: "center",
          background: brand.surface,
          border: `1px solid ${brand.border}`,
          borderRadius: 16,
          padding: "24px 20px 21px",
          boxShadow: "0 8px 28px rgba(17,17,17,.05)",
        }}
      >
        <BrandLogo style={{ width: 116, margin: "0 auto 13px" }} />
        <div style={{ fontSize: 13, lineHeight: 1.45 }}>{children}</div>
      </div>
    </div>
  );
}
