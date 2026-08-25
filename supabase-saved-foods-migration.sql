alter table public.saved_foods
  add column if not exists serving_label text not null default '1 serving',
  add column if not exists use_count integer not null default 0,
  add column if not exists last_used_at timestamptz;

create index if not exists saved_foods_household_last_used_idx
  on public.saved_foods(household_id, last_used_at desc);
