alter table public.reflection_quotes
  add column if not exists placements text[] not null default array['weekly_reflection']::text[];

update public.reflection_quotes
set placements = array['weekly_reflection']::text[]
where placements is null or cardinality(placements) = 0;

alter table public.reflection_quotes
  drop constraint if exists reflection_quotes_placements_check;
alter table public.reflection_quotes
  add constraint reflection_quotes_placements_check check (
    cardinality(placements) > 0
    and placements <@ array['weekly_reflection','preparing_with','onboarding']::text[]
  );

alter table public.reflection_quotes
  drop constraint if exists reflection_quotes_preparing_length_check;
alter table public.reflection_quotes
  add constraint reflection_quotes_preparing_length_check check (
    not ('preparing_with' = any(placements)) or char_length(btrim(quote)) <= 90
  );

alter table public.reflection_quotes
  drop constraint if exists reflection_quotes_onboarding_length_check;
alter table public.reflection_quotes
  add constraint reflection_quotes_onboarding_length_check check (
    not ('onboarding' = any(placements)) or char_length(btrim(quote)) <= 160
  );

alter table public.reflection_quotes
  drop constraint if exists reflection_quotes_featured_requires_weekly_check;
alter table public.reflection_quotes
  add constraint reflection_quotes_featured_requires_weekly_check check (
    featured_week is null or 'weekly_reflection' = any(placements)
  );

create index if not exists reflection_quotes_active_placements_idx
  on public.reflection_quotes using gin (placements)
  where active = true;

comment on column public.reflection_quotes.placements is
  'Editorial surfaces where an item may appear: weekly_reflection, preparing_with, and onboarding.';
