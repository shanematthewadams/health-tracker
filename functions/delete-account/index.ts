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

    const { data: membership } = await admin
      .from("household_members")
      .select("household_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    const householdId = membership?.household_id || null;
    const wasOwner = membership?.role === "owner";

    // Removing the profile cascades the user's personal health-entry rows.
    const { error: profileError } = await admin.from("profiles").delete().eq("user_id", userId);
    if (profileError) throw profileError;

    if (householdId) {
      const { error: membershipError } = await admin.from("household_members").delete().eq("user_id", userId);
      if (membershipError) throw membershipError;

      const { data: remaining, error: remainingError } = await admin
        .from("household_members")
        .select("user_id, role, created_at")
        .eq("household_id", householdId)
        .order("created_at", { ascending: true });
      if (remainingError) throw remainingError;

      if (!remaining?.length) {
        const { error: householdError } = await admin.from("households").delete().eq("id", householdId);
        if (householdError) throw householdError;
      } else if (wasOwner && !remaining.some((m) => m.role === "owner")) {
        const { error: promoteError } = await admin
          .from("household_members")
          .update({ role: "owner" })
          .eq("household_id", householdId)
          .eq("user_id", remaining[0].user_id);
        if (promoteError) throw promoteError;
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Account deletion failed." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
