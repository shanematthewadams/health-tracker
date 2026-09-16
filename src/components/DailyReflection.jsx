import { useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";

function shiftDate(dateStr, delta) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function dateKeyInTimeZone(date = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function hourInTimeZone(date = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    return Number(parts.find((part) => part.type === "hour")?.value || 0);
  } catch {
    return date.getHours();
  }
}

function formatReflectionDate(dateStr) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function ratingWord(rating) {
  return ({ 1: "Rough", 2: "Hard", 3: "Okay", 4: "Good", 5: "Fantastic" })[Number(rating)] || "";
}

function RatingScale({ value, onChange, disabled = false, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, SURFACE, SURFACE_2 } = styles;
  return (
    <div>
      <div role="radiogroup" aria-label="How was the day?" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((rating) => {
          const selected = Number(value) === rating;
          return (
            <button
              key={rating}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${rating}, ${ratingWord(rating)}`}
              disabled={disabled}
              onClick={() => onChange(rating)}
              style={{
                minHeight: 46,
                borderRadius: 12,
                border: selected ? `2px solid ${brand.tealDark}` : `1px solid ${BORDER}`,
                background: selected ? brand.tealSoft || SURFACE_2 : SURFACE,
                color: selected ? brand.tealDark : TEXT,
                fontSize: 16,
                fontWeight: 800,
                boxShadow: selected ? "0 2px 8px rgba(29,104,94,.08)" : "none",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {rating}
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", color: TEXT_MUTED, fontSize: 10, fontWeight: 700, marginTop: 6 }}>
        <span>Rough</span>
        <span style={{ textAlign: "center" }}>Okay</span>
        <span style={{ textAlign: "right" }}>Fantastic</span>
      </div>
    </div>
  );
}

async function resolveOwnProfile(userId) {
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    resolvedUserId = session?.user?.id;
  }
  if (!resolvedUserId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,daily_reflection_enabled")
    .eq("user_id", resolvedUserId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function ReflectionHistoryModal({ profileId, today, styles, onClose }) {
  const { SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, inputStyle, bigButton } = styles;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingYesterday, setAddingYesterday] = useState(false);
  const [rating, setRating] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const yesterday = shiftDate(today, -1);

  async function load() {
    if (!profileId) return;
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("daily_reflections")
      .select("id,reflection_date,rating,note,created_at,updated_at")
      .eq("profile_id", profileId)
      .order("reflection_date", { ascending: false });
    if (loadError) {
      console.error("Could not load daily reflections", loadError);
      setError("We couldn’t load your reflections. Try again.");
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [profileId]);

  const hasYesterday = rows.some((row) => row.reflection_date === yesterday);

  async function saveYesterday() {
    if (!rating || !profileId || saving) return;
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const { error: saveError } = await supabase.from("daily_reflections").upsert({
      profile_id: profileId,
      reflection_date: yesterday,
      rating,
      note: note.trim() || null,
      updated_at: now,
    }, { onConflict: "profile_id,reflection_date" });
    if (saveError) {
      console.error("Could not save yesterday's reflection", saveError);
      setError("We couldn’t save that reflection. Try again.");
    } else {
      setAddingYesterday(false);
      setRating(null);
      setNote("");
      await load();
      window.dispatchEvent(new CustomEvent("with-daily-reflection-saved", { detail: { reflectionDate: yesterday } }));
    }
    setSaving(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Past reflections"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(20,31,29,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "20px 12px max(20px, env(safe-area-inset-bottom))" }}
    >
      <div style={{ width: "100%", maxWidth: 520, maxHeight: "88dvh", overflowY: "auto", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "16px 16px 20px", boxShadow: "0 20px 60px rgba(20,31,29,.22)" }}>
        <div style={{ position: "sticky", top: -16, zIndex: 2, background: SURFACE, padding: "2px 0 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 25, fontWeight: 600, lineHeight: 1.08, color: TEXT }}>Past reflections</div>
            <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, marginTop: 3 }}>A simple record of how the days felt and what you wanted to remember.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close past reflections" style={{ border: "none", background: SURFACE_2, color: TEXT, width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 }}><X size={17} /></button>
        </div>

        {!hasYesterday && !addingYesterday && !loading && (
          <button type="button" onClick={() => setAddingYesterday(true)} style={{ width: "100%", border: `1px solid ${BORDER}`, background: SURFACE_2, color: TEXT, borderRadius: 12, padding: "11px 13px", fontSize: 12, fontWeight: 800, textAlign: "left", marginBottom: 14 }}>
            Add yesterday’s reflection
          </button>
        )}

        {addingYesterday && (
          <div style={{ border: `1px solid ${BORDER}`, background: SURFACE_2, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 20, fontWeight: 600, color: TEXT, marginBottom: 10 }}>How was yesterday?</div>
            <RatingScale value={rating} onChange={setRating} disabled={saving} styles={styles} />
            <div style={{ color: TEXT, fontSize: 12, fontWeight: 800, marginTop: 15, marginBottom: 6 }}>Anything from yesterday worth remembering?</div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={320}
              rows={3}
              placeholder="A sentence or two is plenty."
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.45, minHeight: 84 }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 9 }}>
              <button type="button" onClick={() => { setAddingYesterday(false); setRating(null); setNote(""); }} disabled={saving} style={{ border: "none", background: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: 0 }}>Cancel</button>
              <button type="button" onClick={saveYesterday} disabled={!rating || saving} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", minHeight: 40, padding: "9px 15px", opacity: !rating || saving ? .55 : 1 }}>{saving ? "Saving…" : "Save reflection"}</button>
            </div>
          </div>
        )}

        {error && <div role="alert" style={{ color: WARN, fontSize: 12, lineHeight: 1.45, marginBottom: 12 }}>{error}</div>}
        {loading ? (
          <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "10px 0" }}>Loading reflections…</div>
        ) : rows.length ? (
          <div style={{ display: "grid", gap: 9 }}>
            {rows.map((row) => (
              <article key={row.id} style={{ border: `1px solid ${BORDER}`, background: SURFACE_2, borderRadius: 13, padding: "12px 13px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ color: TEXT, fontSize: 12, fontWeight: 800 }}>{formatReflectionDate(row.reflection_date)}</div>
                  <div style={{ color: brand.tealDark, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{row.rating}/5 · {ratingWord(row.rating)}</div>
                </div>
                {row.note ? <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.5, marginTop: 7, whiteSpace: "pre-wrap" }}>{row.note}</div> : <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 6 }}>No note.</div>}
              </article>
            ))}
          </div>
        ) : (
          <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, padding: "8px 0" }}>No reflections yet. There’s nothing to catch up on unless you want to add yesterday.</div>
        )}
      </div>
    </div>
  );
}

export function DailyReflectionCard({ today, timeZone, styles }) {
  const { SURFACE, BORDER, TEXT, TEXT_MUTED, WARN, cardStyle, inputStyle, bigButton } = styles;
  const [profileId, setProfileId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [existing, setExisting] = useState(undefined);
  const [rating, setRating] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [clockTick, setClockTick] = useState(Date.now());

  async function load() {
    setError("");
    try {
      const profile = await resolveOwnProfile();
      if (!profile?.id) return;
      setProfileId(profile.id);
      setEnabled(profile.daily_reflection_enabled !== false);
      const { data, error: reflectionError } = await supabase
        .from("daily_reflections")
        .select("id,reflection_date,rating,note")
        .eq("profile_id", profile.id)
        .eq("reflection_date", today)
        .maybeSingle();
      if (reflectionError) throw reflectionError;
      setExisting(data || null);
    } catch (loadError) {
      console.error("Could not load daily reflection", loadError);
      setError("We couldn’t load today’s reflection.");
      setExisting(null);
    }
  }

  useEffect(() => { load(); }, [today]);

  useEffect(() => {
    const interval = window.setInterval(() => setClockTick(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleSettings = () => load();
    const handleSaved = (event) => {
      if (event.detail?.reflectionDate === today) load();
    };
    window.addEventListener("with-daily-reflection-settings-changed", handleSettings);
    window.addEventListener("with-daily-reflection-saved", handleSaved);
    return () => {
      window.removeEventListener("with-daily-reflection-settings-changed", handleSettings);
      window.removeEventListener("with-daily-reflection-saved", handleSaved);
    };
  }, [today]);

  const preview = typeof window !== "undefined"
    && (window.location.hostname.includes("staging--") || window.location.hostname.startsWith("staging."))
    && new URLSearchParams(window.location.search).get("reflection-preview") === "1";
  const isEvening = preview || hourInTimeZone(new Date(clockTick), timeZone) >= 18;
  const showPrompt = enabled && existing === null && isEvening;

  async function saveToday() {
    if (!rating || !profileId || saving) return;
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const { data, error: saveError } = await supabase.from("daily_reflections").upsert({
      profile_id: profileId,
      reflection_date: today,
      rating,
      note: note.trim() || null,
      updated_at: now,
    }, { onConflict: "profile_id,reflection_date" }).select("id,reflection_date,rating,note").single();
    if (saveError) {
      console.error("Could not save daily reflection", saveError);
      setError("We couldn’t save your reflection. Try again.");
    } else {
      setExisting(data);
      setRating(null);
      setNote("");
      window.dispatchEvent(new CustomEvent("with-daily-reflection-saved", { detail: { reflectionDate: today } }));
    }
    setSaving(false);
  }

  if (!profileId || existing === undefined || !showPrompt) return null;

  return (
    <>
      {showPrompt && (
        <section style={{ ...(cardStyle || { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "1.15rem", marginBottom: ".9rem" }), position: "relative" }}>
          <div style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".065em", marginBottom: 6 }}>Daily reflection</div>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 24, fontWeight: 600, lineHeight: 1.08, color: TEXT }}>How was today?</div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 5, marginBottom: 13 }}>Just mark the day. There’s nothing to optimize here.</div>
          <RatingScale value={rating} onChange={setRating} disabled={saving} styles={styles} />

          <div style={{ color: TEXT, fontSize: 12, fontWeight: 800, marginTop: 16, marginBottom: 6 }}>Anything from today worth remembering?</div>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={320}
            rows={3}
            placeholder="A sentence or two is plenty."
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.45, minHeight: 84 }}
          />
          <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.4, marginTop: 5 }}>Optional. This reflection is private to you.</div>
          {error && <div role="alert" style={{ color: WARN, fontSize: 11, lineHeight: 1.45, marginTop: 8 }}>{error}</div>}
          <button type="button" onClick={saveToday} disabled={!rating || saving} style={{ ...bigButton(brand.teal, brand.inkOn), marginTop: 12, opacity: !rating || saving ? .55 : 1 }}>{saving ? "Saving…" : "Save reflection"}</button>
        </section>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", margin: showPrompt ? "-3px 2px 12px" : "0 2px 12px" }}>
        <button type="button" onClick={() => setHistoryOpen(true)} style={{ border: "none", background: "none", color: brand.tealDark, fontSize: 11, fontWeight: 800, padding: "4px 0", display: "inline-flex", alignItems: "center", gap: 3 }}>
          Past reflections <ChevronRight size={13} strokeWidth={2} />
        </button>
      </div>

      {historyOpen && <ReflectionHistoryModal profileId={profileId} today={today} styles={styles} onClose={() => setHistoryOpen(false)} />}
    </>
  );
}

export function DailyReflectionPreferencePanel({ session, styles }) {
  const { SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, bigButton } = styles;
  const [profileId, setProfileId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const timeZone = session?.user?.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = dateKeyInTimeZone(new Date(), timeZone);

  useEffect(() => {
    let cancelled = false;
    async function loadPreference() {
      setLoading(true);
      setError("");
      try {
        const profile = await resolveOwnProfile(session?.user?.id);
        if (cancelled) return;
        setProfileId(profile?.id || "");
        setEnabled(profile?.daily_reflection_enabled !== false);
      } catch (loadError) {
        console.error("Could not load daily reflection preference", loadError);
        if (!cancelled) setError("We couldn’t load your daily reflection setting.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPreference();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  async function toggle(next) {
    if (!profileId || busy) return;
    setBusy(true);
    setError("");
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ daily_reflection_enabled: next })
      .eq("id", profileId);
    if (saveError) {
      console.error("Could not save daily reflection preference", saveError);
      setError("We couldn’t save that preference. Try again.");
    } else {
      setEnabled(next);
      window.dispatchEvent(new CustomEvent("with-daily-reflection-settings-changed"));
    }
    setBusy(false);
  }

  if (loading || !profileId) return null;

  return (
    <>
      <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>Daily reflection</div>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 21, fontWeight: 600, lineHeight: 1.2, color: TEXT }}>A small way to mark the day.</div>
            <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>
              After 6 PM, Today can ask how the day was from 1 to 5 and give you space for a sentence or two. Reflections stay private to you.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`${enabled ? "Turn off" : "Turn on"} daily reflection`}
            disabled={busy}
            onClick={() => toggle(!enabled)}
            style={{ width: 44, height: 25, borderRadius: 999, border: "none", padding: 3, background: enabled ? brand.teal : "#D7D7D2", display: "flex", alignItems: "center", justifyContent: enabled ? "flex-end" : "flex-start", flexShrink: 0, opacity: busy ? .55 : 1 }}
          >
            <span style={{ width: 19, height: 19, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
          </button>
        </div>
        {error && <div role="alert" style={{ color: WARN, fontSize: 11, marginTop: 10 }}>{error}</div>}
        <div style={{ background: SURFACE_2, borderRadius: 12, padding: "11px 12px", marginTop: 12 }}>
          <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45 }}>1 means Rough. 3 means Okay. 5 means Fantastic. The scale is intentionally fixed so it stays simple over time.</div>
          <button type="button" onClick={() => setHistoryOpen(true)} style={{ ...bigButton(SURFACE_2, brand.tealDark), width: "auto", minHeight: 36, padding: "8px 0 0", boxShadow: "none", textAlign: "left" }}>View past reflections</button>
        </div>
      </section>
      {historyOpen && <ReflectionHistoryModal profileId={profileId} today={today} styles={styles} onClose={() => setHistoryOpen(false)} />}
    </>
  );
}
