import { useEffect, useMemo, useState } from "react";
import { Heart, Pencil, Trash2, X } from "lucide-react";
import { brand } from "../brand.jsx";
import { WaveMark } from "../WithMarks.jsx";
import { supabase } from "../supabase.js";
import { readStoredActiveWithId } from "../withMemberships.js";

const MAX_LENGTH = 280;

export default function DailySupportSection({ activeUser, activeCanEdit, personName, today, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, SURFACE, SURFACE_2, cardStyle, inputStyle, bigButton } = styles;
  const householdId = readStoredActiveWithId();
  const [senderProfileId, setSenderProfileId] = useState(null);
  const [sentNote, setSentNote] = useState(null);
  const [receivedNotes, setReceivedNotes] = useState([]);
  const [draft, setDraft] = useState("");
  const [senderStatus, setSenderStatus] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const trimmedDraft = draft.trim();
  const canSave = Boolean(senderProfileId) && trimmedDraft.length > 0 && trimmedDraft.length <= MAX_LENGTH && !busy;

  useEffect(() => {
    let cancelled = false;
    setError("");
    setRemoveConfirm(false);

    if (!householdId || !activeUser || !today) {
      setSenderProfileId(null);
      setSentNote(null);
      setReceivedNotes([]);
      setDraft("");
      setSenderStatus(activeCanEdit ? "idle" : "error");
      return undefined;
    }

    if (activeCanEdit) {
      setSenderProfileId(null);
      setSentNote(null);
      setDraft("");
      setSenderStatus("idle");

      (async () => {
        const { data: notes, error: notesError } = await supabase
          .from("support_notes")
          .select("id,sender_profile_id,message,created_at")
          .eq("household_id", householdId)
          .eq("recipient_profile_id", activeUser)
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
          .select("id,name")
          .in("id", senderIds);

        if (cancelled || profilesError) return;
        const names = new Map((profiles || []).map((profile) => [profile.id, profile.name]));
        setReceivedNotes(notes
          .map((note) => ({ ...note, senderName: names.get(note.sender_profile_id) }))
          .filter((note) => note.senderName));
      })();

      return () => { cancelled = true; };
    }

    setReceivedNotes([]);
    setSenderProfileId(null);
    setSentNote(null);
    setDraft("");
    setSenderStatus("loading");

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user?.id) {
        setSenderStatus("error");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (profileError || !profile?.id) {
        setSenderStatus("error");
        return;
      }

      setSenderProfileId(profile.id);
      const { data: existing, error: noteError } = await supabase
        .from("support_notes")
        .select("id,message,created_at")
        .eq("household_id", householdId)
        .eq("sender_profile_id", profile.id)
        .eq("recipient_profile_id", activeUser)
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
  }, [activeUser, activeCanEdit, householdId, today, reloadKey]);

  const receivedIds = useMemo(() => receivedNotes.map((note) => note.id).join("|"), [receivedNotes]);

  async function saveNote() {
    if (!canSave || !householdId || !senderProfileId) return;
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
          recipient_profile_id: activeUser,
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
    if (!activeCanEdit || busy) return;
    setBusy(true);
    setError("");
    const { error: dismissError } = await supabase
      .from("support_notes")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("recipient_profile_id", activeUser);

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
      <section data-support-note-received={receivedIds} style={{ ...cardStyle, marginBottom: 22, padding: "1.15rem", borderTop: `3px solid ${brand.teal}`, background: SURFACE }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
          <WaveMark size={15} color={brand.teal} />
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".11em", fontWeight: 800, color: TEXT_MUTED }}>With you today</div>
        </div>
        {receivedNotes.map((note, index) => (
          <div key={note.id} style={{ position: "relative", paddingTop: index ? 13 : 0, marginTop: index ? 13 : 0, borderTop: index ? `1px solid ${BORDER}` : "none" }}>
            <button
              type="button"
              aria-label={`Dismiss ${note.senderName}'s support note`}
              disabled={busy}
              onClick={() => dismissNote(note.id)}
              style={{ position: "absolute", right: -4, top: index ? 8 : -4, border: "none", background: "transparent", color: TEXT_MUTED, padding: 5, display: "grid", placeItems: "center" }}
            >
              <X size={15} strokeWidth={1.8} />
            </button>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 21, fontWeight: 600, color: TEXT, lineHeight: 1.15, paddingRight: 28 }}>
              {note.senderName} is With You
            </div>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, lineHeight: 1.42, color: TEXT, marginTop: 8, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {note.message}
            </div>
          </div>
        ))}
        {error && <div role="alert" style={{ color: brand.warn, fontSize: 11, marginTop: 10 }}>{error}</div>}
      </section>
    );
  }

  if (senderStatus === "loading") return null;

  if (senderStatus === "error") {
    return (
      <section style={{ ...cardStyle, marginBottom: 22, padding: "1.15rem", background: SURFACE }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Heart size={15} color={brand.teal} strokeWidth={2} />
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".11em", fontWeight: 800, color: TEXT_MUTED }}>Support</div>
        </div>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 22, fontWeight: 600, color: TEXT, lineHeight: 1.15, marginTop: 8 }}>
          Be With {personName} today
        </div>
        <div role="alert" style={{ color: brand.warn, fontSize: 12, marginTop: 12 }}>Support isn’t available right now.</div>
        <button type="button" onClick={() => setReloadKey((value) => value + 1)} style={{ border: "none", background: "transparent", color: brand.tealDark, padding: "10px 0 0", fontSize: 12, fontWeight: 800 }}>Try again</button>
      </section>
    );
  }

  const composing = senderStatus === "compose";

  return (
    <section style={{ ...cardStyle, marginBottom: 22, padding: "1.15rem", background: SURFACE }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Heart size={15} color={brand.teal} strokeWidth={2} />
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".11em", fontWeight: 800, color: TEXT_MUTED }}>Support</div>
          </div>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 22, fontWeight: 600, color: TEXT, lineHeight: 1.15, marginTop: 8 }}>
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
            <button type="button" disabled={!canSave} onClick={saveNote} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", padding: "10px 16px", opacity: canSave ? 1 : 0.55 }}>
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
