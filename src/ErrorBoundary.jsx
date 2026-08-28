import React from "react";
import { brand } from "./brand.jsx";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("With app error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ minHeight: "100vh", background: brand.bg, color: brand.text, display: "grid", placeItems: "center", padding: 20, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 420, background: brand.surface, border: `1px solid ${brand.border}`, borderRadius: 14, padding: "1.5rem", boxShadow: "0 4px 18px rgba(37,36,34,.045)" }}>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 28, fontWeight: 600, lineHeight: 1.05, marginBottom: 10 }}>Something went wrong.</div>
          <div style={{ color: brand.textMuted, fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>
            Your data is still safe. Refresh With and try again.
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ width: "100%", border: "none", borderRadius: 8, padding: "13px 18px", background: brand.teal, color: brand.inkOn, fontWeight: 800, fontSize: 15, fontFamily: "'DM Sans', -apple-system, sans-serif" }}
          >
            Refresh With
          </button>
        </div>
      </div>
    );
  }
}
