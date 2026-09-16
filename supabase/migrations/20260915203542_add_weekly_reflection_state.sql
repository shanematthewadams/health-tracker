alter table public.profiles
  add column if not exists weekly_reflection_seen_week date;

comment on column public.profiles.weekly_reflection_seen_week is
  'Monday date for the most recent weekly reflection the profile owner dismissed.';
