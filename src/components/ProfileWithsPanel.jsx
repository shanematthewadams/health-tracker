import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { supabase } from "../supabase";
import { brand } from "../brand.jsx";
import { readStoredActiveWithId, storeActiveWithId } from "../withMemberships.js";

export default function ProfileWithsPanel({ styles, onMultipleWithsChange, onStartAnotherWith }) {
  const { SURFACE_2, BORDER, TEXT, TEXT_MUTED } = styles;
  const [withs, setWiths] = useState([]);
  const [activeWithId, setActiveWithId] = useState(() => readStoredActiveWithId());

  useEffect(() => {
    let cancelled = false;

    async function loadWiths() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data: memberships, error: membershipError } = await supabase
        .from("household_members")
        .select("household_id, role")
        .eq("user_id", session.user.id);
      if (membershipError || !memberships?.length) return;

      const ids = [...new Set(memberships.map((membership) => membership.household_id).filter(Boolean))];
      const { data: households, error: householdError } = await supabase
        .from("households")
        .select("id, name")
        .in("id", ids);
      if (householdError || cancelled) return;

      const householdById = Object.fromEntries((households || []).map((household) => [household.id, household]));
      const nextWiths = memberships
        .map((membership) => ({
          id: membership.household_id,
          name: householdById[membership.household_id]?.name || "Your With",
          role: membership.role,
        }))
        .filter((withItem) => householdById[withItem.id])
        .sort((a, b) => a.name.localeCompare(b.name));

      if (cancelled) return;
      setWiths(nextWiths);
      onMultipleWithsChange?.(nextWiths.length > 1);
      const stored = readStoredActiveWithId();
      const validStored = nextWiths.some((withItem) => withItem.id === stored) ? stored : nextWiths[0]?.id || null;
      setActiveWithId(validStored);
    }

    loadWiths();
    return () => { cancelled = true; };
  }, [onMultipleWithsChange]);

  const otherWiths = useMemo(
    () => withs.filter((withItem) => withItem.id !== activeWithId),
    [withs, activeWithId]
  );

  if (withs.length < 2 || !otherWiths.length) return null;

  function switchWith(withId) {
    if (!withId || withId === activeWithId) return;
    storeActiveWithId(withId);
    window.location.reload();
  }

  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>You’re also With</div>
      <div style={{ display: "grid", gap: 7 }}>
        {otherWiths.map((withItem) => (
          <button
            key={withItem.id}
            type="button"
            onClick={() => switchWith(withItem.id)}
            style={{
              width: "100%",
              border: `1px solid ${BORDER}`,
              borderRadius: 11,
              background: SURFACE_2,
              color: TEXT,
              padding: "10px 11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              textAlign: "left",
            }}
          >
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: "'Newsreader', Georgia, serif", fontSize: 17, fontWeight: 600, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{withItem.name}</span>
              <span style={{ display: "block", color: TEXT_MUTED, fontSize: 11, marginTop: 3 }}>{withItem.role === "owner" ? "You started this With" : "Switch to this With"}</span>
            </span>
            <span style={{ color: brand.tealDark, fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              Switch <ChevronRight size={14} strokeWidth={2} />
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onStartAnotherWith}
        style={{
          background: "none",
          border: "none",
          color: TEXT_MUTED,
          padding: "10px 0 0",
          fontSize: 11,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Plus size={12} strokeWidth={2} /> Add another With
      </button>
    </div>
  );
}