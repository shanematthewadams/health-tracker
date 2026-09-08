-- ============================================================
-- WITH — GLOBAL FOODS PHASE B FOUNDATION
-- ============================================================
-- Additive migration only.
--
-- This migration:
--   1. Evolves global_foods into the canonical reusable catalog.
--   2. Adds an optional global_food_id link to food_entries.
--   3. Adds scoped food_notes for person-private and With-shared notes.
--   4. Allows authenticated users to create Global Foods.
--
-- This migration DOES NOT:
--   - copy or modify historical food_entries nutrition snapshots
--   - migrate saved_foods yet
--   - remove saved_food_id
--   - remove saved_foods
--   - remove household_food_state
--   - change existing food-entry RLS
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. EVOLVE GLOBAL FOODS
-- ------------------------------------------------------------

alter table public.global_foods
  add column if not exists brand text,
  add column if not exists source_type text not null default 'user',
  add column if not exists source_id text,
  add column if not exists gtin_upc text,
  add column if not exists serving_quantity numeric,
  add column if not exists serving_unit text,
  add column if not exists serving_description text,
  add column if not exists source_updated_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Keep source types explicit so provenance remains trustworthy.
-- New source types can be added deliberately in a future migration.
alter table public.global_foods
  drop constraint if exists global_foods_source_type_check;

alter table public.global_foods
  add constraint global_foods_source_type_check
  check (source_type in ('user', 'usda_fdc'));

-- One canonical Global Food per external source record.
-- User-created foods normally have no source_id, so duplicates remain
-- possible by design and will be handled by soft duplicate detection in UI.
create unique index if not exists global_foods_source_identity_uidx
  on public.global_foods(source_type, source_id)
  where source_id is not null;

-- UPC/GTIN is intentionally NOT unique. External datasets may contain
-- multiple versions of a product under the same code over time.
create index if not exists global_foods_gtin_upc_idx
  on public.global_foods(gtin_upc)
  where gtin_upc is not null;

create index if not exists global_foods_name_lower_idx
  on public.global_foods(lower(name));

create index if not exists global_foods_brand_lower_idx
  on public.global_foods(lower(brand))
  where brand is not null;

-- Existing policy already allows authenticated SELECT.
-- Add creation now because user-created foods will become Global Foods.
drop policy if exists "authenticated users can create global foods"
  on public.global_foods;

create policy "authenticated users can create global foods"
  on public.global_foods
  for insert
  to authenticated
  with check (true);

grant insert on public.global_foods to authenticated;

-- Deliberately do NOT grant authenticated UPDATE/DELETE yet.
-- Global Food definitions are shared records. Editing semantics need a
-- deliberate ownership/moderation model rather than everybody editing them.

-- ------------------------------------------------------------
-- 2. LINK FOOD ENTRIES TO CANONICAL GLOBAL FOODS
-- ------------------------------------------------------------

alter table public.food_entries
  add column if not exists global_food_id uuid;

-- Add the FK separately so this migration is safe to re-run.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_entries_global_food_id_fkey'
      and conrelid = 'public.food_entries'::regclass
  ) then
    alter table public.food_entries
      add constraint food_entries_global_food_id_fkey
      foreign key (global_food_id)
      references public.global_foods(id)
      on delete set null;
  end if;
end
$$;

create index if not exists food_entries_global_food_id_idx
  on public.food_entries(global_food_id)
  where global_food_id is not null;

-- IMPORTANT: all existing food-entry snapshot columns stay untouched.
-- name/calories/protein/carbs/fat/fiber continue to represent exactly what
-- the person logged at that moment, even if the Global Food changes later.

-- ------------------------------------------------------------
-- 3. SCOPED FOOD NOTES
-- ------------------------------------------------------------

create table if not exists public.food_notes (
  id uuid primary key default gen_random_uuid(),
  global_food_id uuid not null
    references public.global_foods(id) on delete cascade,
  scope_type text not null
    check (scope_type in ('person', 'household')),
  profile_id uuid
    references public.profiles(id) on delete cascade,
  household_id uuid
    references public.households(id) on delete cascade,
  note text not null
    check (length(trim(note)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint food_notes_scope_owner_check check (
    (scope_type = 'person' and profile_id is not null and household_id is null)
    or
    (scope_type = 'household' and household_id is not null and profile_id is null)
  )
);

alter table public.food_notes enable row level security;

-- Person-private notes are visible only to the owner.
-- With-scoped notes are visible to current members of that With.
drop policy if exists "people can view accessible food notes"
  on public.food_notes;
create policy "people can view accessible food notes"
  on public.food_notes
  for select
  to authenticated
  using (
    (scope_type = 'person' and public.owns_profile(profile_id))
    or
    (scope_type = 'household' and public.is_household_member(household_id))
  );

drop policy if exists "people can create accessible food notes"
  on public.food_notes;
create policy "people can create accessible food notes"
  on public.food_notes
  for insert
  to authenticated
  with check (
    (scope_type = 'person' and public.owns_profile(profile_id))
    or
    (scope_type = 'household' and public.is_household_member(household_id))
  );

drop policy if exists "people can update accessible food notes"
  on public.food_notes;
create policy "people can update accessible food notes"
  on public.food_notes
  for update
  to authenticated
  using (
    (scope_type = 'person' and public.owns_profile(profile_id))
    or
    (scope_type = 'household' and public.is_household_member(household_id))
  )
  with check (
    (scope_type = 'person' and public.owns_profile(profile_id))
    or
    (scope_type = 'household' and public.is_household_member(household_id))
  );

drop policy if exists "people can delete accessible food notes"
  on public.food_notes;
create policy "people can delete accessible food notes"
  on public.food_notes
  for delete
  to authenticated
  using (
    (scope_type = 'person' and public.owns_profile(profile_id))
    or
    (scope_type = 'household' and public.is_household_member(household_id))
  );

grant select, insert, update, delete on public.food_notes to authenticated;

create index if not exists food_notes_global_food_idx
  on public.food_notes(global_food_id);

create index if not exists food_notes_person_idx
  on public.food_notes(profile_id, global_food_id)
  where scope_type = 'person';

create index if not exists food_notes_household_idx
  on public.food_notes(household_id, global_food_id)
  where scope_type = 'household';

commit;
