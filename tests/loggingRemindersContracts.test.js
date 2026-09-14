import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260914205054_add_logging_reminder_preferences.sql", "utf8");
const remindersPanel = readFileSync("src/components/LoggingRemindersPanel.jsx", "utf8");
const yesterdayCard = readFileSync("src/components/YesterdayLoggingReminder.jsx", "utf8");
const todayTab = readFileSync("src/tabs/TodayTab.jsx", "utf8");
const profileTab = readFileSync("src/tabs/ProfileTab.jsx", "utf8");
const onboarding = readFileSync("src/OnboardingGate.jsx", "utf8");
const goals = readFileSync("src/tabs/GoalsTab.jsx", "utf8");

test("logging reminders are opt-in and default off", () => {
  assert.match(migration, /logging_reminders_enabled boolean not null default false/i);
  assert.match(migration, /logging_reminder_enabled boolean not null default false/i);
  assert.match(remindersPanel, /useState\(false\)/i);
  assert.match(onboarding, /reminders are off unless you turn them on later in Profile/i);
  assert.match(goals, /stay off unless you turn them on/i);
  assert.doesNotMatch(onboarding, /logging_reminders_enabled\s*:\s*true/i);
  assert.doesNotMatch(goals, /logging_reminders_enabled\s*:\s*true/i);
});

test("Profile owns reminder settings near My Trackers", () => {
  assert.match(profileTab, /import LoggingRemindersPanel/i);
  assert.match(profileTab, /<MyTrackersPanel[\s\S]*<LoggingRemindersPanel/i);
  assert.match(remindersPanel, /A little help remembering, if you want it\./i);
  assert.match(remindersPanel, /logging_reminders_enabled/i);
  assert.match(remindersPanel, /profile_metric_preferences/i);
  assert.match(remindersPanel, /custom_metrics/i);
});

test("reminders only inspect yesterday and only selected missing logs", () => {
  assert.match(yesterdayCard, /const yesterday = useMemo\(\(\) => shiftDate\(today, -1\)/i);
  assert.match(yesterdayCard, /\.eq\("logging_reminder_enabled", true\)/i);
  assert.match(yesterdayCard, /hasStandardEntry\(user, row\.metric_type, yesterday\)/i);
  assert.match(yesterdayCard, /\.eq\("entry_date", yesterday\)/i);
  assert.match(yesterdayCard, /Anything to add from yesterday\?/i);
  assert.match(yesterdayCard, /That doesn’t mean you missed anything, only that there’s no entry for the day\./i);
});

test("fasting is deliberately excluded from missing-day reminders", () => {
  assert.doesNotMatch(remindersPanel, /STANDARD_TRACKERS[\s\S]{0,600}id:\s*"fasting"/i);
  assert.match(remindersPanel, /Fasting stays out of these reminders because not fasting is not missing data\./i);
  assert.match(yesterdayCard, /row\.metric_type !== "fasting"/i);
});

test("Today reminder stays private to the owner and current Today view", () => {
  assert.match(todayTab, /selectedDate === props\.today/i);
  assert.match(todayTab, /props\.activeCanEdit && \(/i);
  assert.match(todayTab, /<YesterdayLoggingReminder/i);
});

test("dismissal is only for the current day's reminder and review opens yesterday", () => {
  assert.match(migration, /logging_reminder_dismissed_date date/i);
  assert.match(yesterdayCard, /profile\.logging_reminder_dismissed_date === today/i);
  assert.match(yesterdayCard, /logging_reminder_dismissed_date:\s*today/i);
  assert.match(yesterdayCard, /openLog\?\.\(firstStandard\?\.id \|\| "food", yesterday\)/i);
});

test("onboarding and Goals mention reminders without turning them into enrollment screens", () => {
  assert.match(onboarding, /No pressure\./i);
  assert.match(goals, /No pressure\./i);
  assert.doesNotMatch(onboarding, /<LoggingRemindersPanel/i);
  assert.doesNotMatch(goals, /<LoggingRemindersPanel/i);
});
