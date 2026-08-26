-- WITH: owner-only group rename
-- Safe to run more than once. No existing data is deleted.

create or replace function public.rename_household(new_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
  cleaned text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  cleaned := trim(new_name);
  if cleaned = '' then
    raise exception 'Your With needs a name.';
  end if;
  if char_length(cleaned) > 40 then
    raise exception 'Keep your With name to 40 characters or fewer.';
  end if;

  select household_id into hid
  from public.household_members
  where user_id = auth.uid()
    and role = 'owner'
  limit 1;

  if hid is null then
    raise exception 'Only the owner can rename this With.';
  end if;

  update public.households
  set name = cleaned
  where id = hid;

  return cleaned;
end;
$$;

revoke all on function public.rename_household(text) from public;
grant execute on function public.rename_household(text) to authenticated;
