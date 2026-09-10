-- Transfer ownership of a With from the current owner to another member.
-- Personal profiles and health data are untouched; only membership roles change.

create or replace function public.transfer_with_ownership_v1(
  with_id uuid,
  target_user_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
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

  select hm.role
    into caller_role
  from public.household_members hm
  where hm.household_id = with_id
    and hm.user_id = auth.uid()
  for update;

  if caller_role is null then
    raise exception 'MEMBERSHIP_NOT_FOUND';
  end if;

  if caller_role <> 'owner' then
    raise exception 'WITH_OWNER_REQUIRED';
  end if;

  select hm.role
    into target_role
  from public.household_members hm
  where hm.household_id = with_id
    and hm.user_id = target_user_id
  for update;

  if target_role is null then
    raise exception 'TARGET_MEMBERSHIP_NOT_FOUND';
  end if;

  if target_role = 'owner' then
    raise exception 'TARGET_ALREADY_OWNER';
  end if;

  update public.household_members hm
  set role = 'owner'
  where hm.household_id = with_id
    and hm.user_id = target_user_id;

  if not found then
    raise exception 'TARGET_MEMBERSHIP_NOT_FOUND';
  end if;

  update public.household_members hm
  set role = 'member'
  where hm.household_id = with_id
    and hm.user_id = auth.uid();

  if not found then
    raise exception 'MEMBERSHIP_NOT_FOUND';
  end if;

  return 'TRANSFERRED';
end;
$$;

revoke execute on function public.transfer_with_ownership_v1(uuid, uuid) from public, anon;
grant execute on function public.transfer_with_ownership_v1(uuid, uuid) to authenticated;
