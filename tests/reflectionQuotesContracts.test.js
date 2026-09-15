import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260915211300_add_reflection_quotes.sql", "utf8");
const reflection = readFileSync("src/components/WeeklyReflectionCard.jsx", "utf8");
const admin = readFileSync("src/ReflectionQuotesAdmin.jsx", "utf8");
const adminShell = readFileSync("src/AdminApp.jsx", "utf8");

test("reflection quote library is curated through RLS and explicit Data API grants", () => {
  assert.match(migration, /create table if not exists public\.reflection_quotes/i);
  assert.match(migration, /alter table public\.reflection_quotes enable row level security/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.reflection_quotes to authenticated/i);
  assert.match(migration, /revoke all on table public\.reflection_quotes from anon/i);
  assert.match(migration, /using \(active = true or \(select public\.is_app_admin\(\)\)\)/i);
  assert.match(migration, /with check \(\(select public\.is_app_admin\(\)\)\)/i);
});

test("quote schema preserves editorial and source context without health data", () => {
  for (const field of ["quote_kind", "themes", "source_note", "source_url", "active", "featured_week"]) {
    assert.match(migration, new RegExp(field, "i"));
  }
  for (const theme of ["consistency", "patience", "change", "rest", "resilience", "connection", "attention", "beginnings", "ordinary_days"]) {
    assert.match(migration, new RegExp(theme, "i"));
  }
  assert.match(migration, /featured_week is null or extract\(isodow from featured_week\) = 1/i);
  assert.match(migration, /reflection_quotes_one_featured_per_week_idx/i);
});

test("weekly reflection chooses quotes deterministically and lets a featured week override rotation", () => {
  assert.match(reflection, /\.from\("reflection_quotes"\)/i);
  assert.match(reflection, /\.eq\("active", true\)/i);
  assert.match(reflection, /const featured = activeQuotes\.find\(\(quote\) => quote\.featured_week === weekStart\)/i);
  assert.match(reflection, /stableHash\(`\$\{profileId\}:\$\{weekStart\}:\$\{theme\}`\)/i);
  assert.match(reflection, /data-weekly-reflection-quote/i);
  assert.match(reflection, /A thought to carry with you/i);
});

test("quote themes use only simple reflection context rather than diagnosing health", () => {
  assert.match(reflection, /supportCount > 0[\s\S]*return "connection"/i);
  assert.match(reflection, /loggedDayCount === 7[\s\S]*return "consistency"/i);
  assert.match(reflection, /loggedDayCount <= 3[\s\S]*return "beginnings"/i);
  assert.doesNotMatch(reflection, /diagnos|medical advice|because your weight|caused by/i);
});

test("reflection quotes are managed through the existing admin experience", () => {
  assert.match(adminShell, /AdminAppLegacy/i);
  assert.match(adminShell, /ReflectionQuotesAdmin/i);
  assert.match(adminShell, /Reflection Quotes/i);
  assert.match(admin, /supabase\.rpc\("is_app_admin"\)/i);
  assert.match(admin, /\.from\("reflection_quotes"\)/i);
  assert.match(admin, /Feature next reflection/i);
  assert.match(admin, /source \/ rights note/i);
});

test("the reflection keeps its non-judgmental footer before the emotional closing thought", () => {
  const footerIndex = reflection.indexOf("A week is a snapshot, not a grade.");
  const quoteIndex = reflection.indexOf("A thought to carry with you");
  assert.ok(footerIndex >= 0);
  assert.ok(quoteIndex > footerIndex);
});
