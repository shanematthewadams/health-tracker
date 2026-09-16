import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("personal data export includes private daily reflections", async () => {
  const panelSource = await readSource("src/components/DataExportPanel.jsx");
  const functionSource = await readSource("supabase/functions/export-personal-data/index.ts");

  assert.match(functionSource, /daily_reflection_enabled/);
  assert.match(functionSource, /table: "daily_reflections"/);
  assert.match(functionSource, /reflection_date,rating,note,created_at,updated_at/);
  assert.match(functionSource, /dailyReflections/);
  assert.doesNotMatch(functionSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(functionSource, /support_notes/);

  assert.match(panelSource, /daily_reflections\.csv/);
  assert.match(panelSource, /makeCsv\(DAILY_REFLECTION_COLUMNS/);
  assert.match(panelSource, /exportData\?\.dailyReflections/);
  assert.match(panelSource, /private, person-owned entries/);
  assert.match(panelSource, /subjective self-report/);
  assert.match(panelSource, /Do not over-interpret an individual day or rating/);
});
