import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildAnalysisPrompt, buildStoredZip, makeCsv } from "../src/dataExport.js";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("missing export values stay missing rather than becoming zero", () => {
  const csv = makeCsv([
    { key: "missing", label: "missing" },
    { key: "zero", label: "zero" },
  ], [{ missing: null, zero: 0 }]);
  assert.equal(csv, "missing,zero\r\n,0");
});

function readStoredZip(bytes) {
  const decoder = new TextDecoder();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map();
  let offset = 0;
  while (offset + 4 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
    files.set(name, decoder.decode(bytes.slice(dataStart, dataStart + compressedSize)));
    offset = dataStart + compressedSize;
  }
  return files;
}

test("export ZIP contains readable CSV files and README", () => {
  const zip = buildStoredZip([
    { name: "weight.csv", content: "entry_date,weight_lb\r\n2026-09-15,220" },
    { name: "README.txt", content: "Missing logs remain missing." },
  ], new Date("2026-09-15T12:00:00"));
  const files = readStoredZip(zip);
  assert.match(files.get("weight.csv"), /2026-09-15,220/);
  assert.equal(files.get("README.txt"), "Missing logs remain missing.");
});

test("analysis prompt keeps observations separate from medical interpretation", () => {
  const prompt = buildAnalysisPrompt({
    dateRange: { start: "2026-09-01", end: "2026-09-15" },
    customTrackerNames: ["Mood"],
  });
  for (const phrase of [
    "Use only the data contained in the uploaded With export",
    "Missing logs are missing, not zero",
    "Clearly distinguish direct observations from hypotheses",
    "Do not diagnose medical conditions",
    "favor longer-term trends over individual readings",
    "Nutrition logging may be incomplete",
    "rather than recommending fasting",
    "preserve the user's own tracker name",
    "Call out uncertainty",
    "qualified healthcare professional",
    "What the data cannot tell us",
  ]) assert.match(prompt, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
});

test("export code filters every health query to the signed-in person's owned profile", async () => {
  const exportSource = await readSource("src/dataExport.js");
  const panelSource = await readSource("src/components/DataExportPanel.jsx");
  const functionSource = await readSource("supabase/functions/export-personal-data/index.ts");

  assert.match(panelSource, /functions\.invoke\("export-personal-data"/);
  assert.match(functionSource, /auth\.getUser\(token\)/);
  assert.match(functionSource, /\.eq\("user_id", userData\.user\.id\)/);
  assert.match(functionSource, /\.eq\("profile_id", profileId\)/);
  assert.doesNotMatch(functionSource, /SUPABASE_SERVICE_ROLE_KEY/);

  for (const table of [
    "weight_entries",
    "food_entries",
    "activity_entries",
    "step_entries",
    "water_entries",
    "fasting_entries",
    "profile_metric_preferences",
    "custom_metrics",
    "custom_metric_entries",
    "custom_metric_goals",
  ]) assert.match(functionSource, new RegExp(`table: "${table}"`));

  assert.doesNotMatch(functionSource, /support_notes/);
  assert.doesNotMatch(functionSource, /household_id/);
  assert.doesNotMatch(panelSource, /openai|anthropic|chatgpt|gemini|claude/i);
  assert.doesNotMatch(exportSource, /openai|anthropic|chatgpt|gemini|claude/i);
});

test("export includes the expected personal data categories", async () => {
  const exportSource = await readSource("src/dataExport.js");
  for (const filename of [
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
    "README.txt",
  ]) assert.match(exportSource, new RegExp(filename.replace(".", "\\.")));
});

test("Profile exposes the export UI without removing account-management controls", async () => {
  const profileSource = await readSource("src/tabs/ProfileTab.jsx");
  const panelSource = await readSource("src/components/DataExportPanel.jsx");

  assert.match(profileSource, /DataExportPanel/);
  assert.match(panelSource, /Take your data with you/);
  assert.match(panelSource, /Download my With data/);
  assert.match(panelSource, /WITH IS NOT THE PLACE FOR THAT\./);
  assert.match(panelSource, /Once you upload your data somewhere else, that service’s privacy rules apply\./);
  assert.match(panelSource, /weird uncle who read one study/);
  assert.match(panelSource, /Copy analysis prompt/);
  assert.match(panelSource, /textarea/);
  assert.match(panelSource, /width: "100%"/);

  for (const existingControl of ["Change email", "Change password", "Delete account", "Sign out"]) {
    assert.match(profileSource, new RegExp(existingControl));
  }
});
