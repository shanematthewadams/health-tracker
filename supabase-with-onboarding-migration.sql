-- WITH: self-service onboarding + individual profile ownership
create extension if not exists "pgcrypto";

alter table public.households
  add column if not exists invite_code text;

update public.households
set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where invite_code is null;

alter table public.households
  alter column invite_code set not null;

create unique index if not exists households_invite_code_idx
  on public.households(invite_code);

alter table public.profiles
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists profiles_user_id_unique_idx
  on public.profiles(user_id)
  where user_id is not null;

create or replace function public.new_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create or replace function public.create_household(household_name text, profile_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
  code text;
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  if trim(household_name) = '' or trim(profile_name) = '' then raise exception 'Group and profile names are required.'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then raise exception 'This account already belongs to a group.'; end if;

  loop
    code := public.new_invite_code();
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;

  insert into public.households(name, invite_code) values (trim(household_name), code) returning id into hid;
  insert into public.household_members(household_id, user_id, role) values (hid, auth.uid(), 'owner');
  insert into public.profiles(household_id, user_id, name, bmr, calories, protein, carbs, fat, fiber_min, fiber_max)
  values (hid, auth.uid(), trim(profile_name), 0, 0, 0, 0, 0, 0, 0);
  return hid;
end;
$$;

create or replace function public.join_household(invite_code_input text, profile_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
  existing_profile uuid;
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  if trim(profile_name) = '' then raise exception 'Profile name is required.'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then raise exception 'This account already belongs to a group.'; end if;

  select id into hid from public.households where invite_code = upper(trim(invite_code_input));
  if hid is null then raise exception 'That invite code is not valid.'; end if;

  select id into existing_profile
  from public.profiles
  where household_id = hid
    and lower(name) = lower(trim(profile_name))
    and user_id is null
  limit 1;

  insert into public.household_members(household_id, user_id, role) values (hid, auth.uid(), 'member');

  if existing_profile is not null then
    update public.profiles set user_id = auth.uid() where id = existing_profile;
  else
    if exists (select 1 from public.profiles where household_id = hid and lower(name) = lower(trim(profile_name))) then
      raise exception 'That profile name is already in use in this group.';
    end if;
    insert into public.profiles(household_id, user_id, name, bmr, calories, protein, carbs, fat, fiber_min, fiber_max)
    values (hid, auth.uid(), trim(profile_name), 0, 0, 0, 0, 0, 0, 0);
  end if;
  return hid;
end;
$$;

create or replace function public.claim_profile(profile_id_input uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  if exists (select 1 from public.profiles where user_id = auth.uid()) then raise exception 'This account already owns a profile.'; end if;

  select p.household_id into hid
  from public.profiles p
  join public.household_members hm on hm.household_id = p.household_id
  where p.id = profile_id_input
    and p.user_id is null
    and hm.user_id = auth.uid();

  if hid is null then raise exception 'That profile cannot be claimed.'; end if;

  update public.profiles set user_id = auth.uid() where id = profile_id_input;
  return profile_id_input;
end;
$$;

revoke all on function public.create_household(text,text) from public;
revoke all on function public.join_household(text,text) from public;
revoke all on function public.claim_profile(uuid) from public;
grant execute on function public.create_household(text,text) to authenticated;
grant execute on function public.join_household(text,text) to authenticated;
grant execute on function public.claim_profile(uuid) to authenticated;

-- Everyone in the same group can read profiles and health entries.
-- Existing RLS membership policies continue to provide that shared visibility.
-- Frontend ownership checks prevent editing another person's profile in V1.


-- Enforce individual control at the database layer.
create or replace function public.owns_profile(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = pid and p.user_id = auth.uid()
  );
$$;

revoke all on function public.owns_profile(uuid) from public;
grant execute on function public.owns_profile(uuid) to authenticated;

drop policy if exists "members can manage profiles" on public.profiles;
create policy "group members can view profiles"
on public.profiles for select to authenticated
using (public.is_household_member(household_id));

create policy "people can update own profile"
on public.profiles for update to authenticated
using (user_id = auth.uid() and public.is_household_member(household_id))
with check (user_id = auth.uid() and public.is_household_member(household_id));

drop policy if exists "members can manage weight entries" on public.weight_entries;
create policy "group members can view weight entries"
on public.weight_entries for select to authenticated
using (public.is_household_member(household_id));
create policy "people can insert own weight entries"
on public.weight_entries for insert to authenticated
with check (public.is_household_member(household_id) and public.owns_profile(profile_id));
create policy "people can update own weight entries"
on public.weight_entries for update to authenticated
using (public.owns_profile(profile_id))
with check (public.is_household_member(household_id) and public.owns_profile(profile_id));
create policy "people can delete own weight entries"
on public.weight_entries for delete to authenticated
using (public.owns_profile(profile_id));

drop policy if exists "members can manage food entries" on public.food_entries;
create policy "group members can view food entries"
on public.food_entries for select to authenticated
using (public.is_household_member(household_id));
create policy "people can insert own food entries"
on public.food_entries for insert to authenticated
with check (public.is_household_member(household_id) and public.owns_profile(profile_id));
create policy "people can update own food entries"
on public.food_entries for update to authenticated
using (public.owns_profile(profile_id))
with check (public.is_household_member(household_id) and public.owns_profile(profile_id));
create policy "people can delete own food entries"
on public.food_entries for delete to authenticated
using (public.owns_profile(profile_id));

drop policy if exists "members can manage activity entries" on public.activity_entries;
create policy "group members can view activity entries"
on public.activity_entries for select to authenticated
using (public.is_household_member(household_id));
create policy "people can insert own activity entries"
on public.activity_entries for insert to authenticated
with check (public.is_household_member(household_id) and public.owns_profile(profile_id));
create policy "people can update own activity entries"
on public.activity_entries for update to authenticated
using (public.owns_profile(profile_id))
with check (public.is_household_member(household_id) and public.owns_profile(profile_id));
create policy "people can delete own activity entries"
on public.activity_entries for delete to authenticated
using (public.owns_profile(profile_id));

drop policy if exists "members can manage step entries" on public.step_entries;
create policy "group members can view step entries"
on public.step_entries for select to authenticated
using (public.is_household_member(household_id));
create policy "people can insert own step entries"
on public.step_entries for insert to authenticated
with check (public.is_household_member(household_id) and public.owns_profile(profile_id));
create policy "people can update own step entries"
on public.step_entries for update to authenticated
using (public.owns_profile(profile_id))
with check (public.is_household_member(household_id) and public.owns_profile(profile_id));
create policy "people can delete own step entries"
on public.step_entries for delete to authenticated
using (public.owns_profile(profile_id));

drop policy if exists "members can manage water entries" on public.water_entries;
create policy "group members can view water entries"
on public.water_entries for select to authenticated
using (public.is_household_member(household_id));
create policy "people can insert own water entries"
on public.water_entries for insert to authenticated
with check (public.is_household_member(household_id) and public.owns_profile(profile_id));
create policy "people can update own water entries"
on public.water_entries for update to authenticated
using (public.owns_profile(profile_id))
with check (public.is_household_member(household_id) and public.owns_profile(profile_id));
create policy "people can delete own water entries"
on public.water_entries for delete to authenticated
using (public.owns_profile(profile_id));
