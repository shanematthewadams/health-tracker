alter table public.reflection_quotes
  drop constraint if exists reflection_quotes_placements_check;

alter table public.reflection_quotes
  add constraint reflection_quotes_placements_check check (
    cardinality(placements) > 0
    and placements <@ array['weekly_reflection','preparing_with','onboarding','homepage']::text[]
  );

comment on column public.reflection_quotes.placements is
  'Editorial surfaces where an item may appear: weekly_reflection, preparing_with, onboarding, and homepage.';

revoke all on table public.reflection_quotes from anon;
grant select (id, quote, attribution, quote_kind, placements, active)
  on table public.reflection_quotes to anon;

drop policy if exists "anonymous visitors can read homepage quotes"
  on public.reflection_quotes;

create policy "anonymous visitors can read homepage quotes"
  on public.reflection_quotes
  for select
  to anon
  using (
    active = true
    and 'homepage' = any(placements)
  );

update public.reflection_quotes
set placements = placements || array['homepage']::text[],
    updated_at = now()
where id in (
  'c55ea593-1f58-49ee-8ee9-ddf466f528a3',
  '9e2f6fcd-463c-4e03-84d5-ba64473d85f4',
  'db6e685c-5ff3-4ebd-90b1-724cebda87e1',
  '69d5e061-86f1-4a76-9e11-37bbcd8210b8',
  'fabce5df-733e-402a-a35e-8a8e2c50045f',
  'f9d84b0c-566d-4ad2-b3b9-dabaf9ebc447',
  '3532beb5-9600-4166-988c-19b04360b354',
  'cf6dece6-bc43-49a5-a295-f5fc521904e8',
  '725acb1c-8d19-4185-a6d7-69b15987f7f3',
  '8b38ee16-9e31-4849-828a-da65e8957cc2',
  'f1ba1d13-6169-4a84-ab0e-cf3234605757',
  '7584ada4-9cd0-4e1c-898a-454e9fdc6f5d'
)
and not ('homepage' = any(placements));
