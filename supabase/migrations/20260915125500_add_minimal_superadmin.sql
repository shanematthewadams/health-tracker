create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "admins can view own admin status" on public.app_admins;
create policy "admins can view own admin status"
on public.app_admins
for select
to authenticated
using (user_id = auth.uid());

grant select on public.app_admins to authenticated;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

create table if not exists public.food_import_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  source_name text not null check (char_length(btrim(source_name)) between 1 and 120),
  filename text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'partial')),
  total_rows integer not null default 0 check (total_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  duplicate_rows integer not null default 0 check (duplicate_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.food_import_batches enable row level security;

drop policy if exists "admins can view food import batches" on public.food_import_batches;
create policy "admins can view food import batches"
on public.food_import_batches
for select
to authenticated
using (public.is_app_admin());

drop policy if exists "admins can create food import batches" on public.food_import_batches;
create policy "admins can create food import batches"
on public.food_import_batches
for insert
to authenticated
with check (public.is_app_admin() and created_by = auth.uid());

drop policy if exists "admins can update food import batches" on public.food_import_batches;
create policy "admins can update food import batches"
on public.food_import_batches
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

grant select, insert, update on public.food_import_batches to authenticated;

alter table public.global_foods
  add column if not exists import_batch_id uuid references public.food_import_batches(id) on delete set null;

alter table public.global_foods drop constraint if exists global_foods_source_type_check;
alter table public.global_foods
  add constraint global_foods_source_type_check
  check (source_type = any (array['user'::text, 'usda_fdc'::text, 'admin_import'::text]));

drop policy if exists "authenticated users can create global foods" on public.global_foods;
create policy "authenticated users can create global foods"
on public.global_foods
for insert
to authenticated
with check (
  source_type in ('user', 'usda_fdc')
  or public.is_app_admin()
);

drop policy if exists "admins can update global foods" on public.global_foods;
create policy "admins can update global foods"
on public.global_foods
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

grant update on public.global_foods to authenticated;

create or replace function public.admin_account_directory()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  profile_id uuid,
  profile_name text,
  enabled_standard_trackers integer,
  enabled_custom_trackers integer,
  withs jsonb,
  pending_invitations jsonb
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_app_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    p.id,
    p.name,
    coalesce((
      select count(*)::integer
      from public.profile_metric_preferences pmp
      where pmp.profile_id = p.id and pmp.enabled
    ), 0),
    coalesce((
      select count(*)::integer
      from public.custom_metrics cm
      where cm.profile_id = p.id and cm.enabled
    ), 0),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', h.id,
          'name', h.name,
          'role', hm.role,
          'joined_at', hm.created_at
        )
        order by hm.created_at
      )
      from public.household_members hm
      join public.households h on h.id = hm.household_id
      where hm.user_id = u.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', hi.id,
          'with_id', hi.household_id,
          'status', hi.status,
          'created_at', hi.created_at,
          'expires_at', hi.expires_at
        )
        order by hi.created_at desc
      )
      from public.household_invitations hi
      where lower(hi.email) = lower(u.email)
        and hi.status = 'pending'
    ), '[]'::jsonb)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_account_directory() from public;
grant execute on function public.admin_account_directory() to authenticated;
