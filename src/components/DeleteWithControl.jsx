import { useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "../supabase";
import { brand } from "../brand.jsx";
import { clearStoredActiveWithId } from "../withMemberships.js";

function normalizeConfirmation(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

export default function DeleteWithControl({ withId, withName, isOwner, styles, hasOtherWiths }) {
  const { SURFACE_2, BORDER, TEXT, TEXT_MUTED } = styles;
  const [confirming, setConfirming] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isOwner || !withId) return null;

  const nameMatches = normalizeConfirmation(typedName) === normalizeConfirmation(withName);

  async function deleteWith() {
    if (busy || !nameMatches) return;
    setBusy(true);
    setError("");

    const { error: deleteError } = await supabase.rpc("delete_with_v1", { with_id: withId });

    if (deleteError) {
      const raw = String(deleteError.message || "");
      if (raw.includes("WITH_OWNER_REQUIRED")) setError("Only the owner can delete this With.");
      else if (raw.includes("WITH_NOT_FOUND")) setError("This With no longer exists.");
      else setError("We couldn’t delete this With. Nothing was changed. Try again.");
      setBusy(false);
      return;
    }

    clearStoredActiveWithId();
    window.location.reload();
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}`, marginBottom: hasOtherWiths ? 0 : 0 }}>
      {!confirming ? (
        <button
          type="button"
          onClick={() => { setConfirming(true); setTypedName(""); setError(""); }}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            color: brand.warn,
            padding: "8px 0",
            fontSize: 12,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 9,
            textAlign: "left",
          }}
        >
          <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(202,64,55,.08)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Trash2 size={15} strokeWidth={2} />
          </span>
          <span>
            <span style={{ display: "block" }}>Delete this With</span>
            <span style={{ display: "block", color: TEXT_MUTED, fontSize: 10, fontWeight: 600, marginTop: 2 }}>Permanently removes this With for everyone</span>
          </span>
        </button>
      ) : (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 11, background: SURFACE_2, padding: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Trash2 size={16} color={brand.warn} strokeWidth={2} />
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1.15 }}>Delete {withName}?</div>
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
            This removes the With for everyone in it. Everyone keeps their account, profile, goals, and health history. This can’t be undone.
          </div>
          {!hasOtherWiths && (
            <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>
              If this is your only With, you’ll return to the between-Withs screen afterward.
            </div>
          )}
          <label style={{ display: "block", color: TEXT_MUTED, fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 12, marginBottom: 5 }}>
            Type {withName} to confirm
          </label>
          <input
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
            disabled={busy}
            autoComplete="off"
            style={{ width: "100%", minHeight: 42, border: `1px solid ${BORDER}`, borderRadius: 9, background: "transparent", color: TEXT, padding: "9px 10px", fontSize: 14 }}
          />
          {typedName && !nameMatches && !error && (
            <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.4, marginTop: 6 }}>
              Keep typing the With name shown above to enable deletion.
            </div>
          )}
          {error && <div role="alert" style={{ color: brand.warn, fontSize: 12, lineHeight: 1.4, marginTop: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setConfirming(false); setTypedName(""); setError(""); }}
              style={{ flex: 1, minHeight: 40, borderRadius: 9, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, fontWeight: 700 }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !nameMatches}
              onClick={deleteWith}
              style={{ flex: 1.2, minHeight: 40, borderRadius: 9, border: "none", background: brand.warn, color: "#fff", fontWeight: 800, opacity: busy || !nameMatches ? .5 : 1 }}
            >
              {busy ? "Deleting…" : "Delete With"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
