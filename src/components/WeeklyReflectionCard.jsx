import { useEffect, useMemo, useState } from "react";
import { Activity, Droplet, Heart, Quote, Scale, Sparkles, Timer, Utensils, X } from "lucide-react";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";

function shiftDate(dateStr, delta) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function previousCompletedWeek(today) {
  const date = new Date(`${today}T12:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const currentMonday = shiftDate(today, -daysSinceMonday);
  const start = shiftDate(currentMonday, -7);
  return { start, end: shiftDate(start, 6) };
}

function dateInTimeZone(isoString, timeZone) {
  if (!isoString) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(isoString));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return String(isoString).slice(0, 10);
  }
}

function formatWeekRange(start, end) {
  const startDate = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);
  const sameMonth = startDate.getUTCMonth() === endDate.getUTCMonth();
  const startText = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(startDate);
  const endText = new Intl.DateTimeFormat("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(endDate);
  return `${startText}–${endText}`;
}

function uniqueDays(rows, key = "entry_date") {
  return new Set((rows || []).map((row) => row[key]).filter(Boolean));
}

function sum(rows, key) {
  return (rows || []).reduce((total, row) => total + Number(row?.[key] || 0), 0);
}

function dailyTotals(rows, valueKeys) {
  const days = new Map();
  for (const row of rows || []) {
    const date = row.entry_date;
    if (!date) continue;
    const current = days.get(date) || Object.fromEntries(valueKeys.map((key) => [key, 0]));
    for (const key of valueKeys) current[key] += Number(row?.[key] || 0);
    days.set(date, current);
  }
  return days;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + Number(value || 0), 0) / values.length;
}

function compactNumber(value, digits = 0) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(total / 60);
  const remaining = total % 60;
  if (!hours) return `${remaining}m`;
  if (!remaining) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function formatList(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function reflectionTheme({ supportCount, loggedDayCount, fullWeekCount }) {
  if (supportCount > 0) return "connection";
  if (fullWeekCount >= 2 || loggedDayCount === 7) return "consistency";
  if (loggedDayCount <= 3) return "beginnings";
  return "attention";
}

function chooseReflectionQuote(quotes, { profileId, weekStart, theme }) {
  const activeQuotes = (quotes || []).filter((quote) => quote.active !== false);
  const featured = activeQuotes.find((quote) => quote.featured_week === weekStart);
  if (featured) return featured;

  const rotation = activeQuotes.filter((quote) => !quote.featured_week);
  const themed = rotation.filter((quote) => {
    const themes = quote.themes || [];
    return themes.length === 0 || themes.includes(theme) || themes.includes("ordinary_days");
  });
  const pool = themed.length ? themed : rotation.length ? rotation : activeQuotes;
  if (!pool.length) return null;

  const ordered = [...pool].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return ordered[stableHash(`${profileId}:${weekStart}:${theme}`) % ordered.length];
}

function buildCustomDetail(metric, entries) {
  if (!entries.length) return null;
  const days = uniqueDays(entries).size;
  const values = entries.map((entry) => Number(entry.numeric_value || 0));
  const total = values.reduce((amount, value) => amount + value, 0);
  const unit = metric.unit ? ` ${metric.unit}` : "";

  if (metric.value_type === "yes_no") {
    const yesCount = entries.filter((entry) => entry.boolean_value === true).length;
    return {
      label: metric.name,
      value: `${yesCount} yes · ${days} ${days === 1 ? "check-in" : "check-ins"}`,
      note: "Your custom tracker, reflected exactly as you logged it.",
      Icon: Sparkles,
    };
  }

  if (metric.value_type === "rating") {
    return {
      label: metric.name,
      value: `${compactNumber(average(values), 1)} average · ${days} logged ${days === 1 ? "day" : "days"}`,
      note: "An average of the ratings you entered last week.",
      Icon: Sparkles,
    };
  }

  return {
    label: metric.name,
    value: `${compactNumber(total, metric.value_type === "quantity" ? 1 : 0)}${unit} · ${days} logged ${days === 1 ? "day" : "days"}`,
    note: "A simple total from the entries you logged last week.",
    Icon: Sparkles,
  };
}

export default function WeeklyReflectionCard({
  profileId,
  today,
  timeZone,
  accentColor = brand.teal,
  styles,
}) {
  const [reflection, setReflection] = useState(undefined);
  const [dismissBusy, setDismissBusy] = useState(false);
  const [dismissError, setDismissError] = useState("");
  const { BORDER, TEXT, TEXT_MUTED, SURFACE, SURFACE_2, cardStyle } = styles;
  const week = useMemo(() => previousCompletedWeek(today), [today]);

  useEffect(() => {
    let cancelled = false;

    async function loadReflection() {
      setReflection(undefined);
      setDismissError("");
      if (!profileId || !today) {
        setReflection(null);
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("created_at,weekly_reflection_seen_week")
          .eq("id", profileId)
          .maybeSingle();
        if (profileError) throw profileError;
        if (!profile) {
          setReflection(null);
          return;
        }

        const profileStart = dateInTimeZone(profile.created_at, timeZone);
        if (profileStart && profileStart > week.start) {
          setReflection(null);
          return;
        }
        if (profile.weekly_reflection_seen_week && profile.weekly_reflection_seen_week >= week.start) {
          setReflection(null);
          return;
        }

        const fastingWindowStart = `${shiftDate(week.start, -1)}T00:00:00Z`;
        const fastingWindowEnd = `${shiftDate(week.end, 2)}T00:00:00Z`;

        const [
          weightResult,
          stepsResult,
          waterResult,
          activityResult,
          foodResult,
          fastingResult,
          supportResult,
          customMetricsResult,
          quoteResult,
        ] = await Promise.all([
          supabase.from("weight_entries").select("entry_date,weight").eq("profile_id", profileId).gte("entry_date", week.start).lte("entry_date", week.end).order("entry_date", { ascending: true }),
          supabase.from("step_entries").select("entry_date,step_count").eq("profile_id", profileId).gte("entry_date", week.start).lte("entry_date", week.end).order("entry_date", { ascending: true }),
          supabase.from("water_entries").select("entry_date,ounces").eq("profile_id", profileId).gte("entry_date", week.start).lte("entry_date", week.end).order("entry_date", { ascending: true }),
          supabase.from("activity_entries").select("entry_date,name,calories_burned").eq("profile_id", profileId).gte("entry_date", week.start).lte("entry_date", week.end).order("entry_date", { ascending: true }),
          supabase.from("food_entries").select("entry_date,calories,protein,carbs,fat").eq("profile_id", profileId).gte("entry_date", week.start).lte("entry_date", week.end).order("entry_date", { ascending: true }),
          supabase.from("fasting_entries").select("started_at,ended_at,duration_minutes").eq("profile_id", profileId).gte("started_at", fastingWindowStart).lt("started_at", fastingWindowEnd).order("started_at", { ascending: true }),
          supabase.from("support_notes").select("id,support_date").eq("recipient_profile_id", profileId).gte("support_date", week.start).lte("support_date", week.end),
          supabase.from("custom_metrics").select("id,name,value_type,unit,sort_order,created_at").eq("profile_id", profileId).eq("enabled", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
          supabase.from("reflection_quotes").select("id,quote,attribution,quote_kind,themes,placements,active,featured_week,created_at").eq("active", true).contains("placements", ["weekly_reflection"]).order("created_at", { ascending: true }),
        ]);

        const results = [weightResult, stepsResult, waterResult, activityResult, foodResult, fastingResult, supportResult, customMetricsResult, quoteResult];
        const failed = results.find((result) => result.error);
        if (failed?.error) throw failed.error;

        const customMetrics = customMetricsResult.data || [];
        let customEntries = [];
        if (customMetrics.length) {
          const { data, error } = await supabase
            .from("custom_metric_entries")
            .select("metric_id,entry_date,boolean_value,numeric_value")
            .eq("profile_id", profileId)
            .in("metric_id", customMetrics.map((metric) => metric.id))
            .gte("entry_date", week.start)
            .lte("entry_date", week.end)
            .order("entry_date", { ascending: true });
          if (error) throw error;
          customEntries = data || [];
        }

        if (cancelled) return;

        const weights = weightResult.data || [];
        const steps = stepsResult.data || [];
        const water = waterResult.data || [];
        const activities = activityResult.data || [];
        const foods = foodResult.data || [];
        const fasting = (fastingResult.data || []).filter((entry) => {
          const localDate = dateInTimeZone(entry.started_at, timeZone);
          return localDate >= week.start && localDate <= week.end;
        });
        const supportNotes = supportResult.data || [];

        const loggedDates = new Set();
        [weights, steps, water, activities, foods, customEntries].forEach((rows) => {
          rows.forEach((row) => { if (row.entry_date) loggedDates.add(row.entry_date); });
        });
        fasting.forEach((entry) => {
          const localDate = dateInTimeZone(entry.started_at, timeZone);
          if (localDate) loggedDates.add(localDate);
        });

        if (loggedDates.size < 2) {
          setReflection(null);
          return;
        }

        const trackerDays = [
          ["weight", "weight", uniqueDays(weights).size],
          ["nutrition", "nutrition", uniqueDays(foods).size],
          ["steps", "steps", uniqueDays(steps).size],
          ["water", "water", uniqueDays(water).size],
          ["activity", "activity", uniqueDays(activities).size],
        ];
        const fullWeekLabels = trackerDays.filter(([, , days]) => days === 7).map(([, label]) => label);

        let lead;
        if (fullWeekLabels.length >= 2) {
          lead = `You logged ${formatList(fullWeekLabels)} on all seven days. That gives the week enough continuity to see a shape, not just isolated numbers.`;
        } else if (loggedDates.size === 7) {
          lead = "There’s something from you in the log every day last week. Not a score, just enough information to see the shape of the week.";
        } else {
          lead = `There are entries on ${loggedDates.size} days from last week. Here’s what those check-ins show without filling in the blanks.`;
        }

        const details = [];

        if (weights.length >= 2) {
          const ordered = [...weights].sort((a, b) => String(a.entry_date).localeCompare(String(b.entry_date)));
          const first = Number(ordered[0].weight);
          const last = Number(ordered[ordered.length - 1].weight);
          const values = ordered.map((entry) => Number(entry.weight));
          details.push({
            label: "Weight",
            value: `${compactNumber(first, 1)} → ${compactNumber(last, 1)} lb`,
            note: `Your logged range was ${compactNumber(Math.min(...values), 1)}–${compactNumber(Math.max(...values), 1)} lb. One week is a snapshot, so the longer trend matters more than any single morning.`,
            Icon: Scale,
          });
        } else if (weights.length === 1) {
          details.push({
            label: "Weight",
            value: `${compactNumber(weights[0].weight, 1)} lb`,
            note: "One weigh-in is information, not a trend.",
            Icon: Scale,
          });
        }

        if (steps.length || activities.length) {
          const stepDays = uniqueDays(steps).size;
          const totalSteps = sum(steps, "step_count");
          const pieces = [];
          if (steps.length) pieces.push(`${compactNumber(totalSteps)} steps`);
          if (activities.length) pieces.push(`${activities.length} ${activities.length === 1 ? "activity" : "activities"}`);
          details.push({
            label: "Movement",
            value: pieces.join(" · "),
            note: steps.length ? `Steps were logged on ${stepDays} ${stepDays === 1 ? "day" : "days"}.` : "Activity entries from the week.",
            Icon: Activity,
          });
        }

        const foodDays = dailyTotals(foods, ["calories", "protein"]);
        if (foodDays.size) {
          const dailyCalories = [...foodDays.values()].map((day) => day.calories);
          const dailyProtein = [...foodDays.values()].map((day) => day.protein);
          details.push({
            label: "Nutrition",
            value: `${foodDays.size} logged ${foodDays.size === 1 ? "day" : "days"} · ${compactNumber(average(dailyCalories))} cal/day · ${compactNumber(average(dailyProtein))}g protein/day`,
            note: "Those averages use logged food only. Missing or incomplete entries stay missing rather than becoming zero.",
            Icon: Utensils,
          });
        }

        const customDetails = customMetrics
          .map((metric) => buildCustomDetail(metric, customEntries.filter((entry) => entry.metric_id === metric.id)))
          .filter(Boolean);
        details.push(...customDetails.slice(0, 2));

        const completedFasts = fasting.filter((entry) => entry.ended_at);
        if (completedFasts.length) {
          const durations = completedFasts.map((entry) => {
            if (entry.duration_minutes != null) return Number(entry.duration_minutes);
            return Math.max(0, (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 60000);
          });
          const totalMinutes = durations.reduce((total, value) => total + value, 0);
          details.push({
            label: "Fasting",
            value: `${completedFasts.length} completed ${completedFasts.length === 1 ? "fast" : "fasts"} · ${formatDuration(totalMinutes)} total`,
            note: `Average duration: ${formatDuration(average(durations))}. This is a record of what you did, not a recommendation about what you should do.`,
            Icon: Timer,
          });
        }

        const waterDays = dailyTotals(water, ["ounces"]);
        if (waterDays.size) {
          const dailyOunces = [...waterDays.values()].map((day) => day.ounces);
          details.push({
            label: "Water",
            value: `${compactNumber(average(dailyOunces))} oz/day · ${waterDays.size} logged ${waterDays.size === 1 ? "day" : "days"}`,
            note: "Average across the days with water entries.",
            Icon: Droplet,
          });
        }

        const theme = reflectionTheme({
          supportCount: supportNotes.length,
          loggedDayCount: loggedDates.size,
          fullWeekCount: fullWeekLabels.length,
        });
        const closingQuote = chooseReflectionQuote(quoteResult.data || [], {
          profileId,
          weekStart: week.start,
          theme,
        });

        setReflection({
          weekStart: week.start,
          weekEnd: week.end,
          lead,
          details: details.slice(0, 4),
          supportCount: supportNotes.length,
          theme,
          closingQuote,
        });
      } catch (error) {
        console.error("Could not load weekly reflection", error);
        if (!cancelled) setReflection(null);
      }
    }

    loadReflection();
    return () => { cancelled = true; };
  }, [profileId, today, timeZone, week.start, week.end]);

  async function dismissReflection() {
    if (!reflection?.weekStart || dismissBusy) return;
    setDismissBusy(true);
    setDismissError("");
    const { error } = await supabase
      .from("profiles")
      .update({ weekly_reflection_seen_week: reflection.weekStart })
      .eq("id", profileId);
    if (error) {
      console.error("Could not dismiss weekly reflection", error);
      setDismissError("Couldn’t hide this reflection yet. Try again.");
      setDismissBusy(false);
      return;
    }
    setReflection(null);
    setDismissBusy(false);
  }

  if (!reflection) return null;

  return (
    <section
      data-weekly-reflection={reflection.weekStart}
      style={{
        ...cardStyle,
        marginBottom: 22,
        padding: 0,
        overflow: "hidden",
        background: SURFACE,
        borderTop: `3px solid ${accentColor}`,
        position: "relative",
      }}
    >
      <button
        type="button"
        aria-label="Hide this weekly reflection"
        disabled={dismissBusy}
        onClick={dismissReflection}
        style={{
          position: "absolute",
          right: 10,
          top: 10,
          width: 30,
          height: 30,
          display: "grid",
          placeItems: "center",
          border: "none",
          borderRadius: 9,
          background: "transparent",
          color: TEXT_MUTED,
          padding: 0,
          opacity: dismissBusy ? 0.5 : 1,
        }}
      >
        <X size={16} strokeWidth={1.8} />
      </button>

      <div style={{ padding: "1.15rem 1.15rem 1rem", paddingRight: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: TEXT_MUTED, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".11em" }}>
          <Sparkles size={14} color={accentColor} strokeWidth={1.9} />
          Last week · {formatWeekRange(reflection.weekStart, reflection.weekEnd)}
        </div>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 25, fontWeight: 600, lineHeight: 1.08, color: TEXT, marginTop: 8 }}>
          Your week, reflected back.
        </div>
        <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.55, marginTop: 8 }}>
          {reflection.lead}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "0 1.15rem" }}>
        <div style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".09em", padding: "13px 0 3px" }}>
          Something worth noticing
        </div>
        {reflection.details.map(({ label, value, note, Icon }, index) => (
          <div key={`${label}-${index}`} style={{ display: "grid", gridTemplateColumns: "30px 1fr", gap: 10, padding: "12px 0", borderTop: index === 0 ? "none" : `1px solid ${BORDER}` }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: SURFACE_2, display: "grid", placeItems: "center" }}>
              <Icon size={15} color={accentColor} strokeWidth={1.9} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</div>
              <div style={{ color: TEXT, fontSize: 13, fontWeight: 800, lineHeight: 1.4, marginTop: 2 }}>{value}</div>
              <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.48, marginTop: 3 }}>{note}</div>
            </div>
          </div>
        ))}
      </div>

      {(reflection.supportCount > 0 || dismissError) && (
        <div style={{ borderTop: `1px solid ${BORDER}`, background: SURFACE_2, padding: "10px 1.15rem" }}>
          {reflection.supportCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: TEXT_MUTED, fontSize: 11, lineHeight: 1.4 }}>
              <Heart size={14} color={accentColor} strokeWidth={1.9} />
              {reflection.supportCount === 1 ? "Someone you’re With left you a note of support last week." : `People you’re With left you ${reflection.supportCount} notes of support last week.`}
            </div>
          )}
          {dismissError && <div role="alert" style={{ color: brand.warn, fontSize: 11, marginTop: reflection.supportCount ? 7 : 0 }}>{dismissError}</div>}
        </div>
      )}

      <div style={{ padding: "10px 1.15rem 12px", color: TEXT_MUTED, fontSize: 10, lineHeight: 1.45, borderTop: `1px solid ${BORDER}` }}>
        A week is a snapshot, not a grade. Missing logs stay missing, and With doesn’t fill in the blanks for you.
      </div>

      {reflection.closingQuote && (
        <div
          data-weekly-reflection-quote={reflection.closingQuote.id}
          style={{
            borderTop: `1px solid ${BORDER}`,
            background: SURFACE_2,
            padding: "16px 1.15rem 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: TEXT_MUTED, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em" }}>
            <Quote size={13} color={accentColor} strokeWidth={1.8} />
            A thought to carry with you
          </div>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", color: TEXT, fontSize: 19, lineHeight: 1.38, fontStyle: "italic", marginTop: 8 }}>
            “{reflection.closingQuote.quote}”
          </div>
          {reflection.closingQuote.attribution && (
            <div style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 700, marginTop: 7 }}>
              — {reflection.closingQuote.attribution}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
