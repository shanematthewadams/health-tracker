-- ============================================================
-- WITH — GLOBAL FOODS PHASE D APPLICATION COMPATIBILITY
-- ============================================================
-- Transitional safeguards while staging moves from Saved Foods to
-- the canonical Global Foods catalog.
--
-- This migration:
--   1. Mirrors any NEW legacy saved_food created by the current frontend
--      into global_foods and saved_food_global_map.
--   2. Moves any contextual note on that legacy saved food into a
--      household/With-scoped food_note instead of global_foods.notes.
--   3. Ensures new food_entries receive global_food_id whenever the current
--      frontend can identify the canonical food through either:
--        a) saved_food_id -> saved_food_global_map, or
--        b) the immediately preceding global-food use record.
--
-- This is transitional. It lets us change the staging UI without forcing
-- a risky all-at-once rewrite of the existing logging code.
--
-- This migration DOES NOT:
--   - change historical nutrition snapshots
--   - delete saved_foods or household_food_state
--   - alter old historical entries
--   - expose new RLS access
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. MIRROR NEW LEGACY SAVED FOODS INTO GLOBAL FOODS
-- ------------------------------------------------------------

create or replace function public.with_sync_new_saved_food_to_global()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_global_id uuid;
begin
  -- If this legacy Saved Food is already mapped, nothing to do.
  select m.global_food_id
    into new_global_id
  from public.saved_food_global_map m
  where m.saved_food_id = new.id;

  if new_global_id is null then
    new_global_id := gen_random_uuid();

    insert into public.global_foods (
      id,
      name,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      serving_label,
      default_meal,
      notes,
      created_at,
      source_type,
      serving_description,
      updated_at
    ) values (
      new_global_id,
      new.name,
      new.calories,
      new.protein,
      new.carbs,
      new.fat,
      new.fiber,
      coalesce(nullif(trim(new.serving_label), ''), '1 serving'),
      new.default_meal,
      null,
      new.created_at,
      'user',
      coalesce(nullif(trim(new.serving_label), ''), '1 serving'),
      now()
    );

    insert into public.saved_food_global_map (saved_food_id, global_food_id)
    values (new.id, new_global_id);
  end if;

  -- Preserve contextual notes as With-scoped notes, never global notes.
  if nullif(trim(new.notes), '') is not null then
    insert into public.food_notes (
      global_food_id,
      scope_type,
      profile_id,
      household_id,
      note,
      created_at,
      updated_at
    )
    select
      new_global_id,
      'household',
      null,
      new.household_id,
      trim(new.notes),
      new.created_at,
      now()
    where not exists (
      select 1
      from public.food_notes fn
      where fn.global_food_id = new_global_id
        and fn.scope_type = 'household'
        and fn.household_id = new.household_id
        and fn.note = trim(new.notes)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists with_sync_new_saved_food_to_global
  on public.saved_foods;

create trigger with_sync_new_saved_food_to_global
after insert on public.saved_foods
for each row
execute function public.with_sync_new_saved_food_to_global();

-- ------------------------------------------------------------
-- 2. ENSURE NEW FOOD ENTRIES RECEIVE CANONICAL GLOBAL IDs
-- ------------------------------------------------------------

create or replace function public.with_assign_global_food_to_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mapped_global_id uuid;
  recently_used_global_id uuid;
begin
  -- Respect an explicit canonical ID supplied by future frontend code.
  if new.global_food_id is not null then
    return new;
  end if;

  -- Legacy-created foods have a deterministic Saved -> Global mapping.
  if new.saved_food_id is not null then
    select m.global_food_id
      into mapped_global_id
    from public.saved_food_global_map m
    where m.saved_food_id = new.saved_food_id;

    if mapped_global_id is not null then
      new.global_food_id := mapped_global_id;
      return new;
    end if;
  end if;

  -- The current frontend records global-food use immediately before it
  -- inserts the food entry. Use that short-lived signal to preserve the
  -- canonical ID even when quantity scaling changes the entry macros.
  select hfs.food_id
    into recently_used_global_id
  from public.household_food_state hfs
  join public.global_foods gf
    on gf.id = hfs.food_id
  where hfs.household_id = new.household_id
    and hfs.food_source = 'global'
    and hfs.last_used_at >= now() - interval '15 seconds'
    and lower(trim(gf.name)) = lower(trim(new.name))
  order by hfs.last_used_at desc
  limit 1;

  if recently_used_global_id is not null then
    new.global_food_id := recently_used_global_id;
  end if;

  return new;
end;
$$;

drop trigger if exists with_assign_global_food_to_entry
  on public.food_entries;

create trigger with_assign_global_food_to_entry
before insert on public.food_entries
for each row
execute function public.with_assign_global_food_to_entry();

commit;
