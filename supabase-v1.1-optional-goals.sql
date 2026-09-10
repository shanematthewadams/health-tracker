-- WITH V1.1: optional personal goals
-- Non-destructive: adds nullable profile fields only.

alter table public.profiles
  add column if not exists goal_statement text,
  add column if not exists water_target numeric,
  add column if not exists steps_target integer;

-- Optional guardrails. Existing NULL values remain valid.
alter table public.profiles
  drop constraint if exists profiles_water_target_positive,
  add constraint profiles_water_target_positive
    check (water_target is null or water_target > 0);

alter table public.profiles
  drop constraint if exists profiles_steps_target_positive,
  add constraint profiles_steps_target_positive
    check (steps_target is null or steps_target > 0);
