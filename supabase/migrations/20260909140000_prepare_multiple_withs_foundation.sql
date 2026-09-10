-- Multiple Withs foundation: intentionally backward-compatible.
-- This migration was applied to the shared Supabase project before being
-- committed here so future database changes have an auditable migration path.
-- It enables the future model without switching existing app behavior or RLS.

-- 1. Allow one authenticated user to belong to multiple Withs.
drop index if exists public.household_members_one_with_per_user_idx;

-- 2. Preserve one personal profile per authenticated user, but stop requiring
--    the profile itself to be owned by a single With.
alter table public.profiles
  alter column household_id drop not null;

-- 3. Personal health records remain profile-owned. Keep legacy household_id
--    values/columns for current frontend compatibility, but allow future writes
--    to omit them once staging is migrated.
alter table public.weight_entries alter column household_id drop not null;
alter table public.food_entries alter column household_id drop not null;
alter table public.activity_entries alter column household_id drop not null;
alter table public.step_entries alter column household_id drop not null;
alter table public.water_entries alter column household_id drop not null;
alter table public.fasting_entries alter column household_id drop not null;

-- 4. Add relationship-aware helpers for the future RLS model.
-- Existing RLS policies are deliberately left untouched in this migration so
-- the current production frontend continues to behave exactly as it does now.
create or replace function public.shares_with_profile(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.household_members profile_membership
      on profile_membership.user_id = p.user_id
    join public.household_members viewer_membership
      on viewer_membership.household_id = profile_membership.household_id
    where p.id = pid
      and p.user_id is not null
      and viewer_membership.user_id = auth.uid()
  );
$$;

create or replace function public.can_view_profile(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.owns_profile(pid) or public.shares_with_profile(pid);
$$;

-- Future privacy controls can evolve this function without changing the
-- ownership model or every table policy. For now, a shared With grants access.
create or replace function public.can_view_profile_metric(pid uuid, metric_type text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_view_profile(pid);
$$;
