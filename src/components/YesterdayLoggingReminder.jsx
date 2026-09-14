import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";

const STANDARD_LABELS = {
  food: "Nutrition",
  weight: "Weight",
  activity: "Activity",
  water: "Water",
  steps: "Steps",
};

function shiftDate(dateStr, delta) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function hasStandardEntry(user, metricType, date) {
  if (!user) return false;
  if (metricType === "food") return (user.foods || []).some((entry) => entry.date === date);
  if (metricType === "weight") return (user.weights || []).some((entry) => entry.date === date);
  if (metricType === "activity") return (user.activities || []).some((entry) => entry.date === date);
  if (metricType === "water") return (user.water || []).some((entry) => entry.date === date);
  if (metricType === "steps") return (user.steps || []).some((entry) => entry.date === date);
  return false;
}

function readableList(labels) {
  if (labels.length <= 1) return labels[0] || "";
  if (labels.length === 2) return `${labels[0]} or ${labels[1]}`;
  if (labels.length <= 4) return `${labels.slice(0, -1).join(", ")}, or ${labels.at(-1)}`;
  return `${labels.slice(0, 3).join(", ")}, or ${labels.length - 3} more`;
}

export default function YesterdayLoggingReminder({
  activeUser,
  activeCanEdit,
  data,
  today,
  openLog,
  openProfile,
  styles,
}) {
  const { SURFACE_2, BORDER, TEXT, TEXT_MUTED } = styles;
  const [profileId, setProfileId] = useState("");
  const [missing, setMissing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const yesterday = useMemo(() => shiftDate(today, -1), [today]);

  const load = useCallback(async () => {
    if (!activeCanEdit) {
      setMissing([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setMissing([]);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,logging_reminders_enabled,logging_reminder_dismissed_date")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile?.id || profile.logging_reminders_enabled !== true || profile.logging_reminder_dismissed_date === today) {
        setProfileId(profile?.id || "");
        setMissing([]);
        setLoading(false);
        return;
      }
      setProfileId(profile.id);

      const [standardResult, customResult] = await Promise.all([
        supabase
          .from("profile_metric_preferences")
          .select("metric_type,enabled,logging_reminder_enabled")
          .eq("profile_id", profile.id)
          .eq("enabled", true)
          .eq("logging_reminder_enabled", true),
        supabase
          .from("custom_metrics")
          .select("id,name,enabled,logging_reminder_enabled")
          .eq("profile_id", profile.id)
          .eq("enabled", true)
          .eq("logging_reminder_enabled", true),
      ]);
      if (standardResult.error) throw standardResult.error;
      if (customResult.error) throw customResult.error;

      const user = data?.[activeUser];
      const missingStandard = (standardResult.data || [])
        .filter((row) => row.metric_type !== "fasting")
        .filter((row) => !hasStandardEntry(user, row.metric_type, yesterday))
        .map((row) => ({ kind: "standard", id: row.metric_type, label: STANDARD_LABELS[row.metric_type] || row.metric_type }));

      const customMetrics = customResult.data || [];
      let loggedCustom = new Set();
      if (customMetrics.length) {
        const { data: customEntries, error: customEntryError } = await supabase
          .from("custom_metric_entries")
          .select("metric_id")
          .eq("profile_id", profile.id)
          .eq("entry_date", yesterday)
          .in("metric_id", customMetrics.map((metric) => metric.id));
        if (customEntryError) throw customEntryError;
        loggedCustom = new Set((customEntries || []).map((entry) => entry.metric_id));
      }

      const missingCustom = customMetrics
        .filter((metric) => !loggedCustom.has(metric.id))
        .map((metric) => ({ kind: "custom", id: metric.id, label: metric.name }));

      setMissing([...missingStandard, ...missingCustom]);
    } catch (error) {
      console.error("Could not load yesterday logging reminder", error);
      setMissing([]);
    } finally {
      setLoading(false);
    }
  }, [activeCanEdit, activeUser, data, today, yesterday]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("with-logging-reminder-settings-changed", refresh);
    window.addEventListener("with-custom-tracker-saved", refresh);
    window.addEventListener("with-standard-quick-add-saved", refresh);
    return () => {
      window.removeEventListener("with-logging-reminder-settings-changed", refresh);
      window.removeEventListener("with-custom-tracker-saved", refresh);
      window.removeEventListener("with-standard-quick-add-saved", refresh);
    };
  }, [load]);

  async function dismiss() {
    if (!profileId || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ logging_reminder_dismissed_date: today })
      .eq("id", profileId);
    if (!error) setMissing([]);
    else console.error("Could not dismiss logging reminder", error);
    setBusy(false);
  }

  function reviewYesterday() {
    const firstStandard = missing.find((item) => item.kind === "standard");
    openLog?.(firstStandard?.id || "food", yesterday);
  }

  if (loading || !activeCanEdit || !missing.length) return null;

  const labels = missing.map((item) => item.label);

  return (
    <section style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "13px 14px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: brand.surface, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <BellRing size={16} color={brand.tealDark} strokeWidth={1.9} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1.15, color: TEXT }}>Anything to add from yesterday?</div>
          <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>
            With doesn’t have a log for {readableList(labels)}. That doesn’t mean you missed anything, only that there’s no entry for the day.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 12px", marginTop: 9 }}>
            <button type="button" onClick={reviewYesterday} style={{ border: "none", background: "transparent", color: brand.tealDark, fontSize: 11, fontWeight: 800, padding: "4px 0" }}>Review yesterday</button>
            <button type="button" disabled={busy} onClick={dismiss} style={{ border: "none", background: "transparent", color: TEXT_MUTED, fontSize: 11, fontWeight: 700, padding: "4px 0" }}>{busy ? "Dismissing…" : "Dismiss"}</button>
            <button type="button" onClick={openProfile} style={{ border: "none", background: "transparent", color: TEXT_MUTED, fontSize: 10, fontWeight: 700, padding: "4px 0" }}>Manage reminders</button>
          </div>
        </div>
      </div>
    </section>
  );
}
