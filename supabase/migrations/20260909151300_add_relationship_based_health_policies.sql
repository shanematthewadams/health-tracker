-- Multiple Withs authorization layer.
-- Existing V1 policies remain in place so production behavior is preserved.
-- New policies add the person-owned / relationship-visible path required by Multiple Withs.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.can_view_profile(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = pid
      and p.user_id is not null
      and (
        p.user_id = auth.uid()
        or exists (
          select 1
          from public.household_members profile_membership
          join public.household_members viewer_membership
            on viewer_membership.household_id = profile_membership.household_id
          where profile_membership.user_id = p.user_id
            and viewer_membership.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function private.can_view_profile_metric(pid uuid, metric_type text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Current behavior: sharing a With grants access to currently shareable
  -- health metrics. Future per-With/per-metric privacy can evolve here.
  select private.can_view_profile(pid);
$$;

revoke execute on function private.can_view_profile(uuid) from public, anon;
revoke execute on function private.can_view_profile_metric(uuid, text) from public, anon;
grant execute on function private.can_view_profile(uuid) to authenticated;
grant execute on function private.can_view_profile_metric(uuid, text) to authenticated;

create policy "shared With relationships can view profiles v2"
on public.profiles
for select
to authenticated
using ((select private.can_view_profile(id)));

create policy "people can update own profile v2"
on public.profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "shared With relationships can view weight entries v2"
on public.weight_entries
for select
to authenticated
using ((select private.can_view_profile_metric(profile_id, 'weight')));

create policy "people can insert own weight entries v2"
on public.weight_entries
for insert
to authenticated
with check (public.owns_profile(profile_id));

create policy "people can update own weight entries v2"
on public.weight_entries
for update
to authenticated
using (public.owns_profile(profile_id))
with check (public.owns_profile(profile_id));

create policy "shared With relationships can view food entries v2"
on public.food_entries
for select
to authenticated
using ((select private.can_view_profile_metric(profile_id, 'food')));

create policy "people can insert own food entries v2"
on public.food_entries
for insert
to authenticated
with check (public.owns_profile(profile_id));

create policy "people can update own food entries v2"
on public.food_entries
for update
to authenticated
using (public.owns_profile(profile_id))
with check (public.owns_profile(profile_id));

create policy "shared With relationships can view activity entries v2"
on public.activity_entries
for select
to authenticated
using ((select private.can_view_profile_metric(profile_id, 'activity')));

create policy "people can insert own activity entries v2"
on public.activity_entries
for insert
to authenticated
with check (public.owns_profile(profile_id));

create policy "people can update own activity entries v2"
on public.activity_entries
for update
to authenticated
using (public.owns_profile(profile_id))
with check (public.owns_profile(profile_id));

create policy "shared With relationships can view step entries v2"
on public.step_entries
for select
to authenticated
using ((select private.can_view_profile_metric(profile_id, 'steps')));

create policy "people can insert own step entries v2"
on public.step_entries
for insert
to authenticated
with check (public.owns_profile(profile_id));

create policy "people can update own step entries v2"
on public.step_entries
for update
to authenticated
using (public.owns_profile(profile_id))
with check (public.owns_profile(profile_id));

create policy "shared With relationships can view water entries v2"
on public.water_entries
for select
to authenticated
using ((select private.can_view_profile_metric(profile_id, 'water')));

create policy "people can insert own water entries v2"
on public.water_entries
for insert
to authenticated
with check (public.owns_profile(profile_id));

create policy "people can update own water entries v2"
on public.water_entries
for update
to authenticated
using (public.owns_profile(profile_id))
with check (public.owns_profile(profile_id));

create policy "shared With relationships can view fasting entries v2"
on public.fasting_entries
for select
to authenticated
using ((select private.can_view_profile_metric(profile_id, 'fasting')));

create policy "people can insert own fasting entries v2"
on public.fasting_entries
for insert
to authenticated
with check (public.owns_profile(profile_id));

create policy "people can update own fasting entries v2"
on public.fasting_entries
for update
to authenticated
using (public.owns_profile(profile_id))
with check (public.owns_profile(profile_id));
