-- WITH personalization + fasting
-- Adds a curated per-profile color and simple fasting records.
-- No existing health entries are deleted or changed.

alter table public.profiles
  add column if not exists profile_color text;

update public.profiles
set profile_color = case
  when name = 'Shane' then '#D9825B'
  when name = 'Alli' then '#8F7AAE'
  else profile_color
end
where profile_color is null;

create table if not exists public.fasting_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint fasting_end_after_start check (ended_at is null or ended_at >= started_at)
);

alter table public.fasting_entries enable row level security;

drop policy if exists "Household members can view fasting entries" on public.fasting_entries;
create policy "Household members can view fasting entries"
on public.fasting_entries for select
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = fasting_entries.household_id
      and hm.user_id = auth.uid()
  )
);

drop policy if exists "Profile owners can insert fasting entries" on public.fasting_entries;
create policy "Profile owners can insert fasting entries"
on public.fasting_entries for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = fasting_entries.profile_id
      and p.household_id = fasting_entries.household_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "Profile owners can update fasting entries" on public.fasting_entries;
create policy "Profile owners can update fasting entries"
on public.fasting_entries for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = fasting_entries.profile_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = fasting_entries.profile_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "Profile owners can delete fasting entries" on public.fasting_entries;
create policy "Profile owners can delete fasting entries"
on public.fasting_entries for delete
using (
  exists (
    select 1 from public.profiles p
    where p.id = fasting_entries.profile_id
      and p.user_id = auth.uid()
  )
);

create unique index if not exists one_active_fast_per_profile
on public.fasting_entries(profile_id)
where ended_at is null;
