import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { supabase } from "../supabase";
import { brand } from "../brand.jsx";
import { clearStoredActiveWithId, readStoredActiveWithId, storeActiveWithId } from "../withMemberships.js";

export default function ProfileWithsPanel({ styles, onMultipleWithsChange }) {
  const { SURFACE_2, BORDER, TEXT, TEXT_MUTED } = styles;
  const [withs, setWiths] = useState([]);
  const [activeWithId, setActiveWithId] = useState(() => readStoredActiveWithId());
  const [currentUserId, setCurrentUserId] = useState(null);
  const [members, setMembers] = useState([]);
  const [managingPeople, setManagingPeople] = useState(false);
  const [confirmMember, setConfirmMember] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWiths() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      setCurrentUserId(session.user.id);

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

      if (!validStored) return;
      const { data: rosterRows, error: rosterError } = await supabase
        .from("household_members")
        .select("user_id, role")
        .eq("household_id", validStored);
      if (rosterError || cancelled) return;

      const userIds = [...new Set((rosterRows || []).map((member) => member.user_id).filter(Boolean))];
      let profiles = [];
      if (userIds.length) {
        const { data: profileRows, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", userIds);
        if (!profileError) profiles = profileRows || [];
      }

      if (cancelled) return;
      const profileByUserId = Object.fromEntries(profiles.map((profile) => [profile.user_id, profile]));
      setMembers((rosterRows || []).map((member) => ({
        userId: member.user_id,
        role: member.role,
        name: profileByUserId[member.user_id]?.name || "With member",
      })));
    }

    loadWiths();
    return () => { cancelled = true; };
  }, [onMultipleWithsChange]);

  const otherWiths = useMemo(
    () => withs.filter((withItem) => withItem.id !== activeWithId),
    [withs, activeWithId]
  );
  const activeWith = useMemo(
    () => withs.find((withItem) => withItem.id === activeWithId) || null,
    [withs, activeWithId]
  );
  const removableMembers = useMemo(
    () => members.filter((member) => member.userId !== currentUserId && member.role !== "owner"),
    [members, currentUserId]
  );
  const canManagePeople = activeWith?.role === "owner" && removableMembers.length > 0;
  const canLeaveWith = activeWith?.role === "member";
  const ownerNeedsTransfer = activeWith?.role === "owner";
  const hasOtherWiths = withs.length > 1 && otherWiths.length > 0;

  if (!hasOtherWiths && !canManagePeople && !canLeaveWith && !ownerNeedsTransfer) return null;

  function switchWith(withId) {
    if (!withId || withId === activeWithId) return;
    storeActiveWithId(withId);
    window.location.reload();
  }

  function startAnotherWith() {
    window.dispatchEvent(new CustomEvent("with:open-create-dialog"));
  }

  async function removeMember(member) {
    if (!member?.userId || !activeWithId || removeBusy) return;
    setRemoveBusy(true);
    setRemoveError("");

    const { error } = await supabase.rpc("remove_with_member_v1", {
      with_id: activeWithId,
      target_user_id: member.userId,
    });

    if (error) {
      const raw = String(error.message || "");
      if (raw.includes("WITH_OWNER_REQUIRED")) setRemoveError("Only the person who started this With can remove someone.");
      else if (raw.includes("CANNOT_REMOVE_OWNER")) setRemoveError("An owner can’t be removed this way.");
      else if (raw.includes("MEMBERSHIP_NOT_FOUND")) setRemoveError("That person is no longer part of this With.");
      else setRemoveError("We couldn’t remove that person. Try again.");
      setRemoveBusy(false);
      return;
    }

    window.location.reload();
  }

  async function leaveWith() {
    if (!activeWithId || leaveBusy) return;
    setLeaveBusy(true);
    setLeaveError("");

    const { error } = await supabase.rpc("leave_with_v1", { with_id: activeWithId });

    if (error) {
      const raw = String(error.message || "");
      if (raw.includes("OWNER_TRANSFER_REQUIRED")) setLeaveError("Transfer ownership before leaving a With you started.");
      else if (raw.includes("MEMBERSHIP_NOT_FOUND")) setLeaveError("You’re no longer part of this With.");
      else setLeaveError("We couldn’t leave this With. Try again.");
      setLeaveBusy(false);
      return;
    }

    clearStoredActiveWithId();
    window.location.reload();
  }

  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
      {canManagePeople && (
        <div style={{ marginBottom: hasOtherWiths || canLeaveWith || ownerNeedsTransfer ? 18 : 0 }}>
          <button
            type="button"
            onClick={() => { setManagingPeople((value) => !value); setConfirmMember(null); setRemoveError(""); }}
            style={{ background: "none", border: "none", color: TEXT_MUTED, padding: 0, fontSize: 11, fontWeight: 700 }}
          >
            {managingPeople ? "Close people management" : "Manage people in this With"}
          </button>

          {managingPeople && (
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {removableMembers.map((member) => (
                <div key={member.userId} style={{ border: `1px solid ${BORDER}`, borderRadius: 11, background: SURFACE_2, padding: "10px 11px" }}>
                  {confirmMember?.userId === member.userId ? (
                    <div>
                      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1.15 }}>Remove {member.name}?</div>
                      <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>
                        They’ll keep their account, profile, goals, and health history. They just won’t be part of {activeWith?.name || "this With"} anymore.
                      </div>
                      {removeError && <div role="alert" style={{ color: brand.warn, fontSize: 12, lineHeight: 1.4, marginTop: 8 }}>{removeError}</div>}
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button type="button" disabled={removeBusy} onClick={() => { setConfirmMember(null); setRemoveError(""); }} style={{ flex: 1, minHeight: 40, borderRadius: 9, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, fontWeight: 700 }}>Cancel</button>
                        <button type="button" disabled={removeBusy} onClick={() => removeMember(member)} style={{ flex: 1, minHeight: 40, borderRadius: 9, border: "none", background: brand.warn, color: "#fff", fontWeight: 800, opacity: removeBusy ? .6 : 1 }}>{removeBusy ? "Removing…" : "Remove person"}</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 17, fontWeight: 600, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.name}</div>
                        <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 3 }}>Member of this With</div>
                      </div>
                      <button type="button" onClick={() => { setConfirmMember(member); setRemoveError(""); }} style={{ background: "none", border: "none", color: brand.warn, padding: "6px 0 6px 8px", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>Remove</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(canLeaveWith || ownerNeedsTransfer) && (
        <div style={{ marginBottom: hasOtherWiths ? 18 : 0 }}>
          {!confirmLeave ? (
            <>
              <button
                type="button"
                disabled={ownerNeedsTransfer}
                onClick={() => { setConfirmLeave(true); setLeaveError(""); }}
                style={{ background: "none", border: "none", color: ownerNeedsTransfer ? TEXT_MUTED : brand.warn, padding: 0, fontSize: 11, fontWeight: 700, opacity: ownerNeedsTransfer ? .7 : 1 }}
              >
                Leave this With
              </button>
              {ownerNeedsTransfer && (
                <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, marginTop: 5 }}>You started this With. Transfer ownership before you leave.</div>
              )}
            </>
          ) : (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 11, background: SURFACE_2, padding: "11px" }}>
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1.15 }}>Leave {activeWith?.name || "this With"}?</div>
              <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>
                Your account, profile, goals, and health history stay yours. You just won’t be part of this With anymore.
              </div>
              {withs.length === 1 && (
                <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>This is your only With. You can start or join another one afterward without losing your personal data.</div>
              )}
              {leaveError && <div role="alert" style={{ color: brand.warn, fontSize: 12, lineHeight: 1.4, marginTop: 8 }}>{leaveError}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button type="button" disabled={leaveBusy} onClick={() => { setConfirmLeave(false); setLeaveError(""); }} style={{ flex: 1, minHeight: 40, borderRadius: 9, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, fontWeight: 700 }}>Cancel</button>
                <button type="button" disabled={leaveBusy} onClick={leaveWith} style={{ flex: 1, minHeight: 40, borderRadius: 9, border: "none", background: brand.warn, color: "#fff", fontWeight: 800, opacity: leaveBusy ? .6 : 1 }}>{leaveBusy ? "Leaving…" : "Leave With"}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {hasOtherWiths && (
        <>
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
            onClick={startAnotherWith}
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
        </>
      )}
    </div>
  );
}
