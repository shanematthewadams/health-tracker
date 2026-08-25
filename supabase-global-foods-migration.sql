create table if not exists public.global_foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  calories numeric default 0,
  protein numeric default 0,
  carbs numeric default 0,
  fat numeric default 0,
  fiber numeric default 0,
  serving_label text not null default '1 serving',
  default_meal text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.global_foods enable row level security;

drop policy if exists "authenticated users can view global foods" on public.global_foods;
create policy "authenticated users can view global foods"
on public.global_foods for select
to authenticated
using (true);

grant select on public.global_foods to authenticated;

create index if not exists global_foods_name_idx
on public.global_foods(name);
