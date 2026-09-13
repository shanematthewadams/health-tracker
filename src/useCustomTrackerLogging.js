import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

function announceCustomTrackerChange(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("with-custom-tracker-saved", { detail }));
}

export function useCustomTrackerLogging(profileId, canEdit = false, entryDate = null) {
  const [metrics, setMetrics] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!profileId) {
      setMetrics([]);
      setEntries({});
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const { data: metricRows, error: metricError } = await supabase
      .from("custom_metrics")
      .select("id,profile_id,name,value_type,unit,enabled,visibility,sort_order,icon_key,rating_low_label,rating_high_label")
      .eq("profile_id", profileId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (metricError) {
      setError(metricError.message);
      setLoading(false);
      return;
    }
    const visibleMetrics = canEdit ? (metricRows || []).filter((metric) => metric.enabled) : (metricRows || []);
    setMetrics(visibleMetrics);

    if (!entryDate || !visibleMetrics.length) {
      setEntries({});
      setLoading(false);
      return;
    }
    const { data: entryRows, error: entryError } = await supabase
      .from("custom_metric_entries")
      .select("id,metric_id,profile_id,entry_date,boolean_value,numeric_value,updated_at")
      .eq("profile_id", profileId)
      .eq("entry_date", entryDate);
    if (entryError) setError(entryError.message);
    setEntries(Object.fromEntries((entryRows || []).map((entry) => [entry.metric_id, entry])));
    setLoading(false);
  }, [profileId, canEdit, entryDate]);

  useEffect(() => { load(); }, [load]);

  const saveValue = useCallback(async (metric, value) => {
    if (!canEdit || !profileId || !entryDate || !metric?.id) return false;
    setSavingId(metric.id);
    setError("");
    const payload = {
      metric_id: metric.id,
      profile_id: profileId,
      entry_date: entryDate,
      boolean_value: metric.value_type === "yes_no" ? Boolean(value) : null,
      numeric_value: metric.value_type === "yes_no" ? null : Number(value),
    };
    const { data, error: saveError } = await supabase
      .from("custom_metric_entries")
      .upsert(payload, { onConflict: "metric_id,entry_date" })
      .select("id,metric_id,profile_id,entry_date,boolean_value,numeric_value,updated_at")
      .single();
    if (saveError) {
      setError(saveError.message);
      setSavingId("");
      return false;
    }
    setEntries((current) => ({ ...current, [metric.id]: data }));
    announceCustomTrackerChange({ action: "save", metricId: metric.id, profileId, entryDate, entry: data });
    setSavingId("");
    return true;
  }, [canEdit, profileId, entryDate]);

  const deleteValue = useCallback(async (metricId) => {
    if (!canEdit || !metricId || !entryDate) return false;
    setSavingId(metricId);
    setError("");
    const { error: deleteError } = await supabase
      .from("custom_metric_entries")
      .delete()
      .eq("metric_id", metricId)
      .eq("entry_date", entryDate);
    if (deleteError) {
      setError(deleteError.message);
      setSavingId("");
      return false;
    }
    setEntries((current) => {
      const next = { ...current };
      delete next[metricId];
      return next;
    });
    announceCustomTrackerChange({ action: "delete", metricId, profileId, entryDate });
    setSavingId("");
    return true;
  }, [canEdit, profileId, entryDate]);

  return { metrics, entries, loading, savingId, error, reload: load, saveValue, deleteValue };
}
