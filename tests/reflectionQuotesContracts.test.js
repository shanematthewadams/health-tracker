import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const baseMigration = readFileSync("supabase/migrations/20260915211300_add_reflection_quotes.sql", "utf8");
const placementMigration = readFileSync("supabase/migrations/20260915213841_expand_reflection_quotes_to_editorial_library.sql", "utf8");
const homepageMigration = readFileSync("supabase/migrations/20260922202046_add_homepage_editorial_placement.sql", "utf8");
const homepageCurationMigration = readFileSync("supabase/migrations/20260922203217_curate_homepage_editorial_pool.sql", "utf8");
const reflection = readFileSync("src/components/WeeklyReflectionCard.jsx", "utf8");
const editorialLine = readFileSync("src/components/EditorialLine.jsx", "utf8");
const brand = readFileSync("src/brand.jsx", "utf8");
const onboarding = readFileSync("src/OnboardingGate.jsx", "utf8");
const tracker = readFileSync("src/Tracker.jsx", "utf8");
const admin = readFileSync("src/ReflectionQuotesAdmin.jsx", "utf8");
const adminShell = readFileSync("src/AdminApp.jsx", "utf8");

test("editorial library keeps the original RLS protection and adds explicit placements", () => {
  assert.match(baseMigration, /alter table public\.reflection_quotes enable row level security/i);
  assert.match(baseMigration, /grant select, insert, update, delete on table public\.reflection_quotes to authenticated/i);
  assert.match(baseMigration, /using \(active = true or \(select public\.is_app_admin\(\)\)\)/i);
  assert.match(placementMigration, /add column if not exists placements text\[\]/i);
  for (const placement of ["weekly_reflection", "preparing_with", "onboarding"]) assert.match(placementMigration, new RegExp(placement, "i"));
  assert.match(placementMigration, /reflection_quotes_preparing_length_check/i);
  assert.match(placementMigration, /char_length\(btrim\(quote\)\) <= 90/i);
});

test("homepage editorial placement is public only for active homepage items and safe columns", () => {
  assert.match(homepageMigration, /weekly_reflection','preparing_with','onboarding','homepage/i);
  assert.match(homepageMigration, /grant select \(id, quote, attribution, quote_kind, placements, active\)[\s\S]*to anon/i);
  assert.match(homepageMigration, /anonymous visitors can read homepage quotes/i);
  assert.match(homepageMigration, /to anon[\s\S]*active = true[\s\S]*'homepage' = any\(placements\)/i);
  assert.doesNotMatch(homepageMigration, /grant select \([^)]*source_note/i);
  assert.match(admin, /\["homepage", "Homepage"\]/i);
});

test("homepage quote pool is explicitly curated rather than every active editorial item", () => {
  assert.match(homepageCurationMigration, /array_remove\(placements, 'homepage'\)/i);
  assert.match(homepageCurationMigration, /placements \|\| array\['homepage'\]::text\[\]/i);
  const ids = homepageCurationMigration.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [];
  assert.equal(ids.length, 18);
});

test("weekly reflection only chooses weekly-reflection editorial items", () => {
  assert.match(reflection, /\.from\("reflection_quotes"\)/i);
  assert.match(reflection, /\.contains\("placements", \["weekly_reflection"\]\)/i);
  assert.match(reflection, /const featured = activeQuotes\.find\(\(quote\) => quote\.featured_week === weekStart\)/i);
  assert.match(reflection, /stableHash\(`\$\{profileId\}:\$\{weekStart\}:\$\{theme\}`\)/i);
  assert.match(reflection, /A thought to carry with you/i);
});

test("preparing and onboarding editorial moments use placement-only rotation without health data", () => {
  assert.match(editorialLine, /\.contains\("placements", \[placement\]\)/i);
  assert.match(editorialLine, /localDayKey/i);
  assert.doesNotMatch(editorialLine, /weight_entries|food_entries|activity_entries|step_entries|water_entries|fasting_entries/i);
  assert.match(brand, /placement="preparing_with"/i);
  assert.match(onboarding, /placement="onboarding"/i);
  assert.match(onboarding, /fallback="Everyone has their own goals\. You’re simply doing life together\."/i);
});

test("editorial library admin supports placements, source context, and bulk CSV import", () => {
  assert.match(adminShell, /Editorial Library/i);
  assert.match(admin, /const PLACEMENTS/i);
  assert.match(admin, /const CSV_FIELDS = \["quote", "attribution", "quote_kind", "themes", "placements"/i);
  assert.match(admin, /Bulk CSV/i);
  assert.match(admin, /Sample CSV/i);
  assert.match(admin, /parseCsv/i);
  assert.match(admin, /Download rejected rows/i);
  assert.match(admin, /Feature next reflection/i);
  assert.match(admin, /Source \/ rights note/i);
});

test("quote themes remain descriptive rather than diagnostic", () => {
  assert.match(reflection, /supportCount > 0[\s\S]*return "connection"/i);
  assert.match(reflection, /loggedDayCount === 7[\s\S]*return "consistency"/i);
  assert.match(reflection, /loggedDayCount <= 3[\s\S]*return "beginnings"/i);
  assert.doesNotMatch(reflection, /diagnos|medical advice|because your weight|caused by/i);
});

test("the reflection keeps its non-judgmental footer before the emotional closing thought", () => {
  const footerIndex = reflection.indexOf("A week is a snapshot, not a grade.");
  const quoteIndex = reflection.indexOf("A thought to carry with you");
  assert.ok(footerIndex >= 0);
  assert.ok(quoteIndex > footerIndex);
});


test("editorial library admin supports in-place editing, search, filters, and explicit bulk status selection", () => {
  assert.match(admin, /Search quote or attribution/i);
  assert.match(admin, /statusFilter/i);
  assert.match(admin, /themeFilter/i);
  assert.match(admin, /authorFilter/i);
  assert.match(admin, /draft\?\.id === quote\.id/i);
  assert.match(admin, /Select all filtered/i);
  assert.match(admin, /Pause selected/i);
  assert.match(admin, /Resume selected/i);
  assert.match(admin, /\.in\("id", ids\)/i);
  assert.match(admin, /No editorial items match those filters/i);
});

test("initial opening is one shared editorial ritual with a minimum dwell and cached quote", () => {
  assert.match(brand, /OPENING_MIN_DWELL_MS = 1250/i);
  assert.match(brand, /Preparing your With/i);
  assert.match(brand, /showEditorialOpening &&/i);
  assert.match(brand, /deferFallbackUntilLoaded/i);
  assert.match(tracker, /await finishInitialOpening\(\)/i);
  assert.match(onboarding, /await finishInitialOpening\(\)/i);
  assert.match(editorialLine, /editorialLineCache/i);
});
