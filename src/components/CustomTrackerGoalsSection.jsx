import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";
import { readStoredActiveWithId } from "../withMemberships.js";

function numberLabel(value, maxDigits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return number.toLocaleString(undefined, { maximumFractionDigits: maxDigits });
}

function goalLabel(metric, goal) {
  if (!metric || !goal) return "No goal set";
  const target = numberLabel(goal.target_value);
  if (metric.value_type === "yes_no") return `${target} day${Number(goal.target_value) === 1 ? "" : "s"}/week`;
  if (metric.value_type === "duration") return `${target} min/${goal.period}`;
  if (metric.value_type === "quantity") return `${target}${metric.unit ? ` ${metric.unit}` : ""}/${goal.period}`;
  return `${target}/${goal.period}`;
}

function metricHint(metric) {
  if (metric.value_type === "yes_no") return "Choose how many days each week you want this to be true.";
  if (metric.value_type === "duration") return "Set a minutes target for a day or a week.";
  if (metric.value_type === "quantity") return `Set an amount${metric.unit ? ` in ${metric.unit}` : ""} for a day or a week.`;
  return "Set a count for a day or a week.";
}

export default function CustomTrackerGoalsSection({
  profileId: suppliedProfileId,
  profileName = "",
  activeCanEdit,
  focusMetricId = "",
  onFocusHandled,
  styles,
}) {
  const { SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, fieldLabel, inputStyle, bigButton } = styles;
  const [resolvedProfileId, setResolvedProfileId] = useState(suppliedProfileId || "");
  const [metrics, setMetrics] = useState([]);
  const [goals, setGoals] = useState({});
  const [editingMetricId, setEditingMetricId] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [periodInput, setPeriodInput] = useState("day");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const handledFocusRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function resolveProfile() {
      if (suppliedProfileId) {
        setResolvedProfileId(suppliedProfileId);
        return;
      }

      setResolvedProfileId("");
      try {
        if (activeCanEdit) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user?.id) return;
          const { data: ownProfile, error: ownError } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (ownError) throw ownError;
          if (!cancelled) setResolvedProfileId(ownProfile?.id || "");
          return;
        }

        const activeWithId = readStoredActiveWithId();
        if (!activeWithId || !profileName) return;

        const { data: members, error: memberError } = await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", activeWithId);
        if (memberError) throw memberError;
        const memberIds = [...new Set((members || []).map((member) => member.user_id).filter(Boolean))];

        let match = null;
        if (memberIds.length) {
          const { data: memberProfiles, error: profileError } = await supabase
            .from("profiles")
            .select("id,name,user_id")
            .in("user_id", memberIds);
          if (profileError) throw profileError;
          match = (memberProfiles || []).find((profile) => profile.name === profileName) || null;
        }

        if (!match) {
          const { data: legacyProfile, error: legacyError } = await supabase
            .from("profiles")
            .select("id,name,user_id")
            .eq("household_id", activeWithId)
            .eq("name", profileName)
            .is("user_id", null)
            .maybeSingle();
          if (legacyError) throw legacyError;
          match = legacyProfile || null;
        }

        if (!cancelled) setResolvedProfileId(match?.id || "");
      } catch (resolveError) {
        console.error("Could not resolve profile for custom goals", resolveError);
        if (!cancelled) setResolvedProfileId("");
      }
    }

    resolveProfile();
    return () => { cancelled = true; };
  }, [suppliedProfileId, profileName, activeCanEdit]);

  const load = useCallback(async () => {
    if (!resolvedProfileId) {
      setMetrics([]);
      setGoals({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const { data: metricRows, error: metricError } = await supabase
      .from("custom_metrics")
      .select("id,profile_id,name,value_type,unit,enabled,sort_order,created_at")
      .eq("profile_id", resolvedProfileId)
      .eq("enabled", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (metricError) {
      console.error("Could not load custom trackers for Goals", metricError);
      setMetrics([]);
      setGoals({});
      setError("We couldn’t load your custom tracker goals. Try again.");
      setLoading(false);
      return;
    }

    const goalCapable = (metricRows || []).filter((metric) => metric.value_type !== "rating");
    setMetrics(goalCapable);

    if (!goalCapable.length) {
      setGoals({});
      setLoading(false);
      return;
    }

    const { data: goalRows, error: goalError } = await supabase
      .from("custom_metric_goals")
      .select("metric_id,profile_id,target_value,period,updated_at")
      .eq("profile_id", resolvedProfileId)
      .in("metric_id", goalCapable.map((metric) => metric.id));

    if (goalError) {
      console.error("Could not load custom tracker goals", goalError);
      setGoals({});
      setError("We couldn’t load your custom tracker goals. Try again.");
    } else {
      setGoals(Object.fromEntries((goalRows || []).map((goal) => [goal.metric_id, goal])));
    }
    setLoading(false);
  }, [resolvedProfileId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("with-custom-goal-saved", refresh);
    return () => window.removeEventListener("with-custom-goal-saved", refresh);
  }, [load]);

  function beginEdit(metric) {
    const goal = goals[metric.id];
    setEditingMetricId(metric.id);
    setTargetInput(goal ? String(goal.target_value) : "");
    setPeriodInput(metric.value_type === "yes_no" ? "week" : (goal?.period || "day"));
    setError("");
  }

  useEffect(() => {
    if (!focusMetricId || loading || handledFocusRef.current === focusMetricId) return;
    const metric = metrics.find((item) => item.id === focusMetricId);
    if (!metric) return;
    handledFocusRef.current = focusMetricId;
    if (activeCanEdit) beginEdit(metric);
    window.setTimeout(() => {
      document.getElementById(`custom-goal-${focusMetricId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    onFocusHandled?.();
  }, [focusMetricId, loading, metrics, activeCanEdit, onFocusHandled]);

  async function saveGoal(metric) {
    if (!activeCanEdit || busy || !resolvedProfileId) return;
    const target = Number(targetInput);
    if (!Number.isFinite(target) || target <= 0) {
      setError("Use a goal greater than zero.");
      return;
    }
    if (metric.value_type === "yes_no" && (!Number.isInteger(target) || target < 1 || target > 7)) {
      setError("Choose between 1 and 7 days per week.");
      return;
    }

    const period = metric.value_type === "yes_no" ? "week" : periodInput;
    setBusy(true);
    setError("");
    const { error: saveError } = await supabase.from("custom_metric_goals").upsert({
      metric_id: metric.id,
      profile_id: resolvedProfileId,
      target_value: target,
      period,
      updated_at: new Date().toISOString(),
    }, { onConflict: "metric_id" });

    if (saveError) {
      console.error("Could not save custom tracker goal", saveError);
      setError("We couldn’t save that goal. Try again.");
      setBusy(false);
      return;
    }

    setGoals((previous) => ({ ...previous, [metric.id]: { metric_id: metric.id, profile_id: resolvedProfileId, target_value: target, period } }));
    setEditingMetricId("");
    setTargetInput("");
    setBusy(false);
    window.dispatchEvent(new CustomEvent("with-custom-goal-saved", { detail: { metricId: metric.id } }));
  }

  async function removeGoal(metric) {
    if (!activeCanEdit || busy || !goals[metric.id]) return;
    setBusy(true);
    setError("");
    const { error: removeError } = await supabase.from("custom_metric_goals").delete().eq("metric_id", metric.id);
    if (removeError) {
      console.error("Could not remove custom tracker goal", removeError);
      setError("We couldn’t remove that goal. Try again.");
      setBusy(false);
      return;
    }
    setGoals((previous) => {
      const next = { ...previous };
      delete next[metric.id];
      return next;
    });
    setEditingMetricId("");
    setBusy(false);
    window.dispatchEvent(new CustomEvent("with-custom-goal-saved", { detail: { metricId: metric.id } }));
  }

  const visibleMetrics = useMemo(
    () => activeCanEdit ? metrics : metrics.filter((metric) => Boolean(goals[metric.id])),
    [activeCanEdit, metrics, goals]
  );

  if (loading || !visibleMetrics.length) return null;

  return (
    <section style={{ ...styles.cardStyle, marginTop: 14 }}>
      <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 7 }}>Your own trackers</div>
      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 23, fontWeight: 600, lineHeight: 1.1, color: TEXT }}>Goals for the things you chose to track</div>
      <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 5, marginBottom: 12 }}>
        A tracker can simply be something you notice. Add a target only when one is useful.
      </div>

      {error && <div role="alert" style={{ color: WARN, fontSize: 12, marginBottom: 10 }}>{error}</div>}

      {visibleMetrics.map((metric, index) => {
        const goal = goals[metric.id];
        const editing = editingMetricId === metric.id;
        return (
          <div id={`custom-goal-${metric.id}`} key={metric.id} style={{ padding: "12px 0", borderTop: index ? `1px solid ${BORDER}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>{metric.name}</div>
                <div style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 3 }}>{goal ? goalLabel(metric, goal) : "No goal set"}</div>
              </div>
              {activeCanEdit && !editing && (
                <button type="button" onClick={() => beginEdit(metric)} style={{ border: "none", background: "transparent", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "2px 0", flexShrink: 0 }}>
                  {goal ? "Edit goal" : "Set a goal"}
                </button>
              )}
            </div>

            {editing && (
              <div style={{ background: SURFACE_2, borderRadius: 11, padding: 12, marginTop: 10 }}>
                <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, marginBottom: 10 }}>{metricHint(metric)}</div>
                {metric.value_type === "yes_no" ? (
                  <div>
                    <div style={fieldLabel}>Days per week</div>
                    <input type="number" min="1" max="7" step="1" inputMode="numeric" value={targetInput} onChange={(event) => setTargetInput(event.target.value)} placeholder="5" style={inputStyle} />
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 132px", gap: 8 }}>
                    <div>
                      <div style={fieldLabel}>{metric.value_type === "duration" ? "Minutes" : metric.value_type === "quantity" ? `Amount${metric.unit ? ` (${metric.unit})` : ""}` : "Count"}</div>
                      <input type="number" min="0" step={metric.value_type === "count" ? "1" : "0.1"} inputMode="decimal" value={targetInput} onChange={(event) => setTargetInput(event.target.value)} placeholder="Optional" style={inputStyle} />
                    </div>
                    <div>
                      <div style={fieldLabel}>How often</div>
                      <select value={periodInput} onChange={(event) => setPeriodInput(event.target.value)} style={inputStyle}>
                        <option value="day">Per day</option>
                        <option value="week">Per week</option>
                      </select>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 11 }}>
                  <div>
                    {goal && (
                      <button type="button" disabled={busy} onClick={() => removeGoal(metric)} style={{ border: "none", background: "transparent", color: WARN, fontSize: 11, fontWeight: 700, padding: "7px 0" }}>Remove goal</button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" disabled={busy} onClick={() => { setEditingMetricId(""); setError(""); }} style={{ border: "none", background: "transparent", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: "8px 4px" }}>Cancel</button>
                    <button type="button" disabled={busy} onClick={() => saveGoal(metric)} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", minHeight: 38, padding: "8px 13px", fontSize: 12 }}>{busy ? "Saving…" : "Save goal"}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ color: TEXT_MUTED, fontSize: 10, lineHeight: 1.45, marginTop: 5 }}>
        Turning a tracker off hides its goal from active use, but does not delete the goal.
      </div>
    </section>
  );
}

export { goalLabel };
