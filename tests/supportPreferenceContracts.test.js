import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260915202639_add_support_preference.sql", "utf8");
const panel = readFileSync("src/components/SupportPreferencePanel.jsx", "utf8");
const gate = readFileSync("src/components/SupportPreferenceGate.jsx", "utf8");
const todayTab = readFileSync("src/tabs/TodayTab.jsx", "utf8");
const reminders = readFileSync("src/components/LoggingRemindersPanel.jsx", "utf8");

test("support preference defaults on and is stored on the person profile", () => {
  assert.match(migration, /add column if not exists support_enabled boolean not null default true/i);
  assert.match(panel, /\.select\("id,support_enabled"\)/i);
  assert.match(panel, /\.update\(\{ support_enabled: nextEnabled \}\)/i);
  assert.match(panel, /profile\?\.support_enabled !== false/i);
});

test("support preference is available from Profile and explains what turning it off does", () => {
  assert.match(reminders, /import SupportPreferencePanel from "\.\/SupportPreferencePanel\.jsx"/i);
  assert.match(reminders, /<SupportPreferencePanel session=\{session\} styles=\{styles\}/i);
  assert.match(panel, /Get support from people you’re With\./i);
  assert.match(panel, /People you’re With won’t see the support prompt for you\./i);
  assert.match(panel, /Notes you’ve already received stay put\./i);
});

test("another person does not see the support composer when support is disabled", () => {
  assert.match(todayTab, /<SupportPreferenceGate[\s\S]*<DailySupportSection/i);
  assert.match(gate, /\.select\("id,name,user_id,support_enabled"\)/i);
  assert.match(gate, /profiles\[0\]\.support_enabled === false \? "disabled" : "enabled"/i);
  assert.match(gate, /status === "disabled" \|\| status === "loading"/i);
});

test("database policies enforce the preference instead of relying on hidden UI", () => {
  assert.match(migration, /for insert[\s\S]*to authenticated[\s\S]*recipient\.support_enabled is true/i);
  assert.match(migration, /for update[\s\S]*to authenticated/i);
  assert.match(migration, /private\.owns_profile\(support_notes\.recipient_profile_id\)[\s\S]*or recipient\.support_enabled is true/i);
});
