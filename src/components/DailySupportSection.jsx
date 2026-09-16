import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { brand } from "../brand.jsx";
import { WithMark } from "../WithMarks.jsx";
import { supabase } from "../supabase.js";
import { readStoredActiveWithId } from "../withMemberships.js";

const MAX_LENGTH = 280;
const DEFAULT_STYLE = { color: brand.teal, withmark: "heart" };

function profileStyle(profile) {
  return {
    color: profile?.profile_color || brand.teal,
    withmark: profile?.profile_withmark || "heart",
  };
}

export default function DailySupportSection({
  activeUser,
  activeCanEdit,
  personName,
  today,
  profileColorForProfile,
  profileTextForProfile,
  styles,
}) {
  const { BORDER, TEXT, TEXT_MUTED, SURFACE, SURFACE_2, cardStyle, inputStyle, bigButton } = styles;
  const householdId = readStoredActiveWithId();
  const [senderProfileId, setSenderProfileId] = useState(null);
  const [recipientProfileId, setRecipientProfileId] = useState(null);
  const [senderStyle, setSenderStyle] = useState(DEFAULT_STYLE);
  const [sentNote, setSentNote] = useState(null);
  const [receivedNotes, setReceivedNotes] = useState([]);
  const [draft, setDraft] = useState("");
  const [senderStatus, setSenderStatus] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const trimmedDraft = draft.trim();
  const canSave = Boolean(senderProfileId && recipientProfileId) && trimmedDraft.length > 0 && trimmedDraft.length <= MAX_LENGTH && !busy;
  const senderColor = senderProfileId && profileColorForProfile
    ? profileColorForProfile(senderProfileId)
    : senderStyle.color;
  const senderTextColor = senderProfileId && profileTextForProfile
    ? profileTextForProfile(senderProfileId)
    : brand.inkOn;
  const colorForNote = (note) => (
    note?.sender_profile_id && profileColorForProfile
      ? profileColorForProfile(note.sender_profile_id)
      : note?.color || brand.teal
  );

  useEffect(() => {
    let cancelled = false;
    setError("");
    setRemoveConfirm(false);
    setSentNote(null);
    setDraft("");
    setReceivedNotes([]);
    setSenderProfileId(null);
    setRecipientProfileId(null);
    setSenderStyle(DEFAULT_STYLE);

    if (!householdId || !activeUser || !today) {
      setSenderStatus(activeCanEdit ? "idle" : "error");
      return undefined;
    }

    setSenderStatus(activeCanEdit ? "idle" : "loading");

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user?.id) {
        if (!activeCanEdit) setSenderStatus("error");
        return;
      }

      const { data: ownProfile, error: ownProfileError } = await supabase
        .from("profiles")
        .select("id,name,user_id,profile_color,profile_withmark")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (ownProfileError || !ownProfile?.id) {
        if (!activeCanEdit) setSenderStatus("error");
        return;
      }

      setSenderProfileId(ownProfile.id);
      setSenderStyle(profileStyle(ownProfile));

      let targetProfileId = ownProfile.id;
      if (!activeCanEdit) {
        const { data: memberships, error: membershipsError } = await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", householdId);

        if (cancelled) return;
        if (membershipsError || !memberships?.length) {
          setSenderStatus("error");
          return;
        }

        const memberUserIds = memberships.map((membership) => membership.user_id).filter(Boolean);
        const { data: matchingProfiles, error: matchingProfilesError } = await supabase
          .from("profiles")
          .select("id,name,user_id")
          .in("user_id", memberUserIds)
          .eq("name", personName || activeUser)
          .limit(2);

        if (cancelled) return;
        if (matchingProfilesError || matchingProfiles?.length !== 1) {
          setSenderStatus("error");
          return;
        }

        targetProfileId = matchingProfiles[0].id;
      }

      setRecipientProfileId(targetProfileId);

      if (activeCanEdit) {
        const { data: notes, error: notesError } = await supabase
          .from("support_notes")
          .select("id,sender_profile_id,message,created_at")
          .eq("household_id", householdId)
          .eq("recipient_profile_id", targetProfileId)
          .eq("support_date", today)
          .is("dismissed_at", null)
          .order("created_at", { ascending: true });

        if (cancelled) return;
        if (notesError || !notes?.length) {
          setReceivedNotes([]);
          return;
        }

        const senderIds = [...new Set(notes.map((note) => note.sender_profile_id).filter(Boolean))];
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id,name,profile_color,profile_withmark")
          .in("id", senderIds);

        if (cancelled || profilesError) return;
        const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
        setReceivedNotes(notes
          .map((note) => {
            const sender = profileMap.get(note.sender_profile_id);
            return sender ? { ...note, senderName: sender.name, ...profileStyle(sender) } : null;
          })
          .filter(Boolean));
        return;
      }

      const { data: existing, error: noteError } = await supabase
        .from("support_notes")
        .select("id,message,created_at")
        .eq("household_id", householdId)
        .eq("sender_profile_id", ownProfile.id)
        .eq("recipient_profile_id", targetProfileId)
        .eq("support_date", today)
        .maybeSingle();

      if (cancelled) return;
      if (noteError) {
        setSenderStatus("error");
        return;
      }

      if (existing?.id) {
        setSentNote(existing);
        setDraft(existing.message || "");
        setSenderStatus("sent");
      } else {
        setSentNote(null);
        setDraft("");
        setSenderStatus("compose");
      }
    })();

    return () => { cancelled = true; };
  }, [activeUser, activeCanEdit, personName, householdId, today, reloadKey]);

  const receivedIds = useMemo(() => receivedNotes.map((note) => note.id).join("|"), [receivedNotes]);

  async function saveNote() {
    if (!canSave || !householdId || !senderProfileId || !recipientProfileId) return;
    setBusy(true);
    setError("");

    let data;
    let saveError;
    if (sentNote?.id) {
      ({ data, error: saveError } = await supabase
        .from("support_notes")
        .update({ message: trimmedDraft })
        .eq("id", sentNote.id)
        .eq("sender_profile_id", senderProfileId)
        .select("id,message,created_at")
        .single());
    } else {
      ({ data, error: saveError } = await supabase
        .from("support_notes")
        .insert({
          household_id: householdId,
          sender_profile_id: senderProfileId,
          recipient_profile_id: recipientProfileId,
          support_date: today,
          message: trimmedDraft,
        })
        .select("id,message,created_at")
        .single());
    }

    if (saveError) {
      setError("We couldn’t save that support note. Try again.");
    } else {
      setSentNote(data);
      setDraft(data.message);
      setSenderStatus("sent");
      setRemoveConfirm(false);
    }
    setBusy(false);
  }

  async function removeNote() {
    if (!sentNote?.id || !senderProfileId || busy) return;
    setBusy(true);
    setError("");
    const { error: removeError } = await supabase
      .from("support_notes")
      .delete()
      .eq("id", sentNote.id)
      .eq("sender_profile_id", senderProfileId);

    if (removeError) {
      setError("We couldn’t remove that support note. Try again.");
    } else {
      setSentNote(null);
      setDraft("");
      setSenderStatus("compose");
      setRemoveConfirm(false);
    }
    setBusy(false);
  }

  async function dismissNote(noteId) {
    if (!activeCanEdit || !recipientProfileId || busy) return;
    setBusy(true);
    setError("");
    const { error: dismissError } = await supabase
      .from("support_notes")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("recipient_profile_id", recipientProfileId);

    if (dismissError) {
      setError("We couldn’t dismiss that note. Try again.");
    } else {
      setReceivedNotes((notes) => notes.filter((note) => note.id !== noteId));
    }
    setBusy(false);
  }

  if (activeCanEdit) {
    if (!receivedNotes.length) return null;
    return (
      <div data-support-note-received={receivedIds} style={{ marginBottom: 22 }}>
        {receivedNotes.map((note) => {
          const noteColor = colorForNote(note);
          return (
            <section
              key={note.id}
              style={{ ...cardStyle, marginBottom: 12, padding: "1.15rem", borderTop: `3px solid ${noteColor}`, background: SURFACE, position: "relative" }}
            >
              <button
                type="button"
                aria-label={`Dismiss ${note.senderName}'s support note`}
                disabled={busy}
                onClick={() => dismissNote(note.id)}
                style={{ position: "absolute", right: 12, top: 12, border: "none", background: "transparent", color: TEXT_MUTED, padding: 5, display: "grid", placeItems: "center" }}
              >
                <X size={15} strokeWidth={1.8} />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, paddingRight: 28 }}>
                <WithMark id={note.withmark} size={16} color={noteColor} />
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".11em", fontWeight: 800, color: TEXT_MUTED }}>With you today</div>
              </div>
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 21, fontWeight: 600, color: noteColor, lineHeight: 1.15, paddingRight: 28 }}>
                {note.senderName} is With You
              </div>
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, lineHeight: 1.42, color: TEXT, marginTop: 8, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {note.message}
              </div>
            </section>
          );
        })}
        {error && <div role="alert" style={{ color: brand.warn, fontSize: 11, marginTop: 10 }}>{error}</div>}
      </div>
    );
  }

  if (senderStatus === "loading") return null;

  if (senderStatus === "error") {
    return (
      <section style={{ ...cardStyle, marginBottom: 22, padding: "1.15rem", background: SURFACE }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <WithMark id={senderStyle.withmark} size={16} color={senderColor} />
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".11em", fontWeight: 800, color: TEXT_MUTED }}>Support</div>
        </div>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 22, fontWeight: 600, color: senderColor, lineHeight: 1.15, marginTop: 8 }}>
          Be With {personName} today
        </div>
        <div role="alert" style={{ color: brand.warn, fontSize: 12, marginTop: 12 }}>Support isn’t available right now.</div>
        <button type="button" onClick={() => setReloadKey((value) => value + 1)} style={{ border: "none", background: "transparent", color: senderColor, padding: "10px 0 0", fontSize: 12, fontWeight: 800 }}>Try again</button>
      </section>
    );
  }

  const composing = senderStatus === "compose";

  return (
    <section style={{ ...cardStyle, marginBottom: 22, padding: "1.15rem", borderTop: `3px solid ${senderColor}`, background: SURFACE }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <WithMark id={senderStyle.withmark} size={16} color={senderColor} />
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".11em", fontWeight: 800, color: TEXT_MUTED }}>Support</div>
          </div>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 22, fontWeight: 600, color: senderColor, lineHeight: 1.15, marginTop: 8 }}>
            {senderStatus === "sent" && sentNote ? `You’re With ${personName} today` : `Be With ${personName} today`}
          </div>
        </div>
        {senderStatus === "sent" && sentNote && (
          <button type="button" onClick={() => setSenderStatus("compose")} aria-label="Edit support note" style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: 5, display: "grid", placeItems: "center" }}>
            <Pencil size={15} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {composing ? (
        <div style={{ marginTop: 12 }}>
          <textarea
            autoFocus={Boolean(sentNote)}
            maxLength={MAX_LENGTH}
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Write a little encouragement for ${personName}…`}
            style={{ ...inputStyle, minHeight: 88, resize: "vertical", lineHeight: 1.45, background: brand.surface }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
            <div style={{ color: TEXT_MUTED, fontSize: 10 }}>Text and emoji are welcome.</div>
            <div className="num" style={{ color: draft.length >= MAX_LENGTH ? brand.warn : TEXT_MUTED, fontSize: 10 }}>{draft.length} / {MAX_LENGTH}</div>
          </div>
          {error && <div role="alert" style={{ color: brand.warn, fontSize: 11, marginTop: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {sentNote && (
              <button type="button" disabled={busy} onClick={() => { setDraft(sentNote.message); setSenderStatus("sent"); setError(""); }} style={{ ...bigButton(SURFACE_2, TEXT), width: "auto", padding: "10px 14px", border: `1px solid ${BORDER}` }}>
                Cancel
              </button>
            )}
            <button type="button" disabled={!canSave} onClick={saveNote} style={{ ...bigButton(senderColor, senderTextColor), width: "auto", padding: "10px 16px", opacity: canSave ? 1 : 0.55 }}>
              {busy ? "Saving…" : sentNote ? "Save note" : "Send support"}
            </button>
          </div>
        </div>
      ) : sentNote ? (
        <div style={{ marginTop: 11 }}>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, lineHeight: 1.42, color: TEXT, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{sentNote.message}</div>
          <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 7 }}>Support sent. No reply needed.</div>
          {error && <div role="alert" style={{ color: brand.warn, fontSize: 11, marginTop: 8 }}>{error}</div>}
          {removeConfirm ? (
            <div style={{ marginTop: 10, padding: 10, border: `1px solid ${BORDER}`, background: SURFACE_2, borderRadius: 9 }}>
              <div style={{ color: TEXT, fontSize: 12, fontWeight: 700 }}>Remove this support note?</div>
              <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                <button type="button" disabled={busy} onClick={() => setRemoveConfirm(false)} style={{ ...bigButton(SURFACE, TEXT), width: "auto", padding: "9px 13px", border: `1px solid ${BORDER}` }}>Cancel</button>
                <button type="button" disabled={busy} onClick={removeNote} style={{ ...bigButton(SURFACE_2, TEXT), width: "auto", padding: "9px 13px", border: `1px solid ${BORDER}` }}>{busy ? "Removing…" : "Remove note"}</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setRemoveConfirm(true)} style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: "10px 0 0", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700 }}>
              <Trash2 size={13} strokeWidth={1.8} /> Remove note
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}