-- WITH fasting repair / diagnostic-safe migration
-- Safe to run more than once. It does not remove fasting records.

alter table public.fasting_entries enable row level security;

grant select, insert, update, delete on public.fasting_entries to authenticated;

drop policy if exists "Household members can view fasting entries" on public.fasting_entries;
create policy "Household members can view fasting entries"
on public.fasting_entries for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists "Profile owners can insert fasting entries" on public.fasting_entries;
create policy "Profile owners can insert fasting entries"
on public.fasting_entries for insert
to authenticated
with check (
  public.is_household_member(household_id)
  and public.owns_profile(profile_id)
);

drop policy if exists "Profile owners can update fasting entries" on public.fasting_entries;
create policy "Profile owners can update fasting entries"
on public.fasting_entries for update
to authenticated
using (public.owns_profile(profile_id))
with check (
  public.is_household_member(household_id)
  and public.owns_profile(profile_id)
);

drop policy if exists "Profile owners can delete fasting entries" on public.fasting_entries;
create policy "Profile owners can delete fasting entries"
on public.fasting_entries for delete
to authenticated
using (public.owns_profile(profile_id));

create unique index if not exists one_active_fast_per_profile
on public.fasting_entries(profile_id)
where ended_at is null;
