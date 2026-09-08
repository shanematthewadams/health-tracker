-- ============================================================
-- WITH — GLOBAL FOODS PHASE C BACKFILL
-- ============================================================
-- Data migration with in-transaction safety checks.
--
-- This migration:
--   1. Creates a durable legacy Saved Food -> Global Food mapping.
--   2. Copies every existing saved_food into global_foods.
--   3. Links historical food_entries that already reference saved_foods.
--   4. Migrates saved_food notes into With-scoped food_notes.
--   5. Verifies food-entry counts and nutrition totals are unchanged
--      before allowing the transaction to commit.
--
-- This migration DOES NOT:
--   - alter historical food-entry nutrition snapshots
--   - fuzzy-match unlinked historical entries
--   - delete saved_foods
--   - delete saved_food_id
--   - delete household_food_state
--   - change favorites/recents behavior yet
--   - change frontend behavior
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0. CAPTURE THE LIVE PRE-MIGRATION BASELINE
-- ------------------------------------------------------------
-- Using a transaction-local baseline means the safety checks remain valid
-- even if new food logs were added after the earlier Phase A/B audits.

create temporary table phase_c_baseline on commit drop as
select
  (select count(*) from public.food_entries) as food_entry_count,
  (select coalesce(sum(calories), 0) from public.food_entries) as calories,
  (select coalesce(sum(protein), 0) from public.food_entries) as protein,
  (select coalesce(sum(carbs), 0) from public.food_entries) as carbs,
  (select coalesce(sum(fat), 0) from public.food_entries) as fat,
  (select coalesce(sum(fiber), 0) from public.food_entries) as fiber,
  (select count(*) from public.saved_foods) as saved_food_count,
  (select count(*) from public.global_foods) as global_food_count,
  (select count(*) from public.food_notes) as food_note_count,
  (
    select count(*)
    from public.saved_foods
    where nullif(trim(notes), '') is not null
  ) as saved_food_note_count,
  (
    select count(*)
    from public.food_entries
    where saved_food_id is not null
  ) as entries_with_saved_food_id;

-- ------------------------------------------------------------
-- 1. DURABLE LEGACY MAPPING
-- ------------------------------------------------------------
-- Keep this table through the migration/testing period. It gives us an
-- explicit audit trail from every old Saved Food to its new Global Food.
-- The app does not need access to this table.

create table if not exists public.saved_food_global_map (
  saved_food_id uuid primary key
    references public.saved_foods(id) on delete restrict,
  global_food_id uuid not null unique
    references public.global_foods(id) on delete restrict
    deferrable initially deferred,
  migrated_at timestamptz not null default now()
);

alter table public.saved_food_global_map enable row level security;

-- Intentionally no authenticated policies or grants. This is an internal
-- migration/audit table, not application data.

-- Generate one stable Global Food id for each Saved Food that has not yet
-- been mapped. In the validated starting state this will create 40 rows.
insert into public.saved_food_global_map (saved_food_id, global_food_id)
select sf.id, gen_random_uuid()
from public.saved_foods sf
where not exists (
  select 1
  from public.saved_food_global_map m
  where m.saved_food_id = sf.id
);

-- ------------------------------------------------------------
-- 2. COPY SAVED FOODS INTO THE GLOBAL CATALOG
-- ------------------------------------------------------------
-- Notes are intentionally NOT copied onto global_foods.notes. Contextual
-- notes move to food_notes below so they remain scoped to the With that
-- created them.

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
  brand,
  source_type,
  source_id,
  gtin_upc,
  serving_quantity,
  serving_unit,
  serving_description,
  source_updated_at,
  updated_at
)
select
  m.global_food_id,
  sf.name,
  sf.calories,
  sf.protein,
  sf.carbs,
  sf.fat,
  sf.fiber,
  sf.serving_label,
  sf.default_meal,
  null,
  sf.created_at,
  null,
  'user',
  null,
  null,
  null,
  null,
  sf.serving_label,
  null,
  now()
from public.saved_foods sf
join public.saved_food_global_map m
  on m.saved_food_id = sf.id
where not exists (
  select 1
  from public.global_foods gf
  where gf.id = m.global_food_id
);

-- ------------------------------------------------------------
-- 3. LINK HISTORICAL ENTRIES THROUGH THE EXPLICIT MAPPING
-- ------------------------------------------------------------
-- Only global_food_id changes. Every historical snapshot field remains
-- untouched: name, calories, protein, carbs, fat, fiber, meal, notes, etc.

update public.food_entries fe
set global_food_id = m.global_food_id
from public.saved_food_global_map m
where fe.saved_food_id = m.saved_food_id
  and fe.global_food_id is null;

-- ------------------------------------------------------------
-- 4. MIGRATE SAVED FOOD NOTES AS WITH-SCOPED NOTES
-- ------------------------------------------------------------
-- Saved Foods were household-owned, so their notes are household/With
-- context. We do not guess that they are private personal notes.

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
  m.global_food_id,
  'household',
  null,
  sf.household_id,
  trim(sf.notes),
  sf.created_at,
  now()
from public.saved_foods sf
join public.saved_food_global_map m
  on m.saved_food_id = sf.id
where nullif(trim(sf.notes), '') is not null
  and not exists (
    select 1
    from public.food_notes fn
    where fn.global_food_id = m.global_food_id
      and fn.scope_type = 'household'
      and fn.household_id = sf.household_id
      and fn.note = trim(sf.notes)
  );

-- ------------------------------------------------------------
-- 5. SAFETY ASSERTIONS — ABORT THE TRANSACTION ON ANY MISMATCH
-- ------------------------------------------------------------

do $$
declare
  b record;
  current_food_entry_count bigint;
  current_calories numeric;
  current_protein numeric;
  current_carbs numeric;
  current_fat numeric;
  current_fiber numeric;
  current_saved_food_count bigint;
  current_global_food_count bigint;
  current_food_note_count bigint;
  current_mapping_count bigint;
  current_linked_saved_entries bigint;
  mismatched_saved_links bigint;
begin
  select * into b from phase_c_baseline;

  select count(*) into current_food_entry_count from public.food_entries;
  select coalesce(sum(calories), 0) into current_calories from public.food_entries;
  select coalesce(sum(protein), 0) into current_protein from public.food_entries;
  select coalesce(sum(carbs), 0) into current_carbs from public.food_entries;
  select coalesce(sum(fat), 0) into current_fat from public.food_entries;
  select coalesce(sum(fiber), 0) into current_fiber from public.food_entries;
  select count(*) into current_saved_food_count from public.saved_foods;
  select count(*) into current_global_food_count from public.global_foods;
  select count(*) into current_food_note_count from public.food_notes;
  select count(*) into current_mapping_count from public.saved_food_global_map;

  select count(*)
  into current_linked_saved_entries
  from public.food_entries
  where saved_food_id is not null
    and global_food_id is not null;

  select count(*)
  into mismatched_saved_links
  from public.food_entries fe
  join public.saved_food_global_map m
    on m.saved_food_id = fe.saved_food_id
  where fe.saved_food_id is not null
    and fe.global_food_id is distinct from m.global_food_id;

  if current_food_entry_count <> b.food_entry_count then
    raise exception 'Phase C aborted: food entry count changed (% -> %)',
      b.food_entry_count, current_food_entry_count;
  end if;

  if current_calories <> b.calories
     or current_protein <> b.protein
     or current_carbs <> b.carbs
     or current_fat <> b.fat
     or current_fiber <> b.fiber then
    raise exception 'Phase C aborted: historical nutrition totals changed';
  end if;

  if current_saved_food_count <> b.saved_food_count then
    raise exception 'Phase C aborted: saved_foods count changed (% -> %)',
      b.saved_food_count, current_saved_food_count;
  end if;

  if current_mapping_count <> b.saved_food_count then
    raise exception 'Phase C aborted: expected % Saved Food mappings, found %',
      b.saved_food_count, current_mapping_count;
  end if;

  if current_global_food_count <> b.global_food_count + b.saved_food_count then
    raise exception 'Phase C aborted: expected Global Foods count %, found %',
      b.global_food_count + b.saved_food_count, current_global_food_count;
  end if;

  if current_food_note_count <> b.food_note_count + b.saved_food_note_count then
    raise exception 'Phase C aborted: expected food_notes count %, found %',
      b.food_note_count + b.saved_food_note_count, current_food_note_count;
  end if;

  if current_linked_saved_entries <> b.entries_with_saved_food_id then
    raise exception 'Phase C aborted: expected % Saved-linked entries to have Global links, found %',
      b.entries_with_saved_food_id, current_linked_saved_entries;
  end if;

  if mismatched_saved_links <> 0 then
    raise exception 'Phase C aborted: % historical entries point to the wrong Global Food',
      mismatched_saved_links;
  end if;
end
$$;

commit;
