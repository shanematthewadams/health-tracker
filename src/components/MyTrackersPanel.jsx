import { useEffect, useMemo, useState } from "react";
import { Activity, Droplet, Footprints, Plus, Scale, Timer, Utensils } from "lucide-react";
import { brand, metricColors } from "../brand.jsx";
import { supabase } from "../supabase.js";

const STANDARD_TRACKERS = [
  { id: "weight", label: "Weight", description: "Weight and weight trends", icon: Scale, color: metricColors.weight },
  { id: "food", label: "Nutrition", description: "Food, calories, and macros", icon: Utensils, color: metricColors.food },
  { id: "steps", label: "Steps", description: "Daily step totals", icon: Footprints, color: metricColors.steps },
  { id: "water", label: "Water", description: "Daily water intake", icon: Droplet, color: metricColors.water },
  { id: "activity", label: "Activity", description: "Movement and calories burned", icon: Activity, color: metricColors.activity },
  { id: "fasting", label: "Fasting", description: "Fasts and fasting history", icon: Timer, color: brand.teal },
];

const CUSTOM_TYPES = [
  { id: "yes_no", label: "Yes / No", example: "Meditated today" },
  { id: "count", label: "Count", example: "Glasses, sessions, servings" },
  { id: "duration", label: "Minutes", example: "Mindfulness, reading, stretching" },
  { id: "quantity", label: "Amount", example: "Pages, miles, cups, anything measurable" },
];

const DEFAULT_PREF = { enabled: true, visibility: "all_withs" };

function visibilityLabel(visibility, selectedIds, withs) {
  if (visibility === "private") return "Only me";
  if (visibility === "selected_withs") {
    const selected = withs.filter((item) => selectedIds?.has(item.id));
    if (!selected.length) return "Only me for now";
    if (selected.length === 1) return `Shared with ${selected[0].name}`;
    return `Shared with ${selected.length} Withs`;
  }
  if (withs.length === 1) return `Shared with ${withs[0].name}`;
  return "Shared with all my Withs";
}

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
        transition: "background .15s ease",
      }}
    >
      <span style={{ width: 19, height: 19, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
    </button>
  );
}

export default function MyTrackersPanel({ session, styles }) {
  const { SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, fieldLabel, inputStyle, bigButton } = styles;
  const [profileId, setProfileId] = useState(null);
  const [withs, setWiths] = useState([]);
  const [standardPrefs, setStandardPrefs] = useState({});
  const [standardWiths, setStandardWiths] = useState({});
  const [customMetrics, setCustomMetrics] = useState([]);
  const [customWiths, setCustomWiths] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [expandedPrivacy, setExpandedPrivacy] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState("duration");
  const [customUnit, setCustomUnit] = useState("");

  const withMap = useMemo(() => Object.fromEntries(withs.map((item) => [item.id, item])), [withs]);

  async function load() {
    if (!session?.user?.id) return;
    setLoading(true);
    setError("");
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile?.id) {
        setProfileId(null);
        setLoading(false);
        return;
      }
      setProfileId(profile.id);

      const [prefResult, membershipResult, standardWithResult, customResult] = await Promise.all([
        supabase.from("profile_metric_preferences").select("profile_id, metric_type, enabled, visibility").eq("profile_id", profile.id),
        supabase.from("household_members").select("household_id").eq("user_id", session.user.id),
        supabase.from("profile_metric_withs").select("metric_type, household_id").eq("profile_id", profile.id),
        supabase.from("custom_metrics").select("id, profile_id, name, value_type, unit, enabled, visibility, sort_order, created_at").eq("profile_id", profile.id).order("sort_order").order("created_at"),
      ]);
      for (const result of [prefResult, membershipResult, standardWithResult, customResult]) if (result.error) throw result.error;

      const nextPrefs = {};
      STANDARD_TRACKERS.forEach((tracker) => { nextPrefs[tracker.id] = { ...DEFAULT_PREF }; });
      (prefResult.data || []).forEach((row) => {
        nextPrefs[row.metric_type] = { enabled: row.enabled !== false, visibility: row.visibility || "all_withs" };
      });
      setStandardPrefs(nextPrefs);

      const nextStandardWiths = {};
      (standardWithResult.data || []).forEach((row) => {
        if (!nextStandardWiths[row.metric_type]) nextStandardWiths[row.metric_type] = new Set();
        nextStandardWiths[row.metric_type].add(row.household_id);
      });
      setStandardWiths(nextStandardWiths);

      const membershipIds = [...new Set((membershipResult.data || []).map((row) => row.household_id).filter(Boolean))];
      if (membershipIds.length) {
        const { data: householdRows, error: householdError } = await supabase.from("households").select("id, name").in("id", membershipIds);
        if (householdError) throw householdError;
        const ordered = membershipIds.map((id) => (householdRows || []).find((item) => item.id === id)).filter(Boolean);
        setWiths(ordered);
      } else {
        setWiths([]);
      }

      const metrics = customResult.data || [];
      setCustomMetrics(metrics);
      if (metrics.length) {
        const { data: mappingRows, error: mappingError } = await supabase.from("custom_metric_withs").select("metric_id, household_id").in("metric_id", metrics.map((item) => item.id));
        if (mappingError) throw mappingError;
        const nextCustomWiths = {};
        (mappingRows || []).forEach((row) => {
          if (!nextCustomWiths[row.metric_id]) nextCustomWiths[row.metric_id] = new Set();
          nextCustomWiths[row.metric_id].add(row.household_id);
        });
        setCustomWiths(nextCustomWiths);
      } else {
        setCustomWiths({});
      }
    } catch (loadError) {
      console.error("Could not load tracker preferences", loadError);
      setError("We couldn’t load your tracker settings. Refresh and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [session?.user?.id]);

  async function saveStandard(metricType, patch) {
    if (!profileId) return;
    const current = standardPrefs[metricType] || DEFAULT_PREF;
    const next = { ...current, ...patch };
    const key = `standard:${metricType}`;
    setBusyKey(key);
    setError("");
    setStandardPrefs((previous) => ({ ...previous, [metricType]: next }));
    try {
      const { error: saveError } = await supabase.from("profile_metric_preferences").upsert({
        profile_id: profileId,
        metric_type: metricType,
        enabled: next.enabled,
        visibility: next.visibility,
        updated_at: new Date().toISOString(),
      }, { onConflict: "profile_id,metric_type" });
      if (saveError) throw saveError;

      if (patch.visibility === "selected_withs" && !(standardWiths[metricType]?.size)) {
        const ids = withs.map((item) => item.id);
        if (ids.length) {
          const { error: mappingError } = await supabase.from("profile_metric_withs").insert(ids.map((householdId) => ({ profile_id: profileId, metric_type: metricType, household_id: householdId })));
          if (mappingError) throw mappingError;
          setStandardWiths((previous) => ({ ...previous, [metricType]: new Set(ids) }));
        }
      }
    } catch (saveError) {
      console.error("Could not save tracker preference", saveError);
      setStandardPrefs((previous) => ({ ...previous, [metricType]: current }));
      setError("We couldn’t save that tracker setting. Try again.");
    } finally {
      setBusyKey("");
    }
  }

  async function toggleStandardWith(metricType, householdId, checked) {
    if (!profileId) return;
    const key = `standard-with:${metricType}:${householdId}`;
    setBusyKey(key);
    setError("");
    const current = new Set(standardWiths[metricType] || []);
    const next = new Set(current);
    checked ? next.add(householdId) : next.delete(householdId);
    setStandardWiths((previous) => ({ ...previous, [metricType]: next }));
    try {
      const query = checked
        ? supabase.from("profile_metric_withs").insert({ profile_id: profileId, metric_type: metricType, household_id: householdId })
        : supabase.from("profile_metric_withs").delete().eq("profile_id", profileId).eq("metric_type", metricType).eq("household_id", householdId);
      const { error: mappingError } = await query;
      if (mappingError) throw mappingError;
    } catch (mappingError) {
      console.error("Could not update tracker sharing", mappingError);
      setStandardWiths((previous) => ({ ...previous, [metricType]: current }));
      setError("We couldn’t change who sees that tracker. Try again.");
    } finally {
      setBusyKey("");
    }
  }

  async function saveCustom(metricId, patch) {
    const metric = customMetrics.find((item) => item.id === metricId);
    if (!metric) return;
    const next = { ...metric, ...patch };
    const key = `custom:${metricId}`;
    setBusyKey(key);
    setError("");
    setCustomMetrics((previous) => previous.map((item) => item.id === metricId ? next : item));
    try {
      const { error: saveError } = await supabase.from("custom_metrics").update({
        enabled: next.enabled,
        visibility: next.visibility,
        updated_at: new Date().toISOString(),
      }).eq("id", metricId);
      if (saveError) throw saveError;
      if (patch.visibility === "selected_withs" && !(customWiths[metricId]?.size)) {
        const ids = withs.map((item) => item.id);
        if (ids.length) {
          const { error: mappingError } = await supabase.from("custom_metric_withs").insert(ids.map((householdId) => ({ metric_id: metricId, household_id: householdId })));
          if (mappingError) throw mappingError;
          setCustomWiths((previous) => ({ ...previous, [metricId]: new Set(ids) }));
        }
      }
    } catch (saveError) {
      console.error("Could not save custom tracker", saveError);
      setCustomMetrics((previous) => previous.map((item) => item.id === metricId ? metric : item));
      setError("We couldn’t save that custom tracker. Try again.");
    } finally {
      setBusyKey("");
    }
  }

  async function toggleCustomWith(metricId, householdId, checked) {
    const key = `custom-with:${metricId}:${householdId}`;
    setBusyKey(key);
    setError("");
    const current = new Set(customWiths[metricId] || []);
    const next = new Set(current);
    checked ? next.add(householdId) : next.delete(householdId);
    setCustomWiths((previous) => ({ ...previous, [metricId]: next }));
    try {
      const query = checked
        ? supabase.from("custom_metric_withs").insert({ metric_id: metricId, household_id: householdId })
        : supabase.from("custom_metric_withs").delete().eq("metric_id", metricId).eq("household_id", householdId);
      const { error: mappingError } = await query;
      if (mappingError) throw mappingError;
    } catch (mappingError) {
      console.error("Could not update custom tracker sharing", mappingError);
      setCustomWiths((previous) => ({ ...previous, [metricId]: current }));
      setError("We couldn’t change who sees that tracker. Try again.");
    } finally {
      setBusyKey("");
    }
  }

  async function createCustomMetric() {
    if (!profileId) return;
    const name = customName.trim();
    if (!name) {
      setError("Give your tracker a name first.");
      return;
    }
    const unit = customType === "duration" ? "min" : customType === "quantity" ? customUnit.trim() : null;
    if (customType === "quantity" && !unit) {
      setError("Add a unit so With knows what the amount means, like pages, miles, or cups.");
      return;
    }
    setBusyKey("create-custom");
    setError("");
    try {
      const { data: created, error: createError } = await supabase.from("custom_metrics").insert({
        profile_id: profileId,
        name,
        value_type: customType,
        unit,
        enabled: true,
        visibility: "all_withs",
        sort_order: customMetrics.length,
      }).select("id, profile_id, name, value_type, unit, enabled, visibility, sort_order, created_at").single();
      if (createError) throw createError;
      setCustomMetrics((previous) => [...previous, created]);
      setCustomName("");
      setCustomType("duration");
      setCustomUnit("");
      setAddingCustom(false);
    } catch (createError) {
      console.error("Could not create custom tracker", createError);
      setError("We couldn’t create that tracker. Try again.");
    } finally {
      setBusyKey("");
    }
  }

  function PrivacyControls({ itemKey, visibility, selectedIds, onVisibility, onToggleWith }) {
    const expanded = expandedPrivacy === itemKey;
    return (
      <div style={{ marginTop: 7 }}>
        <button
          type="button"
          onClick={() => setExpandedPrivacy(expanded ? "" : itemKey)}
          style={{ border: "none", background: "transparent", color: brand.tealDark, padding: "2px 0", fontSize: 11, fontWeight: 800, textAlign: "left" }}
        >
          {visibilityLabel(visibility, selectedIds, withs)} · {expanded ? "Done" : "Change"}
        </button>
        {expanded && (
          <div style={{ background: SURFACE_2, borderRadius: 10, padding: 10, marginTop: 7 }}>
            <div style={{ ...fieldLabel, marginBottom: 6 }}>Who can see this?</div>
            <select value={visibility} onChange={(event) => onVisibility(event.target.value)} style={{ ...inputStyle, minHeight: 40, padding: "8px 10px", fontSize: 13 }}>
              <option value="all_withs">Everyone I’m With</option>
              <option value="selected_withs">Only selected Withs</option>
              <option value="private">Only me</option>
            </select>
            {visibility === "selected_withs" && (
              <div style={{ marginTop: 9 }}>
                {withs.map((withItem) => {
                  const checked = selectedIds?.has(withItem.id) || false;
                  return (
                    <label key={withItem.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 2px", color: TEXT, fontSize: 12 }}>
                      <input type="checkbox" checked={checked} onChange={(event) => onToggleWith(withItem.id, event.target.checked)} />
                      <span>{withItem.name}</span>
                    </label>
                  );
                })}
                {!withs.length && <div style={{ color: TEXT_MUTED, fontSize: 12 }}>You aren’t in a With yet, so this stays private.</div>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function TrackerRow({ icon: Icon, color, label, description, enabled, visibility, selectedIds, itemKey, onEnabled, onVisibility, onToggleWith, customMeta = null }) {
    return (
      <div style={{ padding: "13px 0", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0, 1fr) auto", gap: 10, alignItems: "center" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: SURFACE_2 }}>
            <Icon size={17} color={color} strokeWidth={1.9} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{label}</div>
            <div style={{ fontSize: 11, lineHeight: 1.35, color: TEXT_MUTED, marginTop: 2 }}>{description}</div>
            {customMeta && <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 3 }}>{customMeta}</div>}
          </div>
          <Toggle checked={enabled} disabled={busyKey === itemKey} onChange={onEnabled} label={`${enabled ? "Turn off" : "Turn on"} ${label}`} />
        </div>
        <div style={{ paddingLeft: 44, opacity: enabled ? 1 : 0.7 }}>
          <PrivacyControls itemKey={itemKey} visibility={visibility} selectedIds={selectedIds} onVisibility={onVisibility} onToggleWith={onToggleWith} />
          {!enabled && <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.4, marginTop: 5 }}>Off for now. Your history stays right where it is.</div>}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 24 }}>
        <div style={{ color: TEXT_MUTED, fontSize: 12 }}>Loading your trackers…</div>
      </section>
    );
  }

  if (!profileId) return null;

  return (
    <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>My Trackers</div>
      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 23, fontWeight: 600, lineHeight: 1.15, color: TEXT }}>Track what matters to you.</div>
      <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 5, marginBottom: 8 }}>
        Turn things on or off without losing your history. You also decide what the people you’re With can see.
      </div>

      {error && <div style={{ color: WARN, background: "#FFF1F0", borderRadius: 9, padding: "8px 10px", fontSize: 11, margin: "10px 0" }}>{error}</div>}

      <div>
        {STANDARD_TRACKERS.map((tracker) => {
          const pref = standardPrefs[tracker.id] || DEFAULT_PREF;
          return (
            <TrackerRow
              key={tracker.id}
              icon={tracker.icon}
              color={tracker.color}
              label={tracker.label}
              description={tracker.description}
              enabled={pref.enabled}
              visibility={pref.visibility}
              selectedIds={standardWiths[tracker.id] || new Set()}
              itemKey={`standard:${tracker.id}`}
              onEnabled={(enabled) => saveStandard(tracker.id, { enabled })}
              onVisibility={(visibility) => saveStandard(tracker.id, { visibility })}
              onToggleWith={(householdId, checked) => toggleStandardWith(tracker.id, householdId, checked)}
            />
          );
        })}
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 19, fontWeight: 600, color: TEXT }}>Your own trackers</div>
        <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginTop: 4 }}>Make something that With didn’t think of. Mindfulness in minutes. Reading in pages. Whatever is useful to you.</div>

        {customMetrics.map((metric) => {
          const type = CUSTOM_TYPES.find((item) => item.id === metric.value_type);
          const meta = metric.value_type === "duration" ? "Tracked in minutes" : metric.unit ? `Tracked in ${metric.unit}` : type?.label;
          return (
            <TrackerRow
              key={metric.id}
              icon={Timer}
              color={brand.teal}
              label={metric.name}
              description={type?.example || "Your custom tracker"}
              customMeta={meta}
              enabled={metric.enabled !== false}
              visibility={metric.visibility || "all_withs"}
              selectedIds={customWiths[metric.id] || new Set()}
              itemKey={`custom:${metric.id}`}
              onEnabled={(enabled) => saveCustom(metric.id, { enabled })}
              onVisibility={(visibility) => saveCustom(metric.id, { visibility })}
              onToggleWith={(householdId, checked) => toggleCustomWith(metric.id, householdId, checked)}
            />
          );
        })}

        {!addingCustom ? (
          <button type="button" onClick={() => { setError(""); setAddingCustom(true); }} style={{ border: "none", background: "transparent", color: brand.tealDark, display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 0 2px", fontSize: 12, fontWeight: 800 }}>
            <Plus size={15} strokeWidth={2.2} /> Add your own tracker
          </button>
        ) : (
          <div style={{ background: SURFACE_2, borderRadius: 12, padding: 13, marginTop: 12 }}>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, fontWeight: 600, color: TEXT, marginBottom: 10 }}>Add a tracker</div>
            <div style={fieldLabel}>What do you want to track?</div>
            <input value={customName} maxLength={60} onChange={(event) => setCustomName(event.target.value)} placeholder="Mindfulness" style={{ ...inputStyle, marginBottom: 11 }} />

            <div style={fieldLabel}>How should it be measured?</div>
            <select value={customType} onChange={(event) => { setCustomType(event.target.value); setCustomUnit(""); }} style={{ ...inputStyle, marginBottom: 11 }}>
              {CUSTOM_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
            </select>

            {customType === "quantity" && (
              <>
                <div style={fieldLabel}>Unit</div>
                <input value={customUnit} maxLength={24} onChange={(event) => setCustomUnit(event.target.value)} placeholder="pages, miles, cups…" style={{ ...inputStyle, marginBottom: 11 }} />
              </>
            )}

            <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.4, marginBottom: 12 }}>
              {CUSTOM_TYPES.find((type) => type.id === customType)?.example}
            </div>
            <div style={{ display: "flex", gap: 9 }}>
              <button type="button" onClick={() => { setAddingCustom(false); setCustomName(""); setCustomType("duration"); setCustomUnit(""); setError(""); }} style={{ border: "none", background: "transparent", color: TEXT_MUTED, padding: "9px 3px", fontSize: 12, fontWeight: 700 }}>Cancel</button>
              <button type="button" disabled={busyKey === "create-custom"} onClick={createCustomMetric} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", minHeight: 40, padding: "9px 15px", fontSize: 13 }}>
                {busyKey === "create-custom" ? "Adding…" : "Add tracker"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
