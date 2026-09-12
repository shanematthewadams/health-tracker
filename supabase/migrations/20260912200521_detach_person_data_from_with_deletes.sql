-- Phase 1: legacy household_id remains as compatibility metadata, but deleting
-- a With must never delete person-owned profile or health-history rows.

alter table public.profiles drop constraint if exists profiles_household_id_fkey;
alter table public.profiles
  add constraint profiles_household_id_fkey
  foreign key (household_id) references public.households(id) on delete set null;

alter table public.weight_entries drop constraint if exists weight_entries_household_id_fkey;
alter table public.weight_entries
  add constraint weight_entries_household_id_fkey
  foreign key (household_id) references public.households(id) on delete set null;

alter table public.food_entries drop constraint if exists food_entries_household_id_fkey;
alter table public.food_entries
  add constraint food_entries_household_id_fkey
  foreign key (household_id) references public.households(id) on delete set null;

alter table public.activity_entries drop constraint if exists activity_entries_household_id_fkey;
alter table public.activity_entries
  add constraint activity_entries_household_id_fkey
  foreign key (household_id) references public.households(id) on delete set null;

alter table public.step_entries drop constraint if exists step_entries_household_id_fkey;
alter table public.step_entries
  add constraint step_entries_household_id_fkey
  foreign key (household_id) references public.households(id) on delete set null;

alter table public.water_entries drop constraint if exists water_entries_household_id_fkey;
alter table public.water_entries
  add constraint water_entries_household_id_fkey
  foreign key (household_id) references public.households(id) on delete set null;

alter table public.fasting_entries drop constraint if exists fasting_entries_household_id_fkey;
alter table public.fasting_entries
  add constraint fasting_entries_household_id_fkey
  foreign key (household_id) references public.households(id) on delete set null;
