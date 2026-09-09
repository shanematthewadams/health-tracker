-- Parallel Multiple Withs RPCs. Existing production RPCs remain untouched.

create or replace function public.create_with_v2(with_name text, profile_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
  code text;
  clean_with_name text := btrim(with_name);
  clean_profile_name text := nullif(btrim(profile_name), '');
  existing_profile_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if clean_with_name is null or clean_with_name = '' then
    raise exception 'WITH_NAME_REQUIRED';
  end if;
  if char_length(clean_with_name) > 40 then
    raise exception 'WITH_NAME_TOO_LONG';
  end if;

  select p.id
    into existing_profile_id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;

  if existing_profile_id is null then
    if clean_profile_name is null then
      raise exception 'PROFILE_NAME_REQUIRED';
    end if;
    if char_length(clean_profile_name) > 40 then
      raise exception 'PROFILE_NAME_TOO_LONG';
    end if;
  end if;

  loop
    code := public.new_invite_code();
    exit when not exists (
      select 1 from public.households h where h.invite_code = code
    );
  end loop;

  insert into public.households (name, invite_code)
  values (clean_with_name, code)
  returning id into hid;

  insert into public.household_members (household_id, user_id, role)
  values (hid, auth.uid(), 'owner');

  if existing_profile_id is null then
    insert into public.profiles (
      household_id, user_id, name,
      bmr, calories, protein, carbs, fat, fiber_min, fiber_max
    )
    values (
      hid, auth.uid(), clean_profile_name,
      0, 0, 0, 0, 0, 0, 0
    );
  end if;

  return hid;
end;
$$;

revoke execute on function public.create_with_v2(text, text) from public, anon;
grant execute on function public.create_with_v2(text, text) to authenticated;

create or replace function public.accept_with_invitation_v2(
  invitation_token_hash text,
  profile_name text default null
)
returns table(household_id uuid, household_name text, result_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.household_invitations%rowtype;
  caller_email text;
  clean_profile_name text := nullif(btrim(profile_name), '');
  existing_profile_id uuid;
  already_member boolean := false;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select lower(btrim(u.email))
    into caller_email
  from auth.users u
  where u.id = auth.uid();

  if caller_email is null or caller_email = '' then
    raise exception 'ACCOUNT_EMAIL_REQUIRED';
  end if;

  select hi.*
    into inv
  from public.household_invitations hi
  where hi.token_hash = invitation_token_hash
  for update;

  if not found then
    raise exception 'INVITE_INVALID';
  end if;

  if inv.email <> caller_email then
    raise exception 'INVITE_EMAIL_MISMATCH';
  end if;

  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = inv.household_id
      and hm.user_id = auth.uid()
  ) into already_member;

  if inv.status = 'accepted' then
    if already_member then
      return query
      select h.id, h.name, 'ALREADY_MEMBER_THIS'::text
      from public.households h
      where h.id = inv.household_id;
      return;
    end if;
    raise exception 'INVITE_ALREADY_USED';
  end if;

  if inv.status <> 'pending' then
    raise exception 'INVITE_NOT_ACTIVE';
  end if;

  if inv.expires_at <= now() then
    update public.household_invitations
      set status = 'expired'
    where id = inv.id;
    raise exception 'INVITE_EXPIRED';
  end if;

  if already_member then
    update public.household_invitations
      set status = 'accepted', accepted_at = coalesce(accepted_at, now())
    where id = inv.id;

    return query
    select h.id, h.name, 'ALREADY_MEMBER_THIS'::text
    from public.households h
    where h.id = inv.household_id;
    return;
  end if;

  select p.id
    into existing_profile_id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;

  if existing_profile_id is null then
    if clean_profile_name is null then
      raise exception 'PROFILE_NAME_REQUIRED';
    end if;
    if char_length(clean_profile_name) > 40 then
      raise exception 'PROFILE_NAME_TOO_LONG';
    end if;
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (inv.household_id, auth.uid(), 'member');

  if existing_profile_id is null then
    insert into public.profiles (
      household_id, user_id, name,
      bmr, calories, protein, carbs, fat, fiber_min, fiber_max
    )
    values (
      inv.household_id, auth.uid(), clean_profile_name,
      0, 0, 0, 0, 0, 0, 0
    );
  end if;

  update public.household_invitations
    set status = 'accepted', accepted_at = now()
  where id = inv.id;

  return query
  select h.id, h.name, 'JOINED'::text
  from public.households h
  where h.id = inv.household_id;
end;
$$;

revoke execute on function public.accept_with_invitation_v2(text, text) from public, anon;
grant execute on function public.accept_with_invitation_v2(text, text) to authenticated;

create or replace function public.rename_with_v2(with_id uuid, new_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := btrim(new_name);
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if with_id is null then
    raise exception 'WITH_ID_REQUIRED';
  end if;
  if clean_name is null or clean_name = '' then
    raise exception 'WITH_NAME_REQUIRED';
  end if;
  if char_length(clean_name) > 40 then
    raise exception 'WITH_NAME_TOO_LONG';
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

  update public.households h
  set name = clean_name
  where h.id = with_id;

  if not found then
    raise exception 'WITH_NOT_FOUND';
  end if;

  return clean_name;
end;
$$;

revoke execute on function public.rename_with_v2(uuid, text) from public, anon;
grant execute on function public.rename_with_v2(uuid, text) to authenticated;
