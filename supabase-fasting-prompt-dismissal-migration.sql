-- WITH fasting prompt dismissal
-- Safe migration: adds one nullable per-profile date.

alter table public.profiles
  add column if not exists fasting_prompt_dismissed_date date;
