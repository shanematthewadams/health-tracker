import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

export const DEFAULT_QUICK_ADD_IDS = ["food", "weight", "activity", "water", "steps"];

function normalizeQuickAddIds(ids) {
  return [...new Set((ids || []).filter(Boolean))].slice(0, 5);
}

function rowForQuickAddId(profileId, id, position) {
  if (id.startsWith("custom:")) {
    return {
      profile_id: profileId,
      position,
      standard_metric_type: null,
      custom_metric_id: id.slice("custom:".length),
    };
  }
  return {
    profile_id: profileId,
    position,
    standard_metric_type: id,
    custom_metric_id: null,
  };
}

function quickAddIdForRow(row) {
  return row.standard_metric_type || (row.custom_metric_id ? `custom:${row.custom_metric_id}` : null);
}

export function useQuickAddPreferences(active = true) {
  const [profileId, setProfileId] = useState(null);
  const [quickAddIds, setQuickAddIds] = useState(DEFAULT_QUICK_ADD_IDS);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(Boolean(active));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!active) {
      setProfileId(null);
      setQuickAddIds(DEFAULT_QUICK_ADD_IDS);
      setConfigured(false);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setProfileId(null);
        setQuickAddIds(DEFAULT_QUICK_ADD_IDS);
        setConfigured(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile?.id) {
        setProfileId(null);
        setQuickAddIds(DEFAULT_QUICK_ADD_IDS);
        setConfigured(false);
        return;
      }

      setProfileId(profile.id);
      const [settingsResult, itemsResult] = await Promise.all([
        supabase
          .from("profile_quick_add_settings")
          .select("configured")
          .eq("profile_id", profile.id)
          .maybeSingle(),
        supabase
          .from("profile_quick_add_items")
          .select("position, standard_metric_type, custom_metric_id")
          .eq("profile_id", profile.id)
          .order("position"),
      ]);
      if (settingsResult.error) throw settingsResult.error;
      if (itemsResult.error) throw itemsResult.error;

      const isConfigured = settingsResult.data?.configured === true;
      setConfigured(isConfigured);
      if (isConfigured) {
        setQuickAddIds((itemsResult.data || []).map(quickAddIdForRow).filter(Boolean));
      } else {
        setQuickAddIds(DEFAULT_QUICK_ADD_IDS);
      }
    } catch (loadError) {
      console.error("Could not load Quick Add preferences", loadError);
      setQuickAddIds(DEFAULT_QUICK_ADD_IDS);
      setConfigured(false);
      setError("We couldn’t load your Quick Add shortcuts.");
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    load();
  }, [load]);

  const saveQuickAddIds = useCallback(async (ids) => {
    if (!active || !profileId) return false;
    const nextIds = normalizeQuickAddIds(ids);
    const previousIds = quickAddIds;
    const previousConfigured = configured;
    setSaving(true);
    setError("");
    setQuickAddIds(nextIds);
    setConfigured(true);

    try {
      const { error: settingsError } = await supabase
        .from("profile_quick_add_settings")
        .upsert({
          profile_id: profileId,
          configured: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "profile_id" });
      if (settingsError) throw settingsError;

      const { error: deleteError } = await supabase
        .from("profile_quick_add_items")
        .delete()
        .eq("profile_id", profileId);
      if (deleteError) throw deleteError;

      if (nextIds.length) {
        const rows = nextIds.map((id, index) => rowForQuickAddId(profileId, id, index + 1));
        const { error: insertError } = await supabase.from("profile_quick_add_items").insert(rows);
        if (insertError) throw insertError;
      }
      return true;
    } catch (saveError) {
      console.error("Could not save Quick Add preferences", saveError);
      setQuickAddIds(previousIds);
      setConfigured(previousConfigured);
      setError("We couldn’t save your Quick Add shortcuts. Try again.");

      try {
        await supabase.from("profile_quick_add_items").delete().eq("profile_id", profileId);
        if (previousConfigured && previousIds.length) {
          const restoreRows = previousIds.map((id, index) => rowForQuickAddId(profileId, id, index + 1));
          await supabase.from("profile_quick_add_items").insert(restoreRows);
        }
        await supabase.from("profile_quick_add_settings").upsert({
          profile_id: profileId,
          configured: previousConfigured,
          updated_at: new Date().toISOString(),
        }, { onConflict: "profile_id" });
      } catch (restoreError) {
        console.error("Could not restore Quick Add preferences after save failure", restoreError);
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [active, configured, profileId, quickAddIds]);

  return {
    quickAddIds,
    configured,
    loading,
    saving,
    error,
    saveQuickAddIds,
    reloadQuickAdd: load,
  };
}
