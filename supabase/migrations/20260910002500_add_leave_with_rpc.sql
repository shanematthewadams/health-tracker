-- Allow an authenticated member to leave a With without touching their profile
-- or personal health data. Owners must not strand a With without another owner.

create or replace function public.leave_with_v1(with_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  other_owner_exists boolean := false;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if with_id is null then
    raise exception 'WITH_ID_REQUIRED';
  end if;

  select hm.role
    into caller_role
  from public.household_members hm
  where hm.household_id = with_id
    and hm.user_id = auth.uid();

  if caller_role is null then
    raise exception 'MEMBERSHIP_NOT_FOUND';
  end if;

  if caller_role = 'owner' then
    select exists (
      select 1
      from public.household_members hm
      where hm.household_id = with_id
        and hm.user_id <> auth.uid()
        and hm.role = 'owner'
    ) into other_owner_exists;

    if not other_owner_exists then
      raise exception 'OWNER_TRANSFER_REQUIRED';
    end if;
  end if;

  delete from public.household_members hm
  where hm.household_id = with_id
    and hm.user_id = auth.uid();

  if not found then
    raise exception 'MEMBERSHIP_NOT_FOUND';
  end if;

  return 'LEFT';
end;
$$;

revoke execute on function public.leave_with_v1(uuid) from public, anon;
grant execute on function public.leave_with_v1(uuid) to authenticated;
