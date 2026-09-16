alter table public.profiles
  add column if not exists daily_reflection_enabled boolean not null default true;

create table if not exists public.daily_reflections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reflection_date date not null,
  rating smallint not null check (rating between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_reflections_profile_date_key unique (profile_id, reflection_date),
  constraint daily_reflections_note_length_check check (note is null or char_length(note) <= 320)
);

alter table public.daily_reflections enable row level security;

revoke all on table public.daily_reflections from anon;
grant select, insert, update, delete on table public.daily_reflections to authenticated;

drop policy if exists "owners can read daily reflections" on public.daily_reflections;
create policy "owners can read daily reflections"
on public.daily_reflections
for select
to authenticated
using ((select private.owns_profile(daily_reflections.profile_id)));

drop policy if exists "owners can create daily reflections" on public.daily_reflections;
create policy "owners can create daily reflections"
on public.daily_reflections
for insert
to authenticated
with check ((select private.owns_profile(daily_reflections.profile_id)));

drop policy if exists "owners can update daily reflections" on public.daily_reflections;
create policy "owners can update daily reflections"
on public.daily_reflections
for update
to authenticated
using ((select private.owns_profile(daily_reflections.profile_id)))
with check ((select private.owns_profile(daily_reflections.profile_id)));

drop policy if exists "owners can delete daily reflections" on public.daily_reflections;
create policy "owners can delete daily reflections"
on public.daily_reflections
for delete
to authenticated
using ((select private.owns_profile(daily_reflections.profile_id)));

comment on table public.daily_reflections is 'Private, person-owned daily reflections. Never shared through With membership.';
