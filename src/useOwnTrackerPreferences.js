import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase.js";

export const STANDARD_TRACKER_IDS = ["food", "weight", "activity", "water", "steps", "fasting"];

const DEFAULT_ENABLED = Object.fromEntries(STANDARD_TRACKER_IDS.map((id) => [id, true]));

export function useOwnTrackerPreferences(active = true) {
  const [enabledByMetric, setEnabledByMetric] = useState(DEFAULT_ENABLED);
  const [loading, setLoading] = useState(Boolean(active));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!active) {
        setEnabledByMetric(DEFAULT_ENABLED);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          if (!cancelled) setEnabledByMetric(DEFAULT_ENABLED);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (!profile?.id) {
          if (!cancelled) setEnabledByMetric(DEFAULT_ENABLED);
          return;
        }

        const { data: rows, error: preferenceError } = await supabase
          .from("profile_metric_preferences")
          .select("metric_type, enabled")
          .eq("profile_id", profile.id);
        if (preferenceError) throw preferenceError;

        const next = { ...DEFAULT_ENABLED };
        (rows || []).forEach((row) => {
          if (row.metric_type in next) next[row.metric_type] = row.enabled !== false;
        });
        if (!cancelled) setEnabledByMetric(next);
      } catch (error) {
        console.error("Could not load tracker preferences", error);
        if (!cancelled) setEnabledByMetric(DEFAULT_ENABLED);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [active]);

  const trackerEnabled = useCallback(
    (metricType) => !active || enabledByMetric[metricType] !== false,
    [active, enabledByMetric]
  );

  const enabledTrackerIds = useMemo(
    () => STANDARD_TRACKER_IDS.filter((id) => trackerEnabled(id)),
    [trackerEnabled]
  );

  return { enabledByMetric, trackerEnabled, enabledTrackerIds, loading };
}
