create table if not exists public.reflection_quotes (
  id uuid primary key default gen_random_uuid(),
  quote text not null check (char_length(btrim(quote)) between 1 and 360),
  attribution text null check (attribution is null or char_length(btrim(attribution)) between 1 and 160),
  quote_kind text not null default 'attributed' check (quote_kind in ('with_original','public_domain','attributed')),
  themes text[] not null default '{}'::text[] check (
    themes <@ array['consistency','patience','change','rest','resilience','connection','attention','beginnings','ordinary_days']::text[]
  ),
  source_note text null,
  source_url text null,
  active boolean not null default true,
  featured_week date null check (featured_week is null or extract(isodow from featured_week) = 1),
  created_by uuid null default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reflection_quotes is 'Admin-curated closing thoughts for weekly reflections.';
comment on column public.reflection_quotes.featured_week is 'Monday date of a completed reflection week. When set, this quote overrides normal deterministic selection for that week.';
comment on column public.reflection_quotes.themes is 'Lightweight editorial tags used to prefer a contextually appropriate quote without interpreting health data.';

create unique index if not exists reflection_quotes_unique_text_attribution_idx
  on public.reflection_quotes (lower(btrim(quote)), lower(coalesce(btrim(attribution), '')));

create unique index if not exists reflection_quotes_one_featured_per_week_idx
  on public.reflection_quotes (featured_week)
  where featured_week is not null;

alter table public.reflection_quotes enable row level security;

revoke all on table public.reflection_quotes from anon;
grant select, insert, update, delete on table public.reflection_quotes to authenticated;
grant all on table public.reflection_quotes to service_role;

drop policy if exists "authenticated users can read reflection quotes" on public.reflection_quotes;
create policy "authenticated users can read reflection quotes"
  on public.reflection_quotes
  for select
  to authenticated
  using (active = true or (select public.is_app_admin()));

drop policy if exists "admins can create reflection quotes" on public.reflection_quotes;
create policy "admins can create reflection quotes"
  on public.reflection_quotes
  for insert
  to authenticated
  with check ((select public.is_app_admin()));

drop policy if exists "admins can update reflection quotes" on public.reflection_quotes;
create policy "admins can update reflection quotes"
  on public.reflection_quotes
  for update
  to authenticated
  using ((select public.is_app_admin()))
  with check ((select public.is_app_admin()));

drop policy if exists "admins can delete reflection quotes" on public.reflection_quotes;
create policy "admins can delete reflection quotes"
  on public.reflection_quotes
  for delete
  to authenticated
  using ((select public.is_app_admin()));

insert into public.reflection_quotes (quote, attribution, quote_kind, themes, source_note, active)
values (
  'A week doesn’t have to be perfect to tell you something.',
  'With',
  'with_original',
  array['ordinary_days','patience']::text[],
  'Original With line seeded with the weekly reflection quote library.',
  true
)
on conflict do nothing;
