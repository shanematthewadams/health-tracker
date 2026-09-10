-- Owner-only relationship lifecycle action for Multiple Withs.
-- Removes one member from one With without deleting that person's account,
-- profile, goals, or health history.

create or replace function public.remove_with_member_v1(
  with_id uuid,
  target_user_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if with_id is null then
    raise exception 'WITH_ID_REQUIRED';
  end if;

  if target_user_id is null then
    raise exception 'TARGET_USER_REQUIRED';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'TARGET_SELF_NOT_ALLOWED';
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

  select hm.role
    into target_role
  from public.household_members hm
  where hm.household_id = with_id
    and hm.user_id = target_user_id;

  if target_role is null then
    raise exception 'MEMBERSHIP_NOT_FOUND';
  end if;

  if target_role = 'owner' then
    raise exception 'CANNOT_REMOVE_OWNER';
  end if;

  delete from public.household_members hm
  where hm.household_id = with_id
    and hm.user_id = target_user_id;

  if not found then
    raise exception 'MEMBERSHIP_NOT_FOUND';
  end if;

  return 'REMOVED';
end;
$$;

revoke execute on function public.remove_with_member_v1(uuid, uuid) from public, anon;
grant execute on function public.remove_with_member_v1(uuid, uuid) to authenticated;
