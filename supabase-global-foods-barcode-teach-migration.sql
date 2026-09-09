-- Teach With about barcodes that USDA does not know yet.
--
-- Safe intent:
-- - No destructive changes.
-- - No historical food entries are rewritten.
-- - Only user-created Global Foods that trace back to a household the caller belongs to
--   may receive a barcode through this function.
-- - USDA-imported foods are not modified by this function.

create or replace function public.with_attach_scanned_barcode(
  barcode_input text,
  global_food_id_input uuid default null,
  food_name_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  clean_barcode text;
  canonical_barcode text;
  target_global_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  clean_barcode := regexp_replace(coalesce(barcode_input, ''), '\D', '', 'g');
  if length(clean_barcode) < 8 or length(clean_barcode) > 14 then
    raise exception 'Barcode must contain 8 to 14 digits';
  end if;

  canonical_barcode := lpad(clean_barcode, 14, '0');

  if global_food_id_input is not null then
    select gf.id
      into target_global_id
    from public.global_foods gf
    where gf.id = global_food_id_input
      and gf.source_type = 'user'
      and exists (
        select 1
        from public.saved_food_global_map m
        join public.saved_foods sf on sf.id = m.saved_food_id
        join public.household_members hm on hm.household_id = sf.household_id
        where m.global_food_id = gf.id
          and hm.user_id = caller_id
      )
    limit 1;
  elsif nullif(btrim(food_name_input), '') is not null then
    select gf.id
      into target_global_id
    from public.saved_food_global_map m
    join public.saved_foods sf on sf.id = m.saved_food_id
    join public.global_foods gf on gf.id = m.global_food_id
    join public.household_members hm on hm.household_id = sf.household_id
    where hm.user_id = caller_id
      and gf.source_type = 'user'
      and lower(regexp_replace(btrim(gf.name), '\s+', ' ', 'g')) =
          lower(regexp_replace(btrim(food_name_input), '\s+', ' ', 'g'))
      and sf.created_at >= now() - interval '10 minutes'
    order by sf.created_at desc
    limit 1;
  end if;

  if target_global_id is null then
    return null;
  end if;

  update public.global_foods
  set gtin_upc = canonical_barcode,
      updated_at = now()
  where id = target_global_id
    and source_type = 'user';

  return target_global_id;
end;
$$;

revoke all on function public.with_attach_scanned_barcode(text, uuid, text) from public;
grant execute on function public.with_attach_scanned_barcode(text, uuid, text) to authenticated;
