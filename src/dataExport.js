const textEncoder = new TextEncoder();

const CORE_EXPORT_FILES = [
  "profile.csv",
  "goals.csv",
  "weight.csv",
  "nutrition.csv",
  "activity.csv",
  "steps.csv",
  "water.csv",
  "fasting.csv",
  "tracker_preferences.csv",
  "custom_trackers.csv",
  "custom_tracker_entries.csv",
];

function csvValue(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function makeCsv(columns, rows = []) {
  const header = columns.map((column) => csvValue(column.label)).join(",");
  const body = rows.map((row) => columns.map((column) => csvValue(row[column.key])).join(","));
  return [header, ...body].join("\r\n");
}

function concatBytes(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function uint16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const year = Math.min(2107, Math.max(1980, safeDate.getFullYear()));
  const month = safeDate.getMonth() + 1;
  const day = safeDate.getDate();
  const hours = safeDate.getHours();
  const minutes = safeDate.getMinutes();
  const seconds = Math.floor(safeDate.getSeconds() / 2);
  return {
    time: ((hours << 11) | (minutes << 5) | seconds) & 0xffff,
    date: (((year - 1980) << 9) | (month << 5) | day) & 0xffff,
  };
}

export function buildStoredZip(files, createdAt = new Date()) {
  const localChunks = [];
  const centralChunks = [];
  let localOffset = 0;
  const { time, date } = dosDateTime(createdAt);

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const dataBytes = typeof file.content === "string" ? textEncoder.encode(file.content) : file.content;
    const checksum = crc32(dataBytes);

    const localHeader = concatBytes([
      uint32(0x04034b50),
      uint16(10),
      uint16(0),
      uint16(0),
      uint16(time),
      uint16(date),
      uint32(checksum),
      uint32(dataBytes.length),
      uint32(dataBytes.length),
      uint16(nameBytes.length),
      uint16(0),
      nameBytes,
    ]);

    localChunks.push(localHeader, dataBytes);

    const centralHeader = concatBytes([
      uint32(0x02014b50),
      uint16(20),
      uint16(10),
      uint16(0),
      uint16(0),
      uint16(time),
      uint16(date),
      uint32(checksum),
      uint32(dataBytes.length),
      uint32(dataBytes.length),
      uint16(nameBytes.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(localOffset),
      nameBytes,
    ]);
    centralChunks.push(centralHeader);
    localOffset += localHeader.length + dataBytes.length;
  }

  const centralDirectory = concatBytes(centralChunks);
  const endRecord = concatBytes([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.length),
    uint32(localOffset),
    uint16(0),
  ]);

  return concatBytes([...localChunks, centralDirectory, endRecord]);
}

function cleanDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function deriveDateRange(collections) {
  const dates = [];
  const addDate = (value) => {
    const date = cleanDate(value);
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) dates.push(date);
  };

  for (const row of collections.weight) addDate(row.entry_date);
  for (const row of collections.nutrition) addDate(row.entry_date);
  for (const row of collections.activity) addDate(row.entry_date);
  for (const row of collections.steps) addDate(row.entry_date);
  for (const row of collections.water) addDate(row.entry_date);
  for (const row of collections.fasting) {
    addDate(row.started_at);
    addDate(row.ended_at);
  }
  for (const row of collections.customEntries) addDate(row.entry_date);

  dates.sort();
  return dates.length ? { start: dates[0], end: dates[dates.length - 1] } : { start: null, end: null };
}

function buildReadme(metadata, filenames) {
  const dateRange = metadata.dateRange.start
    ? `${metadata.dateRange.start} through ${metadata.dateRange.end}`
    : "No logged health-history dates are present in this export.";

  return [
    "WITH DATA EXPORT",
    "",
    "Your health data is yours. This ZIP contains the With health data and health-tracking preferences attached to your signed-in profile.",
    "",
    `Logged date range: ${dateRange}`,
    "",
    "Files included:",
    ...filenames.map((name) => `- ${name}`),
    "",
    "A few important notes:",
    "- Missing logs remain missing. An empty cell or absent day does not mean zero.",
    "- The export includes only data owned by your signed-in profile. It does not include another With member's private health history.",
    "- With does not interpret this export medically or use it to diagnose conditions.",
    "- If you upload these files to another service, that service's privacy rules apply.",
    "",
    "With — We're in this together.",
  ].join("\n");
}

export function buildAnalysisPrompt(metadata) {
  const dateRange = metadata.dateRange.start
    ? `${metadata.dateRange.start} through ${metadata.dateRange.end}`
    : "No logged health-history dates are present.";
  const customTrackers = metadata.customTrackerNames.length
    ? metadata.customTrackerNames.join(", ")
    : "None";

  return `I am uploading a personal health-data export from With. Analyze only the information contained in the uploaded With export.

Export context:
- Logged date range: ${dateRange}
- Standard trackers represented by the export: weight, nutrition, activity, steps, water, and fasting
- Custom trackers configured: ${customTrackers}
- Weight units: pounds (lb)
- Water units: fluid ounces (oz)
- Nutrition macro units: grams (g)
- Fasting duration units: minutes
- Nutrition logging may be incomplete. Treat absent meals or days as unknown, not as zero intake.

Analysis rules:
- Use only the data contained in the uploaded With export. Do not add outside facts about me unless I explicitly provide them separately.
- Do not invent missing records. Missing logs are missing, not zero.
- Clearly distinguish direct observations from hypotheses or possible explanations.
- Identify trends, changes, consistency, ranges, and unusual shifts only when the data supports them.
- Consider how much data is present and how complete the logging appears before drawing conclusions.
- Avoid moral judgments about food, weight, exercise, fasting, consistency, or adherence.
- Do not diagnose medical conditions and do not present this analysis as medical advice.
- Do not claim that one behavior caused another outcome unless the supplied data genuinely supports causation. Simple tracking data usually does not.
- When discussing weight, favor longer-term trends over individual readings.
- When discussing nutrition, explicitly acknowledge incomplete logging and do not treat unlogged food as zero intake.
- When discussing fasting, describe recorded behavior and patterns rather than recommending fasting or a fasting schedule.
- When discussing custom trackers, preserve the user's own tracker name, unit, value type, and intended meaning. Do not reinterpret a custom tracker as a diagnosis or standardized clinical measure.
- Call out uncertainty, data gaps, and limitations plainly.
- Surface interesting questions the person could explore further without turning those questions into prescriptions.
- Where appropriate, suggest questions the person could discuss with a qualified healthcare professional. Do not create a treatment plan, calorie prescription, diagnosis, or behavioral command.

Keep the tone clear, curious, non-judgmental, concise, human, and evidence-based.

Use this structure:
1. What stands out
2. Trends over time
3. Patterns worth noticing
4. What the data cannot tell us
5. Questions worth exploring`;
}

export function preparePersonalDataExport(exportData) {
  const {
    profile,
    weight = [],
    nutrition = [],
    activity = [],
    steps = [],
    water = [],
    fasting = [],
    trackerPreferences = [],
    customTrackers = [],
    customEntries = [],
    customGoals = [],
  } = exportData || {};

  if (!profile) throw new Error("No owned profile was returned for this account.");

  const goalByMetricId = new Map(customGoals.map((goal) => [goal.metric_id, goal]));
  const trackerById = new Map(customTrackers.map((tracker) => [tracker.id, tracker]));
  const collections = { weight, nutrition, activity, steps, water, fasting, customEntries };
  const metadata = {
    dateRange: deriveDateRange(collections),
    customTrackerNames: customTrackers.map((tracker) => tracker.name),
  };

  const files = [
    {
      name: "profile.csv",
      content: makeCsv([
        { key: "name", label: "profile_name" },
        { key: "profile_color", label: "profile_color" },
        { key: "profile_withmark", label: "profile_withmark" },
        { key: "current_intention", label: "current_intention" },
        { key: "intention_date", label: "intention_date" },
        { key: "logging_reminders_enabled", label: "logging_reminders_enabled" },
        { key: "support_enabled", label: "support_enabled" },
      ], [profile]),
    },
    {
      name: "goals.csv",
      content: makeCsv([
        { key: "goal_statement", label: "goal_statement" },
        { key: "goal_weight", label: "goal_weight_lb" },
        { key: "goal_date", label: "goal_date" },
        { key: "bmr", label: "bmr_calories_per_day" },
        { key: "calories", label: "calorie_target_per_day" },
        { key: "protein", label: "protein_target_g_per_day" },
        { key: "carbs", label: "carbs_target_g_per_day" },
        { key: "fat", label: "fat_target_g_per_day" },
        { key: "fiber_min", label: "fiber_min_g_per_day" },
        { key: "fiber_max", label: "fiber_max_g_per_day" },
        { key: "water_target", label: "water_target_oz_per_day" },
        { key: "steps_target", label: "steps_target_per_day" },
      ], [profile]),
    },
    {
      name: "weight.csv",
      content: makeCsv([
        { key: "entry_date", label: "entry_date" },
        { key: "weight", label: "weight_lb" },
      ], weight),
    },
    {
      name: "nutrition.csv",
      content: makeCsv([
        { key: "entry_date", label: "entry_date" },
        { key: "meal", label: "meal" },
        { key: "name", label: "food_name" },
        { key: "calories", label: "calories" },
        { key: "protein", label: "protein_g" },
        { key: "carbs", label: "carbs_g" },
        { key: "fat", label: "fat_g" },
        { key: "fiber", label: "fiber_g" },
        { key: "notes", label: "notes" },
        { key: "created_at", label: "logged_at" },
      ], nutrition),
    },
    {
      name: "activity.csv",
      content: makeCsv([
        { key: "entry_date", label: "entry_date" },
        { key: "name", label: "activity_name" },
        { key: "calories_burned", label: "calories_burned" },
      ], activity),
    },
    {
      name: "steps.csv",
      content: makeCsv([
        { key: "entry_date", label: "entry_date" },
        { key: "step_count", label: "steps" },
      ], steps),
    },
    {
      name: "water.csv",
      content: makeCsv([
        { key: "entry_date", label: "entry_date" },
        { key: "ounces", label: "water_oz" },
      ], water),
    },
    {
      name: "fasting.csv",
      content: makeCsv([
        { key: "started_at", label: "started_at" },
        { key: "ended_at", label: "ended_at" },
        { key: "goal_minutes", label: "goal_minutes" },
        { key: "duration_minutes", label: "duration_minutes" },
        { key: "goal_reached", label: "goal_reached" },
      ], fasting),
    },
    {
      name: "tracker_preferences.csv",
      content: makeCsv([
        { key: "metric_type", label: "tracker" },
        { key: "enabled", label: "enabled" },
        { key: "visibility", label: "visibility" },
        { key: "logging_reminder_enabled", label: "logging_reminder_enabled" },
      ], trackerPreferences),
    },
    {
      name: "custom_trackers.csv",
      content: makeCsv([
        { key: "id", label: "tracker_id" },
        { key: "name", label: "tracker_name" },
        { key: "value_type", label: "value_type" },
        { key: "unit", label: "unit" },
        { key: "enabled", label: "enabled" },
        { key: "visibility", label: "visibility" },
        { key: "sort_order", label: "sort_order" },
        { key: "icon_key", label: "icon" },
        { key: "rating_low_label", label: "rating_low_label" },
        { key: "rating_high_label", label: "rating_high_label" },
        { key: "logging_reminder_enabled", label: "logging_reminder_enabled" },
        { key: "goal_target_value", label: "goal_target_value" },
        { key: "goal_period", label: "goal_period" },
      ], customTrackers.map((tracker) => ({
        ...tracker,
        goal_target_value: goalByMetricId.get(tracker.id)?.target_value ?? null,
        goal_period: goalByMetricId.get(tracker.id)?.period ?? null,
      }))),
    },
    {
      name: "custom_tracker_entries.csv",
      content: makeCsv([
        { key: "entry_date", label: "entry_date" },
        { key: "metric_id", label: "tracker_id" },
        { key: "tracker_name", label: "tracker_name" },
        { key: "value_type", label: "value_type" },
        { key: "unit", label: "unit" },
        { key: "boolean_value", label: "boolean_value" },
        { key: "numeric_value", label: "numeric_value" },
      ], customEntries.map((entry) => {
        const tracker = trackerById.get(entry.metric_id);
        return {
          ...entry,
          tracker_name: tracker?.name ?? "",
          value_type: tracker?.value_type ?? "",
          unit: tracker?.unit ?? "",
        };
      })),
    },
  ];

  files.push({ name: "README.txt", content: buildReadme(metadata, CORE_EXPORT_FILES) });

  return {
    files,
    metadata,
    analysisPrompt: buildAnalysisPrompt(metadata),
  };
}
