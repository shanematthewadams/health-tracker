-- Track who created user-authored shared foods without exposing creator IDs
-- through the public food rows themselves. Ownership remains internal and is
-- used only to decide who may redefine a shared food's canonical nutrition.

create table if not exists public.saved_food_owners (
  saved_food_id uuid primary key references public.saved_foods(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.global_food_owners (
  global_food_id uuid primary key references public.global_foods(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.saved_food_owners enable row level security;
alter table public.global_food_owners enable row level security;

revoke all on table public.saved_food_owners from public, anon, authenticated;
revoke all on table public.global_food_owners from public, anon, authenticated;

-- Backfill ownership only when the historical record proves it strongly:
-- the first logged use of a Saved Food happened within five seconds of the
-- Saved Food being created. That is the normal create-and-log flow. Anything
-- ambiguous remains intentionally ownerless/immutable.
with first_use as (
  select distinct on (sf.id)
    sf.id as saved_food_id,
    sf.created_at as saved_created_at,
    fe.created_at as first_use_at,
    p.user_id
  from public.saved_foods sf
  join public.food_entries fe on fe.saved_food_id = sf.id
  join public.profiles p on p.id = fe.profile_id
  where p.user_id is not null
  order by sf.id, fe.created_at asc
)
insert into public.saved_food_owners (saved_food_id, user_id, created_at)
select
  fu.saved_food_id,
  fu.user_id,
  fu.saved_created_at
from first_use fu
where fu.first_use_at >= fu.saved_created_at
  and fu.first_use_at <= fu.saved_created_at + interval '5 seconds'
on conflict (saved_food_id) do nothing;

insert into public.global_food_owners (global_food_id, user_id, created_at)
select
  m.global_food_id,
  o.user_id,
  o.created_at
from public.saved_food_global_map m
join public.saved_food_owners o on o.saved_food_id = m.saved_food_id
join public.global_foods gf on gf.id = m.global_food_id
where gf.source_type = 'user'
on conflict (global_food_id) do nothing;

-- Keep new Saved Foods and their shared Global Food twins tied to the person
-- who created them. USDA/imported canonical foods deliberately get no owner.
create or replace function public.with_sync_new_saved_food_to_global()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  new_global_id uuid;
  creator_id uuid := auth.uid();
begin
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

  if creator_id is not null then
    insert into public.saved_food_owners (saved_food_id, user_id, created_at)
    values (new.id, creator_id, new.created_at)
    on conflict (saved_food_id) do nothing;

    insert into public.global_food_owners (global_food_id, user_id, created_at)
    values (new_global_id, creator_id, new.created_at)
    on conflict (global_food_id) do nothing;
  end if;

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
$function$;

revoke all on function public.with_sync_new_saved_food_to_global() from public;
revoke execute on function public.with_sync_new_saved_food_to_global() from anon, authenticated;

-- Household members still need to update use_count / last_used_at while using
-- a shared food. Only canonical changes are creator-restricted.
create or replace function public.with_protect_saved_food_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  requester_id uuid := auth.uid();
  creator_id uuid;
  canonical_changed boolean;
begin
  if requester_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select o.user_id
    into creator_id
  from public.saved_food_owners o
  where o.saved_food_id = old.id;

  if tg_op = 'DELETE' then
    if creator_id is distinct from requester_id then
      raise exception 'Only the person who created this saved food can delete it.';
    end if;
    return old;
  end if;

  canonical_changed := row(
    new.name,
    new.calories,
    new.protein,
    new.carbs,
    new.fat,
    new.fiber,
    new.default_meal,
    new.notes,
    new.serving_label
  ) is distinct from row(
    old.name,
    old.calories,
    old.protein,
    old.carbs,
    old.fat,
    old.fiber,
    old.default_meal,
    old.notes,
    old.serving_label
  );

  if canonical_changed and creator_id is distinct from requester_id then
    raise exception 'Only the person who created this saved food can change it.';
  end if;

  return new;
end;
$function$;

drop trigger if exists with_protect_saved_food_creator on public.saved_foods;
create trigger with_protect_saved_food_creator
before update or delete on public.saved_foods
for each row execute function public.with_protect_saved_food_creator();

revoke all on function public.with_protect_saved_food_creator() from public;
revoke execute on function public.with_protect_saved_food_creator() from anon, authenticated;

-- Return true only when the caller owns the shared food and the canonical
-- nutrition was updated. Return false for someone else's food, ownerless
-- legacy food, or external/USDA food so the caller can keep the change log-only.
create or replace function public.with_update_owned_food_nutrition(
  food_source_input text,
  food_id_input uuid,
  calories_input numeric,
  protein_input numeric,
  carbs_input numeric,
  fat_input numeric,
  fiber_input numeric
)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  requester_id uuid := auth.uid();
  owner_id uuid;
  saved_id uuid;
  global_id uuid;
begin
  if requester_id is null then
    raise exception 'Authentication required.';
  end if;

  if coalesce(calories_input, 0) < 0
     or coalesce(protein_input, 0) < 0
     or coalesce(carbs_input, 0) < 0
     or coalesce(fat_input, 0) < 0
     or coalesce(fiber_input, 0) < 0 then
    raise exception 'Nutrition values cannot be negative.';
  end if;

  if food_source_input = 'household' then
    saved_id := food_id_input;
    select o.user_id, m.global_food_id
      into owner_id, global_id
    from public.saved_food_owners o
    left join public.saved_food_global_map m on m.saved_food_id = o.saved_food_id
    where o.saved_food_id = saved_id;

    if owner_id is distinct from requester_id then
      return false;
    end if;

    update public.saved_foods
    set calories = calories_input,
        protein = protein_input,
        carbs = carbs_input,
        fat = fat_input,
        fiber = fiber_input
    where id = saved_id;

    return found;
  end if;

  if food_source_input = 'global' then
    global_id := food_id_input;
    select o.user_id, m.saved_food_id
      into owner_id, saved_id
    from public.global_food_owners o
    join public.global_foods gf on gf.id = o.global_food_id
    left join public.saved_food_global_map m on m.global_food_id = o.global_food_id
    where o.global_food_id = global_id
      and gf.source_type = 'user';

    if owner_id is distinct from requester_id then
      return false;
    end if;

    if saved_id is not null then
      update public.saved_foods
      set calories = calories_input,
          protein = protein_input,
          carbs = carbs_input,
          fat = fat_input,
          fiber = fiber_input
      where id = saved_id;
      return found;
    end if;

    update public.global_foods
    set calories = calories_input,
        protein = protein_input,
        carbs = carbs_input,
        fat = fat_input,
        fiber = fiber_input,
        updated_at = now()
    where id = global_id
      and source_type = 'user';

    return found;
  end if;

  return false;
end;
$function$;

revoke all on function public.with_update_owned_food_nutrition(text, uuid, numeric, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.with_update_owned_food_nutrition(text, uuid, numeric, numeric, numeric, numeric, numeric) to authenticated;
