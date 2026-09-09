import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Users } from "lucide-react";
import { brand } from "../brand.jsx";

export default function WithSwitcher({ withs = [], activeWithId, onSelect, onStartWith, onJoinWith }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const activeWith = withs.find((withItem) => withItem.id === activeWithId) || withs[0] || null;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!activeWith) return null;

  return (
    <div ref={rootRef} style={{ position: "relative", minWidth: 0 }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          minWidth: 0,
          maxWidth: "100%",
          border: "1px solid rgba(255,255,255,.20)",
          background: open ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.10)",
          color: brand.inkOn,
          borderRadius: 11,
          padding: "7px 9px",
          fontFamily: "'DM Sans', -apple-system, sans-serif",
        }}
      >
        <Users size={14} strokeWidth={1.9} style={{ flexShrink: 0, opacity: .82 }} />
        <span style={{ minWidth: 0, textAlign: "left" }}>
          <span style={{ display: "block", color: "rgba(255,255,255,.68)", fontSize: 8, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase", lineHeight: 1.1 }}>You’re with</span>
          <span style={{ display: "block", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, fontWeight: 700, lineHeight: 1.15 }}>{activeWith.name}</span>
        </span>
        <ChevronDown size={14} strokeWidth={1.8} style={{ flexShrink: 0, opacity: .72, transform: open ? "rotate(180deg)" : "none", transition: "transform .14s ease" }} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Choose your With"
          style={{
            position: "absolute",
            top: "calc(100% + 7px)",
            right: 0,
            zIndex: 40,
            width: 250,
            maxWidth: "calc(100vw - 30px)",
            overflow: "hidden",
            background: brand.surface,
            color: brand.text,
            border: `1px solid ${brand.border}`,
            borderRadius: 14,
            boxShadow: "0 14px 36px rgba(28,36,48,.18)",
            padding: 6,
          }}
        >
          <div style={{ padding: "7px 9px 5px", color: brand.textMuted, fontSize: 9, fontWeight: 800, letterSpacing: ".09em", textTransform: "uppercase" }}>Who are you with?</div>

          {withs.map((withItem) => {
            const selected = withItem.id === activeWith.id;
            return (
              <button
                key={withItem.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onSelect?.(withItem.id);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "20px minmax(0, 1fr)",
                  alignItems: "center",
                  gap: 7,
                  border: "none",
                  background: selected ? brand.surfaceSoft : "transparent",
                  color: brand.text,
                  borderRadius: 9,
                  padding: "9px 8px",
                  textAlign: "left",
                  fontFamily: "'DM Sans', -apple-system, sans-serif",
                }}
              >
                <span style={{ display: "grid", placeItems: "center" }}>{selected ? <Check size={15} color={brand.tealDark} strokeWidth={2.4} /> : null}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: selected ? 800 : 650 }}>{withItem.name}</span>
                  {withItem.role === "owner" && <span style={{ display: "block", color: brand.textMuted, fontSize: 9, marginTop: 1 }}>You started this With</span>}
                </span>
              </button>
            );
          })}

          {(onStartWith || onJoinWith) && <div style={{ height: 1, background: brand.border, margin: "5px 4px" }} />}

          {onStartWith && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onStartWith(); }}
              style={{ width: "100%", border: "none", background: "transparent", color: brand.tealDark, borderRadius: 9, padding: "9px 8px", display: "flex", alignItems: "center", gap: 8, textAlign: "left", fontSize: 12, fontWeight: 800 }}
            >
              <Plus size={15} strokeWidth={2} /> Start another With
            </button>
          )}
          {onJoinWith && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onJoinWith(); }}
              style={{ width: "100%", border: "none", background: "transparent", color: brand.tealDark, borderRadius: 9, padding: "9px 8px", display: "flex", alignItems: "center", gap: 8, textAlign: "left", fontSize: 12, fontWeight: 800 }}
            >
              <Users size={15} strokeWidth={2} /> Join a With
            </button>
          )}
        </div>
      )}
    </div>
  );
}
