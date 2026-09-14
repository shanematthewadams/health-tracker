create table public.custom_metric_goals (
  metric_id uuid primary key references public.custom_metrics(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  target_value numeric not null check (target_value > 0),
  period text not null check (period in ('day','week')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_metric_goals_metric_profile_fkey
    foreign key (metric_id, profile_id)
    references public.custom_metrics(id, profile_id)
    on delete cascade
);

create index custom_metric_goals_profile_idx
  on public.custom_metric_goals(profile_id);

alter table public.custom_metric_goals enable row level security;

revoke all on table public.custom_metric_goals from anon;
grant select, insert, update, delete on table public.custom_metric_goals to authenticated;
grant all on table public.custom_metric_goals to service_role;

create policy "permitted people can view custom metric goals"
  on public.custom_metric_goals for select
  using ((select private.can_view_custom_metric(metric_id)));

create policy "people can create own custom metric goals"
  on public.custom_metric_goals for insert
  with check ((select private.owns_profile(profile_id)));

create policy "people can update own custom metric goals"
  on public.custom_metric_goals for update
  using ((select private.owns_profile(profile_id)))
  with check ((select private.owns_profile(profile_id)));

create policy "people can delete own custom metric goals"
  on public.custom_metric_goals for delete
  using ((select private.owns_profile(profile_id)));

create or replace function private.validate_custom_metric_goal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metric_kind text;
begin
  select metric.value_type into metric_kind
  from public.custom_metrics metric
  where metric.id = new.metric_id
    and metric.profile_id = new.profile_id;

  if metric_kind is null then
    raise exception 'Custom tracker does not belong to this profile.';
  end if;

  if metric_kind = 'rating' then
    raise exception 'Rating trackers do not support goals.';
  end if;

  if metric_kind = 'yes_no' then
    if new.period <> 'week' then
      raise exception 'Yes/no tracker goals are weekly.';
    end if;
    if new.target_value < 1 or new.target_value > 7 or new.target_value <> trunc(new.target_value) then
      raise exception 'Yes/no tracker goals must be 1 to 7 days per week.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.validate_custom_metric_goal() from public;
revoke all on function private.validate_custom_metric_goal() from anon;
revoke all on function private.validate_custom_metric_goal() from authenticated;
grant execute on function private.validate_custom_metric_goal() to service_role;

create trigger custom_metric_goals_validate
before insert or update on public.custom_metric_goals
for each row execute function private.validate_custom_metric_goal();
