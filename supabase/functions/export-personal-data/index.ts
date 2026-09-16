import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type OwnedQuery = {
  table: string;
  columns: string;
  profileId: string;
  orderColumn: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Missing authorization." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !publishableKey) throw new Error("Supabase environment is not configured.");

    const supabase = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.slice("Bearer ".length);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return jsonResponse({ error: "Invalid session." }, 401);

    const { data: ownedProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id,name,goal_weight,bmr,calories,protein,carbs,fat,fiber_min,fiber_max,goal_date,profile_color,current_intention,intention_date,profile_withmark,goal_statement,water_target,steps_target,logging_reminders_enabled,support_enabled,daily_reflection_enabled")
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!ownedProfile?.id) return jsonResponse({ error: "No owned profile was found for this account." }, 404);

    const profileId = ownedProfile.id;

    async function fetchAllOwnedRows({ table, columns, orderColumn }: Omit<OwnedQuery, "profileId">) {
      const rows: Record<string, unknown>[] = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select(columns)
          .eq("profile_id", profileId)
          .order(orderColumn, { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        const page = (data || []) as Record<string, unknown>[];
        rows.push(...page);
        if (page.length < pageSize) break;
        from += pageSize;
      }

      return rows;
    }

    const [
      weight,
      nutrition,
      activity,
      steps,
      water,
      fasting,
      trackerPreferences,
      customTrackers,
      customEntries,
      customGoals,
      dailyReflections,
    ] = await Promise.all([
      fetchAllOwnedRows({ table: "weight_entries", columns: "entry_date,weight", orderColumn: "entry_date" }),
      fetchAllOwnedRows({ table: "food_entries", columns: "entry_date,name,calories,protein,carbs,fat,fiber,meal,notes,created_at", orderColumn: "entry_date" }),
      fetchAllOwnedRows({ table: "activity_entries", columns: "entry_date,name,calories_burned", orderColumn: "entry_date" }),
      fetchAllOwnedRows({ table: "step_entries", columns: "entry_date,step_count", orderColumn: "entry_date" }),
      fetchAllOwnedRows({ table: "water_entries", columns: "entry_date,ounces", orderColumn: "entry_date" }),
      fetchAllOwnedRows({ table: "fasting_entries", columns: "started_at,ended_at,goal_minutes,duration_minutes,goal_reached", orderColumn: "started_at" }),
      fetchAllOwnedRows({ table: "profile_metric_preferences", columns: "metric_type,enabled,visibility,logging_reminder_enabled", orderColumn: "metric_type" }),
      fetchAllOwnedRows({ table: "custom_metrics", columns: "id,name,value_type,unit,enabled,visibility,sort_order,icon_key,rating_low_label,rating_high_label,logging_reminder_enabled", orderColumn: "sort_order" }),
      fetchAllOwnedRows({ table: "custom_metric_entries", columns: "metric_id,entry_date,boolean_value,numeric_value", orderColumn: "entry_date" }),
      fetchAllOwnedRows({ table: "custom_metric_goals", columns: "metric_id,target_value,period", orderColumn: "metric_id" }),
      fetchAllOwnedRows({ table: "daily_reflections", columns: "reflection_date,rating,note,created_at,updated_at", orderColumn: "reflection_date" }),
    ]);

    const { id: _profileId, ...profile } = ownedProfile;

    return jsonResponse({
      profile,
      weight,
      nutrition,
      activity,
      steps,
      water,
      fasting,
      trackerPreferences,
      customTrackers,
      customEntries,
      customGoals,
      dailyReflections,
    });
  } catch (error) {
    console.error("Personal data export failed", error);
    return jsonResponse({ error: "We couldn’t prepare your data right now." }, 500);
  }
});
