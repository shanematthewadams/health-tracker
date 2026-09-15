import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import WeeklyReflectionCard from "./WeeklyReflectionCard.jsx";

export default function OwnWeeklyReflectionCard(props) {
  const [profileId, setProfileId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolveProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || cancelled) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("Could not resolve weekly reflection profile", error);
        return;
      }

      setProfileId(profile?.id || "");
    }

    resolveProfile();
    return () => { cancelled = true; };
  }, []);

  if (!profileId) return null;
  return <WeeklyReflectionCard {...props} profileId={profileId} />;
}
