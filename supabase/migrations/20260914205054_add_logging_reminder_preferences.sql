alter table public.profiles
  add column if not exists logging_reminders_enabled boolean not null default false,
  add column if not exists logging_reminder_dismissed_date date;

alter table public.profile_metric_preferences
  add column if not exists logging_reminder_enabled boolean not null default false;

alter table public.custom_metrics
  add column if not exists logging_reminder_enabled boolean not null default false;
