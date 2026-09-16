create table public.custom_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  value_type text not null check (value_type in ('yes_no','count','duration','quantity')),
  unit text check (unit is null or char_length(btrim(unit)) between 1 and 24),
  enabled boolean not null default true,
  visibility text not null default 'all_withs' check (visibility in ('all_withs','private','selected_withs')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, profile_id)
);

create table public.custom_metric_withs (
  metric_id uuid not null references public.custom_metrics(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (metric_id, household_id)
);

create table public.custom_metric_entries (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null,
  boolean_value boolean,
  numeric_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_metric_entries_metric_profile_fkey
    foreign key (metric_id, profile_id)
    references public.custom_metrics(id, profile_id)
    on delete cascade,
  unique (metric_id, entry_date)
);

create index custom_metrics_profile_sort_idx
  on public.custom_metrics(profile_id, sort_order, created_at);
create index custom_metric_entries_profile_date_idx
  on public.custom_metric_entries(profile_id, entry_date);

alter table public.custom_metrics enable row level security;
alter table public.custom_metric_withs enable row level security;
alter table public.custom_metric_entries enable row level security;

revoke all on table public.custom_metrics from anon;
revoke all on table public.custom_metric_withs from anon;
revoke all on table public.custom_metric_entries from anon;
grant select, insert, update, delete on table public.custom_metrics to authenticated;
grant select, insert, delete on table public.custom_metric_withs to authenticated;
grant select, insert, update, delete on table public.custom_metric_entries to authenticated;
grant all on table public.custom_metrics to service_role;
grant all on table public.custom_metric_withs to service_role;
grant all on table public.custom_metric_entries to service_role;

create or replace function private.can_view_custom_metric(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.custom_metrics metric
    join public.profiles p on p.id = metric.profile_id
    where metric.id = $1
      and p.user_id is not null
      and (
        p.user_id = (select auth.uid())
        or (
          metric.visibility <> 'private'
          and exists (
            select 1
            from public.household_members profile_membership
            join public.household_members viewer_membership
              on viewer_membership.household_id = profile_membership.household_id
             and viewer_membership.user_id = (select auth.uid())
            where profile_membership.user_id = p.user_id
              and (
                metric.visibility = 'all_withs'
                or (
                  metric.visibility = 'selected_withs'
                  and exists (
                    select 1
                    from public.custom_metric_withs selected_with
                    where selected_with.metric_id = metric.id
                      and selected_with.household_id = profile_membership.household_id
                  )
                )
              )
          )
        )
      )
  );
$$;

revoke all on function private.can_view_custom_metric(uuid) from public;
revoke all on function private.can_view_custom_metric(uuid) from anon;
grant execute on function private.can_view_custom_metric(uuid) to authenticated;
grant execute on function private.can_view_custom_metric(uuid) to service_role;

create policy "permitted people can view custom metrics"
  on public.custom_metrics for select
  using ((select private.can_view_custom_metric(id)));
create policy "people can create own custom metrics"
  on public.custom_metrics for insert
  with check ((select private.owns_profile(profile_id)));
create policy "people can update own custom metrics"
  on public.custom_metrics for update
  using ((select private.owns_profile(profile_id)))
  with check ((select private.owns_profile(profile_id)));
create policy "people can delete own custom metrics"
  on public.custom_metrics for delete
  using ((select private.owns_profile(profile_id)));

create policy "people can view selected Withs for own custom metrics"
  on public.custom_metric_withs for select
  using (exists (
    select 1 from public.custom_metrics metric
    where metric.id = custom_metric_withs.metric_id
      and (select private.owns_profile(metric.profile_id))
  ));
create policy "people can add selected Withs for own custom metrics"
  on public.custom_metric_withs for insert
  with check (
    exists (
      select 1 from public.custom_metrics metric
      where metric.id = custom_metric_withs.metric_id
        and (select private.owns_profile(metric.profile_id))
    )
    and (select private.is_with_member(household_id))
  );
create policy "people can remove selected Withs for own custom metrics"
  on public.custom_metric_withs for delete
  using (exists (
    select 1 from public.custom_metrics metric
    where metric.id = custom_metric_withs.metric_id
      and (select private.owns_profile(metric.profile_id))
  ));

create policy "permitted people can view custom metric entries"
  on public.custom_metric_entries for select
  using ((select private.can_view_custom_metric(metric_id)));
create policy "people can insert own custom metric entries"
  on public.custom_metric_entries for insert
  with check ((select private.owns_profile(profile_id)));
create policy "people can update own custom metric entries"
  on public.custom_metric_entries for update
  using ((select private.owns_profile(profile_id)))
  with check ((select private.owns_profile(profile_id)));
create policy "people can delete own custom metric entries"
  on public.custom_metric_entries for delete
  using ((select private.owns_profile(profile_id)));

create or replace function private.validate_custom_metric_entry()
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

  if metric_kind = 'yes_no' then
    if new.boolean_value is null or new.numeric_value is not null then
      raise exception 'Yes/no trackers require a yes/no value.';
    end if;
  else
    if new.numeric_value is null or new.boolean_value is not null then
      raise exception 'This tracker requires a numeric value.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.validate_custom_metric_entry() from public;
revoke all on function private.validate_custom_metric_entry() from anon;
revoke all on function private.validate_custom_metric_entry() from authenticated;
grant execute on function private.validate_custom_metric_entry() to service_role;

create trigger custom_metric_entries_validate
before insert or update on public.custom_metric_entries
for each row execute function private.validate_custom_metric_entry();
