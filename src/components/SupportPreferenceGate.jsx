import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import { readStoredActiveWithId } from "../withMemberships.js";

export default function SupportPreferenceGate({ activeUser, activeCanEdit, personName, children }) {
  const householdId = readStoredActiveWithId();
  const [status, setStatus] = useState(activeCanEdit ? "enabled" : "loading");

  useEffect(() => {
    let cancelled = false;

    if (activeCanEdit) {
      setStatus("enabled");
      return () => { cancelled = true; };
    }

    setStatus("loading");

    async function loadPreference() {
      if (!householdId) {
        if (!cancelled) setStatus("error");
        return;
      }

      const { data: memberships, error: membershipsError } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", householdId);

      if (cancelled) return;
      if (membershipsError || !memberships?.length) {
        setStatus("error");
        return;
      }

      const memberUserIds = memberships.map((membership) => membership.user_id).filter(Boolean);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id,name,user_id,support_enabled")
        .in("user_id", memberUserIds)
        .eq("name", personName || activeUser)
        .limit(2);

      if (cancelled) return;
      if (profilesError || profiles?.length !== 1) {
        setStatus("error");
        return;
      }

      setStatus(profiles[0].support_enabled === false ? "disabled" : "enabled");
    }

    loadPreference();
    return () => { cancelled = true; };
  }, [activeUser, activeCanEdit, personName, householdId]);

  if (status === "disabled" || status === "loading") return null;
  return children;
}
