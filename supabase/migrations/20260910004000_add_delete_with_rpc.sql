-- Delete a With relationship container without deleting personal profiles or health history.
-- Legacy household_id columns still reference households with ON DELETE CASCADE,
-- so personal/profile-owned records must be detached before the With row is removed.

create or replace function public.delete_with_v1(with_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if with_id is null then
    raise exception 'WITH_ID_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.household_members hm
    where hm.household_id = with_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  ) then
    raise exception 'WITH_OWNER_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.households h
    where h.id = with_id
  ) then
    raise exception 'WITH_NOT_FOUND';
  end if;

  -- Preserve personal identity and health records by removing only the legacy
  -- relationship pointer before deleting the With container.
  update public.profiles
    set household_id = null
  where household_id = with_id;

  update public.weight_entries
    set household_id = null
  where household_id = with_id;

  update public.food_entries
    set household_id = null
  where household_id = with_id;

  update public.activity_entries
    set household_id = null
  where household_id = with_id;

  update public.step_entries
    set household_id = null
  where household_id = with_id;

  update public.water_entries
    set household_id = null
  where household_id = with_id;

  update public.fasting_entries
    set household_id = null
  where household_id = with_id;

  -- Food notes can be profile-owned, so preserve them as well.
  update public.food_notes
    set household_id = null
  where household_id = with_id;

  -- The remaining household-scoped rows (memberships, invitations,
  -- household food state, legacy household saved foods) may cascade away with
  -- the relationship container.
  delete from public.households h
  where h.id = with_id;

  if not found then
    raise exception 'WITH_NOT_FOUND';
  end if;

  return 'DELETED';
end;
$$;

revoke execute on function public.delete_with_v1(uuid) from public, anon;
grant execute on function public.delete_with_v1(uuid) to authenticated;
