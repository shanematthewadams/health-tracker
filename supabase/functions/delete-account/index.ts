import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Invalid session.");
    const userId = userData.user.id;

    const { data: memberships, error: membershipsError } = await admin
      .from("household_members")
      .select("household_id, role, created_at")
      .eq("user_id", userId);
    if (membershipsError) throw membershipsError;

    const { data: ownedProfiles, error: ownedProfilesError } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", userId);
    if (ownedProfilesError) throw ownedProfilesError;

    const profileIds = (ownedProfiles || []).map((profile) => profile.id);

    // Delete the person's health history by profile ownership, never by With.
    // Profile deletion also cascades these rows, but doing this explicitly keeps
    // account deletion independent from legacy household foreign-key behavior.
    if (profileIds.length) {
      for (const table of [
        "weight_entries",
        "food_entries",
        "activity_entries",
        "step_entries",
        "water_entries",
        "fasting_entries",
      ]) {
        const { error: entryError } = await admin.from(table).delete().in("profile_id", profileIds);
        if (entryError) throw entryError;
      }
    }

    const { error: profileError } = await admin.from("profiles").delete().eq("user_id", userId);
    if (profileError) throw profileError;

    const priorMemberships = memberships || [];
    if (priorMemberships.length) {
      const { error: membershipError } = await admin
        .from("household_members")
        .delete()
        .eq("user_id", userId);
      if (membershipError) throw membershipError;

      for (const membership of priorMemberships) {
        const withId = membership.household_id;
        if (!withId) continue;

        const { data: remaining, error: remainingError } = await admin
          .from("household_members")
          .select("user_id, role, created_at")
          .eq("household_id", withId)
          .order("created_at", { ascending: true });
        if (remainingError) throw remainingError;

        if (!remaining?.length) {
          const { error: householdError } = await admin
            .from("households")
            .delete()
            .eq("id", withId);
          if (householdError) throw householdError;
          continue;
        }

        if (membership.role === "owner" && !remaining.some((member) => member.role === "owner")) {
          const { error: promoteError } = await admin
            .from("household_members")
            .update({ role: "owner" })
            .eq("household_id", withId)
            .eq("user_id", remaining[0].user_id);
          if (promoteError) throw promoteError;
        }
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Account deletion failed.";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
