-- Let the client ask whether the signed-in person owns a shared food before
-- showing the explicit "update this saved food" choice. Creator identifiers
-- remain private; callers receive only a boolean.
create or replace function public.with_can_update_owned_food(
  food_source_input text,
  food_id_input uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  requester_id uuid := auth.uid();
begin
  if requester_id is null or food_id_input is null then
    return false;
  end if;

  if food_source_input = 'household' then
    return exists (
      select 1
      from public.saved_food_owners o
      where o.saved_food_id = food_id_input
        and o.user_id = requester_id
    );
  end if;

  if food_source_input = 'global' then
    return exists (
      select 1
      from public.global_food_owners o
      join public.global_foods gf on gf.id = o.global_food_id
      where o.global_food_id = food_id_input
        and o.user_id = requester_id
        and gf.source_type = 'user'
    );
  end if;

  return false;
end;
$function$;

revoke all on function public.with_can_update_owned_food(text, uuid) from public, anon;
grant execute on function public.with_can_update_owned_food(text, uuid) to authenticated;
