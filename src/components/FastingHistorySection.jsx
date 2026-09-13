import { useEffect, useMemo, useState } from "react";
import { Pencil, Timer, X } from "lucide-react";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";
import { useOwnTrackerPreferences } from "../useOwnTrackerPreferences.js";

function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function zonedDateTimeToDate(dateStr, timeStr, timeZone) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desired;
  for (let i = 0; i < 2; i++) {
    const shown = zonedParts(new Date(guess), timeZone);
    const shownAsUtc = Date.UTC(Number(shown.year), Number(shown.month) - 1, Number(shown.day), Number(shown.hour), Number(shown.minute), 0);
    guess += desired - shownAsUtc;
  }
  return new Date(guess);
}

function localDateTimeParts(value, timeZone) {
  const parts = zonedParts(new Date(value), timeZone);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function durationLabel(minutes) {
  const total = Number(minutes);
  if (!Number.isFinite(total)) return "";
  const hours = Math.floor(total / 60);
  const mins = Math.round(total % 60);
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function goalLabel(minutes) {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return "";
  const hours = total / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

function dateRangeLabel(row, timeZone) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(row.started_at))} → ${formatter.format(new Date(row.ended_at))}`;
}

export default function FastingHistorySection({ activeCanEdit, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, WARN, SURFACE, SURFACE_2, inputStyle, bigButton } = styles;
  const { trackerEnabled } = useOwnTrackerPreferences(activeCanEdit);
  const [profileId, setProfileId] = useState(null);
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [goalHours, setGoalHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (session.user.user_metadata?.timezone) setTimeZone(session.user.user_metadata.timezone);
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profileError) {
        setError("We couldn’t load your fasting history.");
        setLoading(false);
        return;
      }
      setProfileId(data?.id || null);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: loadError } = await supabase
        .from("fasting_entries")
        .select("id,profile_id,started_at,ended_at,goal_minutes,duration_minutes,goal_reached")
        .eq("profile_id", profileId)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(12);
      if (cancelled) return;
      if (loadError) setError("We couldn’t load your fasting history.");
      else setRows(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  const editingRow = useMemo(() => rows.find((row) => row.id === editingId) || null, [rows, editingId]);

  function beginEdit(row) {
    const start = localDateTimeParts(row.started_at, timeZone);
    const end = localDateTimeParts(row.ended_at, timeZone);
    setEditingId(row.id);
    setStartDate(start.date);
    setStartTime(start.time);
    setEndDate(end.date);
    setEndTime(end.time);
    setGoalHours(row.goal_minutes ? String(Number(row.goal_minutes) / 60) : "");
    setError("");
  }

  function cancelEdit() {
    setEditingId("");
    setError("");
  }

  async function saveEdit() {
    if (!editingRow || saving) return;
    const started = zonedDateTimeToDate(startDate, startTime, timeZone);
    const ended = zonedDateTimeToDate(endDate, endTime, timeZone);
    if (Number.isNaN(started.getTime()) || Number.isNaN(ended.getTime())) {
      setError("Choose valid start and end times.");
      return;
    }
    if (ended < started) {
      setError("The end of a fast can’t be before its start.");
      return;
    }
    if (ended.getTime() > Date.now()) {
      setError("A completed fast can’t end in the future.");
      return;
    }

    let goalMinutes = null;
    if (goalHours !== "") {
      const hours = Number(goalHours);
      if (!Number.isFinite(hours) || hours <= 0) {
        setError("Leave the goal blank or enter a number greater than 0.");
        return;
      }
      goalMinutes = Math.round(hours * 60);
    }

    setSaving(true);
    setError("");
    const { data, error: saveError } = await supabase
      .from("fasting_entries")
      .update({
        started_at: started.toISOString(),
        ended_at: ended.toISOString(),
        goal_minutes: goalMinutes,
      })
      .eq("id", editingRow.id)
      .select("id,profile_id,started_at,ended_at,goal_minutes,duration_minutes,goal_reached")
      .single();

    if (saveError) {
      setError("We couldn’t save that fast. Try again.");
    } else {
      setRows((current) => current.map((row) => row.id === data.id ? data : row).sort((a, b) => b.started_at.localeCompare(a.started_at)));
      setEditingId("");
      window.dispatchEvent(new CustomEvent("with-fasting-history-changed", { detail: { row: data } }));
    }
    setSaving(false);
  }

  if (!activeCanEdit || !trackerEnabled("fasting")) return null;

  return (
    <section style={{ marginTop: 24, marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <Timer size={15} color={brand.teal} strokeWidth={2} />
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".11em", fontWeight: 800, color: TEXT_MUTED }}>Fasting history</div>
      </div>
      <div style={{ height: 3, width: 46, background: brand.teal, marginTop: 7 }} />
      <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginTop: 9, marginBottom: 10 }}>
        Completed fasts are information, not a scorecard. Edit the timing if real life and the log got out of sync.
      </div>

      {loading && <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "10px 0" }}>Loading fasting history…</div>}
      {!loading && !rows.length && <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "10px 0" }}>No completed fasts yet.</div>}

      {rows.map((row) => (
        <div key={row.id} style={{ borderBottom: `1px solid ${BORDER}`, padding: "11px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 9 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{durationLabel(row.duration_minutes)}</div>
              <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{dateRangeLabel(row, timeZone)}</div>
              {row.goal_minutes && (
                <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 3 }}>
                  Goal {goalLabel(row.goal_minutes)}{row.goal_reached === true ? " · reached" : row.goal_reached === false ? " · ended before goal" : ""}
                </div>
              )}
            </div>
            <button type="button" onClick={() => beginEdit(row)} aria-label="Edit completed fast" style={{ border: "none", background: "transparent", color: brand.tealDark, padding: 7, display: "grid", placeItems: "center" }}>
              <Pencil size={15} strokeWidth={1.8} />
            </button>
            <div style={{ width: 1 }} />
          </div>

          {editingId === row.id && (
            <div style={{ marginTop: 11, background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: TEXT }}>Edit completed fast</div>
                <button type="button" onClick={cancelEdit} aria-label="Cancel editing fast" style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: 3, display: "grid", placeItems: "center" }}><X size={15} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 800, marginBottom: 4 }}>Start date</div><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={{ ...inputStyle, padding: "9px" }} /></div>
                <div><div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 800, marginBottom: 4 }}>Start time</div><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} style={{ ...inputStyle, padding: "9px" }} /></div>
                <div><div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 800, marginBottom: 4 }}>End date</div><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} style={{ ...inputStyle, padding: "9px" }} /></div>
                <div><div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 800, marginBottom: 4 }}>End time</div><input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} style={{ ...inputStyle, padding: "9px" }} /></div>
              </div>
              <div style={{ marginTop: 9 }}>
                <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 800, marginBottom: 4 }}>Goal hours (optional)</div>
                <input type="number" min="0.25" step="0.25" inputMode="decimal" value={goalHours} onChange={(event) => setGoalHours(event.target.value)} placeholder="No goal" style={inputStyle} />
              </div>
              {error && <div style={{ color: WARN, fontSize: 11, marginTop: 8 }}>{error}</div>}
              <button type="button" disabled={saving} onClick={saveEdit} style={{ ...bigButton(brand.teal, brand.inkOn), marginTop: 10, opacity: saving ? 0.65 : 1 }}>{saving ? "Saving…" : "Save fast"}</button>
            </div>
          )}
        </div>
      ))}

      {!editingId && error && <div style={{ color: WARN, fontSize: 11, marginTop: 8 }}>{error}</div>}
    </section>
  );
}
