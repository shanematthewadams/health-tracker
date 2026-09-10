import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { brand } from "../brand.jsx";

export default function CreateWithDialog({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [eventOpen, setEventOpen] = useState(false);
  const isOpen = open || eventOpen;

  useEffect(() => {
    function openFromProfile() {
      setEventOpen(true);
    }
    window.addEventListener("with:open-create-dialog", openFromProfile);
    return () => window.removeEventListener("with:open-create-dialog", openFromProfile);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setError("");
      setBusy(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function closeDialog() {
    setEventOpen(false);
    onClose?.();
  }

  async function submit(event) {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setError("Your With needs a name.");
      return;
    }
    if (clean.length > 40) {
      setError("Keep your With name to 40 characters or fewer.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const result = await onCreate?.(clean);
      if (result !== false) closeDialog();
    } catch (err) {
      setError(err?.message || "We couldn’t start that With. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) closeDialog();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "grid",
        placeItems: "center",
        padding: 18,
        background: "rgba(19,34,32,.38)",
        backdropFilter: "blur(3px)",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: brand.bg,
          color: brand.text,
          border: `1px solid ${brand.border}`,
          borderRadius: 18,
          boxShadow: "0 20px 54px rgba(20,35,33,.22)",
          padding: "1.15rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ color: brand.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>Another With</div>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 25, fontWeight: 600, lineHeight: 1.08, marginTop: 5 }}>Who else are you with?</div>
          </div>
          <button type="button" disabled={busy} onClick={closeDialog} aria-label="Close" style={{ border: "none", background: "transparent", color: brand.textMuted, padding: 4, display: "grid", placeItems: "center" }}>
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ color: brand.textMuted, fontSize: 13, lineHeight: 1.5, margin: "10px 0 18px" }}>
          Your health stays yours. You keep one profile and one health history, so you only log food, weight, movement, water, and everything else once. This just adds another private group of people you’re doing life With.
        </div>

        <label style={{ display: "block", fontSize: 10, color: brand.textMuted, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 6 }}>
          With name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. F3 Crew"
          maxLength={40}
          style={{
            width: "100%",
            minHeight: 46,
            border: `1px solid ${brand.border}`,
            borderRadius: 10,
            background: brand.surface,
            color: brand.text,
            padding: "11px 13px",
            fontSize: 16,
          }}
        />

        {error && <div role="alert" style={{ color: brand.warn, fontSize: 12, lineHeight: 1.4, marginTop: 9 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button type="button" disabled={busy} onClick={closeDialog} style={{ flex: 1, minHeight: 44, border: `1px solid ${brand.border}`, borderRadius: 10, background: brand.surfaceSoft, color: brand.text, fontWeight: 700 }}>
            Cancel
          </button>
          <button disabled={busy} style={{ flex: 1.35, minHeight: 44, border: "none", borderRadius: 10, background: brand.teal, color: brand.inkOn, fontWeight: 800, opacity: busy ? .65 : 1 }}>
            {busy ? "Starting…" : "Start this With"}
          </button>
        </div>
      </form>
    </div>
  );
}
