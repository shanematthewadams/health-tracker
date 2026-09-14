import { useEffect, useMemo, useState } from "react";
import { Activity, Droplet, Footprints, Scale, Sparkles, Utensils } from "lucide-react";
import { brand, metricColors } from "../brand.jsx";
import { supabase } from "../supabase.js";

const STANDARD_TRACKERS = [
  { id: "food", label: "Nutrition", icon: Utensils, color: metricColors.food },
  { id: "water", label: "Water", icon: Droplet, color: metricColors.water },
  { id: "steps", label: "Steps", icon: Footprints, color: metricColors.steps },
  { id: "weight", label: "Weight", icon: Scale, color: metricColors.weight },
  { id: "activity", label: "Activity", icon: Activity, color: metricColors.activity },
];

const RECOMMENDED_DAILY = new Set(["food", "water", "steps"]);

function Toggle({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 25,
        borderRadius: 999,
        border: "none",
        padding: 3,
        background: checked ? brand.teal : "#D7D7D2",
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        flexShrink: 0,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{ width: 19, height: 19, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
    </button>
  );
}

export default function LoggingRemindersPanel({ session, styles }) {
  const { SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN } = styles;
  const [profileId, setProfileId] = useState("");
  const [masterEnabled, setMasterEnabled] = useState(false);
  const [standardPrefs, setStandardPrefs] = useState({});
  const [customMetrics, setCustomMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!session?.user?.id) return;
    setLoading(true);
    setError("");
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,logging_reminders_enabled")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      setProfileId(profile.id);
      setMasterEnabled(profile.logging_reminders_enabled === true);

      const [standardResult, customResult] = await Promise.all([
        supabase
          .from("profile_metric_preferences")
          .select("metric_type,enabled,logging_reminder_enabled")
          .eq("profile_id", profile.id),
        supabase
          .from("custom_metrics")
          .select("id,name,value_type,enabled,logging_reminder_enabled,sort_order,created_at")
          .eq("profile_id", profile.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);
      if (standardResult.error) throw standardResult.error;
      if (customResult.error) throw customResult.error;

      setStandardPrefs(Object.fromEntries((standardResult.data || []).map((row) => [row.metric_type, row])));
      setCustomMetrics(customResult.data || []);
    } catch (loadError) {
      console.error("Could not load logging reminder preferences", loadError);
      setError("We couldn’t load your reminder settings. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [session?.user?.id]);

  const enabledStandard = useMemo(
    () => STANDARD_TRACKERS.filter((tracker) => standardPrefs[tracker.id]?.enabled !== false),
    [standardPrefs]
  );
  const enabledCustom = useMemo(
    () => customMetrics.filter((metric) => metric.enabled !== false),
    [customMetrics]
  );
  const selectedCount = useMemo(
    () => enabledStandard.filter((tracker) => standardPrefs[tracker.id]?.logging_reminder_enabled).length
      + enabledCustom.filter((metric) => metric.logging_reminder_enabled).length,
    [enabledStandard, enabledCustom, standardPrefs]
  );

  async function setMaster(nextEnabled) {
    if (!profileId || busyKey) return;
    setBusyKey("master");
    setError("");
    try {
      if (nextEnabled && selectedCount === 0) {
        const starterIds = enabledStandard.filter((tracker) => RECOMMENDED_DAILY.has(tracker.id)).map((tracker) => tracker.id);
        if (starterIds.length) {
          const { error: starterError } = await supabase.from("profile_metric_preferences").upsert(
            starterIds.map((metricType) => ({ profile_id: profileId, metric_type: metricType, logging_reminder_enabled: true })),
            { onConflict: "profile_id,metric_type" }
          );
          if (starterError) throw starterError;
          setStandardPrefs((previous) => {
            const next = { ...previous };
            starterIds.forEach((metricType) => {
              next[metricType] = { ...(next[metricType] || { metric_type: metricType, enabled: true }), logging_reminder_enabled: true };
            });
            return next;
          });
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ logging_reminders_enabled: nextEnabled })
        .eq("id", profileId);
      if (profileError) throw profileError;
      setMasterEnabled(nextEnabled);
      window.dispatchEvent(new CustomEvent("with-logging-reminder-settings-changed"));
    } catch (saveError) {
      console.error("Could not save logging reminder setting", saveError);
      setError("We couldn’t save that reminder setting. Try again.");
    } finally {
      setBusyKey("");
    }
  }

  async function toggleStandard(metricType, checked) {
    if (!profileId || busyKey) return;
    const previous = standardPrefs[metricType] || { metric_type: metricType, enabled: true, logging_reminder_enabled: false };
    setBusyKey(`standard:${metricType}`);
    setStandardPrefs((current) => ({ ...current, [metricType]: { ...previous, logging_reminder_enabled: checked } }));
    setError("");
    try {
      const { error: saveError } = await supabase.from("profile_metric_preferences").upsert({
        profile_id: profileId,
        metric_type: metricType,
        logging_reminder_enabled: checked,
      }, { onConflict: "profile_id,metric_type" });
      if (saveError) throw saveError;
      window.dispatchEvent(new CustomEvent("with-logging-reminder-settings-changed"));
    } catch (saveError) {
      console.error("Could not save standard logging reminder", saveError);
      setStandardPrefs((current) => ({ ...current, [metricType]: previous }));
      setError("We couldn’t save that reminder setting. Try again.");
    } finally {
      setBusyKey("");
    }
  }

  async function toggleCustom(metricId, checked) {
    if (busyKey) return;
    const previous = customMetrics;
    setBusyKey(`custom:${metricId}`);
    setCustomMetrics((current) => current.map((metric) => metric.id === metricId ? { ...metric, logging_reminder_enabled: checked } : metric));
    setError("");
    try {
      const { error: saveError } = await supabase
        .from("custom_metrics")
        .update({ logging_reminder_enabled: checked, updated_at: new Date().toISOString() })
        .eq("id", metricId);
      if (saveError) throw saveError;
      window.dispatchEvent(new CustomEvent("with-logging-reminder-settings-changed"));
    } catch (saveError) {
      console.error("Could not save custom logging reminder", saveError);
      setCustomMetrics(previous);
      setError("We couldn’t save that reminder setting. Try again.");
    } finally {
      setBusyKey("");
    }
  }

  if (loading || !profileId) return null;

  return (
    <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>Logging reminders</div>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 21, fontWeight: 600, lineHeight: 1.2, color: TEXT }}>A little help remembering, if you want it.</div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>
            With can gently point out things you chose to track that have no entry from yesterday. Reminders are off unless you turn them on.
          </div>
        </div>
        <Toggle
          checked={masterEnabled}
          disabled={busyKey === "master"}
          onChange={setMaster}
          label={`${masterEnabled ? "Turn off" : "Turn on"} logging reminders`}
        />
      </div>

      {error && <div role="alert" style={{ color: WARN, fontSize: 11, marginTop: 10 }}>{error}</div>}

      {masterEnabled && (
        <div style={{ background: SURFACE_2, borderRadius: 12, padding: "10px 12px", marginTop: 12 }}>
          <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, marginBottom: 8 }}>
            Choose what belongs in the reminder. We start with Nutrition, Water, and Steps when they’re available, and you can change that anytime.
          </div>

          {enabledStandard.map((tracker) => {
            const Icon = tracker.icon;
            const checked = standardPrefs[tracker.id]?.logging_reminder_enabled === true;
            return (
              <div key={tracker.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderTop: `1px solid ${BORDER}` }}>
                <Icon size={15} color={tracker.color} strokeWidth={1.9} />
                <span style={{ flex: 1, color: TEXT, fontSize: 12, fontWeight: 700 }}>{tracker.label}</span>
                <Toggle checked={checked} disabled={busyKey === `standard:${tracker.id}`} onChange={(next) => toggleStandard(tracker.id, next)} label={`${checked ? "Remove" : "Add"} ${tracker.label} ${checked ? "from" : "to"} logging reminders`} />
              </div>
            );
          })}

          {enabledCustom.map((metric) => {
            const checked = metric.logging_reminder_enabled === true;
            return (
              <div key={metric.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderTop: `1px solid ${BORDER}` }}>
                <Sparkles size={15} color={brand.teal} strokeWidth={1.9} />
                <span style={{ flex: 1, color: TEXT, fontSize: 12, fontWeight: 700 }}>{metric.name}</span>
                <Toggle checked={checked} disabled={busyKey === `custom:${metric.id}`} onChange={(next) => toggleCustom(metric.id, next)} label={`${checked ? "Remove" : "Add"} ${metric.name} ${checked ? "from" : "to"} logging reminders`} />
              </div>
            );
          })}

          {!enabledStandard.length && !enabledCustom.length && (
            <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "4px 0" }}>Turn on a tracker first, then you can include it here.</div>
          )}

          <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.45, marginTop: 8 }}>
            A blank day is only missing information. With never treats it as a missed target. Fasting stays out of these reminders because not fasting is not missing data.
          </div>
        </div>
      )}
    </section>
  );
}
