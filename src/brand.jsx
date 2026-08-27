import withLogo from "./assets/brand/with-logo.svg";

export const brand = {
  bg: "#FEFDF9",
  surface: "#FFFFFF",
  surfaceSoft: "#F7F3EC",
  border: "#E6E1D8",
  text: "#252422",
  textMuted: "#746F68",
  warn: "#C83D34",
  ink: "#252422",
  inkOn: "#FFFFFF",
};

export function BrandLogo({ compact = false, style = {} }) {
  return (
    <img
      src={withLogo}
      alt="With"
      style={{
        display: "block",
        width: compact ? 78 : 146,
        height: "auto",
        objectFit: "contain",
        color: brand.ink,
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
          borderRadius: 14,
          padding: "22px 20px 20px",
          boxShadow: "0 4px 18px rgba(37,36,34,.045)",
        }}
      >
        <BrandLogo style={{ width: 116, margin: "0 auto 12px" }} />
        <div style={{ fontSize: 13, lineHeight: 1.45 }}>{children}</div>
      </div>
    </div>
  );
}
