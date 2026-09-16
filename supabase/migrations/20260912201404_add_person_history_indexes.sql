-- Phase 1: support the profile-first loading model used by With.
-- Keep indexes focused on the history lookups the app actually performs.

create index if not exists activity_entries_profile_date_idx
  on public.activity_entries (profile_id, entry_date);

create index if not exists food_entries_profile_date_idx
  on public.food_entries (profile_id, entry_date);

create index if not exists water_entries_profile_date_idx
  on public.water_entries (profile_id, entry_date);

create index if not exists fasting_entries_profile_started_idx
  on public.fasting_entries (profile_id, started_at);

-- These two partial unique indexes are identical. Keep the clearer current
-- name and remove the older transition-era duplicate.
drop index if exists public.profiles_one_claimed_profile_per_user_idx;
