create table if not exists public.household_food_state (
  household_id uuid not null references public.households(id) on delete cascade,
  food_source text not null check (food_source in ('household', 'global')),
  food_id uuid not null,
  is_favorite boolean not null default false,
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, food_source, food_id)
);

alter table public.household_food_state enable row level security;

create policy "members can view household food state"
on public.household_food_state for select
to authenticated
using (public.is_household_member(household_id));

create policy "members can insert household food state"
on public.household_food_state for insert
to authenticated
with check (public.is_household_member(household_id));

create policy "members can update household food state"
on public.household_food_state for update
to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "members can delete household food state"
on public.household_food_state for delete
to authenticated
using (public.is_household_member(household_id));

grant select, insert, update, delete on public.household_food_state to authenticated;

create index if not exists household_food_state_recent_idx
on public.household_food_state(household_id, last_used_at desc);
