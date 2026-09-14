import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const replaceMigration = readFileSync("supabase/migrations/20260914154213_replace_fasting_support_with_daily_support_notes.sql", "utf8");
const dismissMigration = readFileSync("supabase/migrations/20260914154352_add_support_note_recipient_dismissal.sql", "utf8");
const support = readFileSync("src/components/DailySupportSection.jsx", "utf8");
const todayTab = readFileSync("src/tabs/TodayTab.jsx", "utf8");
const sharedFast = readFileSync("src/components/SharedActiveFastCard.jsx", "utf8");
const currentFast = readFileSync("src/components/CurrentFastCard.jsx", "utf8");

test("daily support notes are relationship data, not fasting data", () => {
  assert.match(replaceMigration, /create table public\.support_notes/i);
  assert.match(replaceMigration, /household_id uuid not null references public\.households/i);
  assert.match(replaceMigration, /support_date date not null/i);
  assert.match(replaceMigration, /char_length\(btrim\(message\)\) between 1 and 280/i);
  assert.match(replaceMigration, /unique \(household_id, sender_profile_id, recipient_profile_id, support_date\)/i);
  assert.match(replaceMigration, /drop table public\.fasting_supports/i);
  assert.doesNotMatch(support, /fasting_entries|fasting_supports|fasting_entry_id/i);
});

test("support note RLS authenticates sender and validates the exact With relationship", () => {
  assert.match(replaceMigration, /alter table public\.support_notes enable row level security/i);
  assert.match(replaceMigration, /private\.owns_profile\(sender_profile_id\)/i);
  assert.match(replaceMigration, /private\.is_with_member\(household_id\)/i);
  assert.match(replaceMigration, /recipient_membership\.household_id = support_notes\.household_id/i);
  assert.match(replaceMigration, /sender_profile_id <> recipient_profile_id/i);
  assert.match(replaceMigration, /senders can delete their daily support notes/i);
});

test("recipient dismissal cannot be used to edit someone else's message", () => {
  assert.match(dismissMigration, /add column dismissed_at timestamptz/i);
  assert.match(dismissMigration, /support note participants can update permitted fields/i);
  assert.match(dismissMigration, /Recipients can only dismiss support notes/i);
  assert.match(dismissMigration, /new\.message is distinct from old\.message/i);
  assert.match(dismissMigration, /Support note identity and dismissal fields cannot be changed by sender/i);
  assert.match(dismissMigration, /support_notes_update_guard/i);
});

test("support entry lives on another person's Today and is independent of tracker state", () => {
  assert.match(todayTab, /<DailySupportSection[\s\S]*activeUser=\{props\.activeUser\}[\s\S]*activeCanEdit=\{props\.activeCanEdit\}/i);
  assert.match(todayTab, /relationshipTarget && selectedDate === props\.today/i);
  assert.doesNotMatch(todayTab, /activeFast &&[^\n]*<DailySupportSection/i);
  assert.match(support, /Be With \$\{personName\} today/i);
  assert.match(support, /Write a little encouragement for \$\{personName\}/i);
});

test("daily notes are intentionally constrained and emoji-friendly without social mechanics", () => {
  assert.match(support, /const MAX_LENGTH = 280/i);
  assert.match(support, /maxLength=\{MAX_LENGTH\}/i);
  assert.match(support, /Text and emoji are welcome\./i);
  assert.match(support, /Send support/i);
  assert.match(support, /Support sent\. No reply needed\./i);
  assert.match(support, /Save note/i);
  assert.match(support, /Remove note/i);
  assert.doesNotMatch(support, /likes?|comments?|followers?|feed|ranking|leaderboard|streak|reaction count/i);
});

test("received support uses the With language and can be dismissed", () => {
  assert.match(support, /\{note\.senderName\} is With You/i);
  assert.match(support, /\.eq\("recipient_profile_id", activeUser\)[\s\S]*\.eq\("support_date", today\)[\s\S]*\.is\("dismissed_at", null\)/i);
  assert.match(support, /\.update\(\{ dismissed_at: new Date\(\)\.toISOString\(\) \}\)/i);
  assert.match(support, /Dismiss \$\{note\.senderName\}'s support note/i);
});

test("fasting cards contain no support UI or support persistence", () => {
  assert.doesNotMatch(sharedFast, /support|Heart|fasting_supports|support_notes/i);
  assert.doesNotMatch(currentFast, /fasting_supports|support_notes|is With You|Rooting for you/i);
});
