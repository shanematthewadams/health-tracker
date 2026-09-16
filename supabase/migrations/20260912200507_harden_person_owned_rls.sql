-- Phase 1: make person ownership + shared-With relationships the single
-- authorization path for personal health data.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.owns_profile(pid uuid)
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
      and p.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_with_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = (select auth.uid())
  );
$$;

revoke execute on function private.owns_profile(uuid) from public, anon;
revoke execute on function private.is_with_member(uuid) from public, anon;
grant execute on function private.owns_profile(uuid) to authenticated;
grant execute on function private.is_with_member(uuid) to authenticated;

-- Profiles.
drop policy if exists "group members can view profiles" on public.profiles;
drop policy if exists "people can update own profile" on public.profiles;
drop policy if exists "shared With relationships can view profiles v2" on public.profiles;
drop policy if exists "people can update own profile v2" on public.profiles;
create policy "shared With relationships can view profiles"
on public.profiles for select to authenticated
using ((select private.can_view_profile(id)));
create policy "people can update own profile"
on public.profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Helper macro expanded per personal health table to keep policies explicit.

drop policy if exists "group members can view weight entries" on public.weight_entries;
drop policy if exists "people can insert own weight entries" on public.weight_entries;
drop policy if exists "people can insert own weight entries v2" on public.weight_entries;
drop policy if exists "people can update own weight entries" on public.weight_entries;
drop policy if exists "people can update own weight entries v2" on public.weight_entries;
drop policy if exists "people can delete own weight entries" on public.weight_entries;
drop policy if exists "shared With relationships can view weight entries v2" on public.weight_entries;
create policy "shared With relationships can view weight entries" on public.weight_entries for select to authenticated using ((select private.can_view_profile_metric(profile_id, 'weight')));
create policy "people can insert own weight entries" on public.weight_entries for insert to authenticated with check ((select private.owns_profile(profile_id)));
create policy "people can update own weight entries" on public.weight_entries for update to authenticated using ((select private.owns_profile(profile_id))) with check ((select private.owns_profile(profile_id)));
create policy "people can delete own weight entries" on public.weight_entries for delete to authenticated using ((select private.owns_profile(profile_id)));

drop policy if exists "group members can view food entries" on public.food_entries;
drop policy if exists "people can insert own food entries" on public.food_entries;
drop policy if exists "people can insert own food entries v2" on public.food_entries;
drop policy if exists "people can update own food entries" on public.food_entries;
drop policy if exists "people can update own food entries v2" on public.food_entries;
drop policy if exists "people can delete own food entries" on public.food_entries;
drop policy if exists "shared With relationships can view food entries v2" on public.food_entries;
create policy "shared With relationships can view food entries" on public.food_entries for select to authenticated using ((select private.can_view_profile_metric(profile_id, 'food')));
create policy "people can insert own food entries" on public.food_entries for insert to authenticated with check ((select private.owns_profile(profile_id)));
create policy "people can update own food entries" on public.food_entries for update to authenticated using ((select private.owns_profile(profile_id))) with check ((select private.owns_profile(profile_id)));
create policy "people can delete own food entries" on public.food_entries for delete to authenticated using ((select private.owns_profile(profile_id)));

drop policy if exists "group members can view activity entries" on public.activity_entries;
drop policy if exists "people can insert own activity entries" on public.activity_entries;
drop policy if exists "people can insert own activity entries v2" on public.activity_entries;
drop policy if exists "people can update own activity entries" on public.activity_entries;
drop policy if exists "people can update own activity entries v2" on public.activity_entries;
drop policy if exists "people can delete own activity entries" on public.activity_entries;
drop policy if exists "shared With relationships can view activity entries v2" on public.activity_entries;
create policy "shared With relationships can view activity entries" on public.activity_entries for select to authenticated using ((select private.can_view_profile_metric(profile_id, 'activity')));
create policy "people can insert own activity entries" on public.activity_entries for insert to authenticated with check ((select private.owns_profile(profile_id)));
create policy "people can update own activity entries" on public.activity_entries for update to authenticated using ((select private.owns_profile(profile_id))) with check ((select private.owns_profile(profile_id)));
create policy "people can delete own activity entries" on public.activity_entries for delete to authenticated using ((select private.owns_profile(profile_id)));

drop policy if exists "group members can view step entries" on public.step_entries;
drop policy if exists "people can insert own step entries" on public.step_entries;
drop policy if exists "people can insert own step entries v2" on public.step_entries;
drop policy if exists "people can update own step entries" on public.step_entries;
drop policy if exists "people can update own step entries v2" on public.step_entries;
drop policy if exists "people can delete own step entries" on public.step_entries;
drop policy if exists "shared With relationships can view step entries v2" on public.step_entries;
create policy "shared With relationships can view step entries" on public.step_entries for select to authenticated using ((select private.can_view_profile_metric(profile_id, 'steps')));
create policy "people can insert own step entries" on public.step_entries for insert to authenticated with check ((select private.owns_profile(profile_id)));
create policy "people can update own step entries" on public.step_entries for update to authenticated using ((select private.owns_profile(profile_id))) with check ((select private.owns_profile(profile_id)));
create policy "people can delete own step entries" on public.step_entries for delete to authenticated using ((select private.owns_profile(profile_id)));

drop policy if exists "group members can view water entries" on public.water_entries;
drop policy if exists "people can insert own water entries" on public.water_entries;
drop policy if exists "people can insert own water entries v2" on public.water_entries;
drop policy if exists "people can update own water entries" on public.water_entries;
drop policy if exists "people can update own water entries v2" on public.water_entries;
drop policy if exists "people can delete own water entries" on public.water_entries;
drop policy if exists "shared With relationships can view water entries v2" on public.water_entries;
create policy "shared With relationships can view water entries" on public.water_entries for select to authenticated using ((select private.can_view_profile_metric(profile_id, 'water')));
create policy "people can insert own water entries" on public.water_entries for insert to authenticated with check ((select private.owns_profile(profile_id)));
create policy "people can update own water entries" on public.water_entries for update to authenticated using ((select private.owns_profile(profile_id))) with check ((select private.owns_profile(profile_id)));
create policy "people can delete own water entries" on public.water_entries for delete to authenticated using ((select private.owns_profile(profile_id)));

drop policy if exists "Household members can view fasting entries" on public.fasting_entries;
drop policy if exists "Profile owners can insert fasting entries" on public.fasting_entries;
drop policy if exists "people can insert own fasting entries v2" on public.fasting_entries;
drop policy if exists "Profile owners can update fasting entries" on public.fasting_entries;
drop policy if exists "people can update own fasting entries v2" on public.fasting_entries;
drop policy if exists "Profile owners can delete fasting entries" on public.fasting_entries;
drop policy if exists "shared With relationships can view fasting entries v2" on public.fasting_entries;
create policy "shared With relationships can view fasting entries" on public.fasting_entries for select to authenticated using ((select private.can_view_profile_metric(profile_id, 'fasting')));
create policy "people can insert own fasting entries" on public.fasting_entries for insert to authenticated with check ((select private.owns_profile(profile_id)));
create policy "people can update own fasting entries" on public.fasting_entries for update to authenticated using ((select private.owns_profile(profile_id))) with check ((select private.owns_profile(profile_id)));
create policy "people can delete own fasting entries" on public.fasting_entries for delete to authenticated using ((select private.owns_profile(profile_id)));

-- With-scoped compatibility data remains authorized by With membership.
drop policy if exists "members can view memberships" on public.household_members;
create policy "members can view memberships" on public.household_members for select to authenticated using ((select private.is_with_member(household_id)));
drop policy if exists "members can view households" on public.households;
create policy "members can view households" on public.households for select to authenticated using ((select private.is_with_member(id)));
drop policy if exists "members can manage saved foods" on public.saved_foods;
create policy "members can manage saved foods" on public.saved_foods for all to authenticated using ((select private.is_with_member(household_id))) with check ((select private.is_with_member(household_id)));

drop policy if exists "members can view household food state" on public.household_food_state;
drop policy if exists "members can insert household food state" on public.household_food_state;
drop policy if exists "members can update household food state" on public.household_food_state;
drop policy if exists "members can delete household food state" on public.household_food_state;
create policy "members can view household food state" on public.household_food_state for select to authenticated using ((select private.is_with_member(household_id)));
create policy "members can insert household food state" on public.household_food_state for insert to authenticated with check ((select private.is_with_member(household_id)));
create policy "members can update household food state" on public.household_food_state for update to authenticated using ((select private.is_with_member(household_id))) with check ((select private.is_with_member(household_id)));
create policy "members can delete household food state" on public.household_food_state for delete to authenticated using ((select private.is_with_member(household_id)));

drop policy if exists "people can view accessible food notes" on public.food_notes;
drop policy if exists "people can create accessible food notes" on public.food_notes;
drop policy if exists "people can update accessible food notes" on public.food_notes;
drop policy if exists "people can delete accessible food notes" on public.food_notes;
create policy "people can view accessible food notes" on public.food_notes for select to authenticated using (((scope_type='person') and (select private.owns_profile(profile_id))) or ((scope_type='household') and (select private.is_with_member(household_id))));
create policy "people can create accessible food notes" on public.food_notes for insert to authenticated with check (((scope_type='person') and (select private.owns_profile(profile_id))) or ((scope_type='household') and (select private.is_with_member(household_id))));
create policy "people can update accessible food notes" on public.food_notes for update to authenticated using (((scope_type='person') and (select private.owns_profile(profile_id))) or ((scope_type='household') and (select private.is_with_member(household_id)))) with check (((scope_type='person') and (select private.owns_profile(profile_id))) or ((scope_type='household') and (select private.is_with_member(household_id))));
create policy "people can delete accessible food notes" on public.food_notes for delete to authenticated using (((scope_type='person') and (select private.owns_profile(profile_id))) or ((scope_type='household') and (select private.is_with_member(household_id))));

revoke execute on function public.is_household_member(uuid) from public, anon, authenticated;
revoke execute on function public.owns_profile(uuid) from public, anon, authenticated;
revoke execute on function public.claim_profile(uuid) from anon;
revoke execute on function public.create_household(text, text) from anon;
revoke execute on function public.join_household(text, text) from anon;
revoke execute on function public.rename_household(text) from anon;
revoke execute on function public.with_attach_scanned_barcode(text, uuid, text) from anon;
revoke execute on function public.with_assign_global_food_to_entry() from public, anon, authenticated;
revoke execute on function public.with_sync_new_saved_food_to_global() from public, anon, authenticated;
