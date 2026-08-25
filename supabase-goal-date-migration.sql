-- WITH: profile goal dates
-- Safe migration: adds one nullable column and preserves the existing Dec. 31 goal date for current profiles.

alter table public.profiles
  add column if not exists goal_date date;

update public.profiles
set goal_date = '2026-12-31'
where goal_date is null
  and name in ('Shane', 'Alli');
