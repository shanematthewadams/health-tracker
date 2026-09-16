import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("daily reflection appears only for the signed-in person's Today experience and uses a fixed lightweight scale", async () => {
  const todaySource = await readSource("src/tabs/TodayTab.jsx");
  const reflectionSource = await readSource("src/components/DailyReflection.jsx");

  assert.match(todaySource, /activeCanEdit[\s\S]*DailyReflectionCard/);
  assert.match(reflectionSource, /hourInTimeZone[\s\S]*>= 18/);
  assert.match(reflectionSource, /How was today\?/);
  assert.match(reflectionSource, /Rough/);
  assert.match(reflectionSource, /Okay/);
  assert.match(reflectionSource, /Fantastic/);
  assert.match(reflectionSource, /Anything from today worth remembering\?/);
  assert.match(reflectionSource, /maxLength=\{320\}/);
  assert.match(reflectionSource, /This reflection is private to you\./);
  assert.doesNotMatch(reflectionSource, /rating_low_label|rating_high_label/);
});

test("daily reflection supports only yesterday catch-up and has its own Preferences entry", async () => {
  const reflectionSource = await readSource("src/components/DailyReflection.jsx");
  const profileSource = await readSource("src/tabs/ProfileTab.jsx");
  const remindersSource = await readSource("src/components/LoggingRemindersPanel.jsx");

  assert.match(reflectionSource, /shiftDate\(today, -1\)/);
  assert.match(reflectionSource, /Add yesterday’s reflection/);
  assert.match(reflectionSource, /Past reflections/);
  assert.match(reflectionSource, /View past reflections/);
  assert.match(profileSource, /title="Daily Reflection"/);
  assert.match(profileSource, /modal === "daily-reflection"/);
  assert.match(profileSource, /DailyReflectionPreferencePanel/);
  assert.doesNotMatch(remindersSource, /DailyReflectionPreferencePanel/);
  assert.match(reflectionSource, /daily_reflection_enabled/);
  assert.match(reflectionSource, /with-daily-reflection-settings-changed/);
});

test("daily reflections are person-owned, unique by day, and protected by RLS", async () => {
  const migrationSource = await readSource("supabase/migrations/20260916161526_add_daily_reflections.sql");

  assert.match(migrationSource, /daily_reflection_enabled boolean not null default true/);
  assert.match(migrationSource, /create table if not exists public\.daily_reflections/);
  assert.match(migrationSource, /unique \(profile_id, reflection_date\)/);
  assert.match(migrationSource, /rating between 1 and 5/);
  assert.match(migrationSource, /char_length\(note\) <= 320/);
  assert.match(migrationSource, /enable row level security/);
  assert.match(migrationSource, /for select[\s\S]*private\.owns_profile/);
  assert.match(migrationSource, /for insert[\s\S]*private\.owns_profile/);
  assert.match(migrationSource, /for update[\s\S]*private\.owns_profile/);
  assert.match(migrationSource, /for delete[\s\S]*private\.owns_profile/);
  assert.doesNotMatch(migrationSource, /household_id|is_with_member/);
});

test("staging can preview the evening card without changing production timing", async () => {
  const reflectionSource = await readSource("src/components/DailyReflection.jsx");
  assert.match(reflectionSource, /reflection-preview/);
  assert.match(reflectionSource, /staging--/);
  assert.match(reflectionSource, /isEvening = preview \|\|/);
});
