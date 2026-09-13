create table public.profile_metric_preferences (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  metric_type text not null check (metric_type in ('weight','food','activity','water','steps','fasting')),
  enabled boolean not null default true,
  visibility text not null default 'all_withs' check (visibility in ('all_withs','private','selected_withs')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, metric_type)
);

create table public.profile_metric_withs (
  profile_id uuid not null,
  metric_type text not null,
  household_id uuid not null references public.households(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, metric_type, household_id),
  constraint profile_metric_withs_preference_fkey
    foreign key (profile_id, metric_type)
    references public.profile_metric_preferences(profile_id, metric_type)
    on delete cascade
);

alter table public.profile_metric_preferences enable row level security;
alter table public.profile_metric_withs enable row level security;

revoke all on table public.profile_metric_preferences from anon;
revoke all on table public.profile_metric_withs from anon;
grant select, insert, update, delete on table public.profile_metric_preferences to authenticated;
grant select, insert, delete on table public.profile_metric_withs to authenticated;
grant all on table public.profile_metric_preferences to service_role;
grant all on table public.profile_metric_withs to service_role;

create policy "people can view own metric preferences"
  on public.profile_metric_preferences for select
  using ((select private.owns_profile(profile_id)));

create policy "people can insert own metric preferences"
  on public.profile_metric_preferences for insert
  with check ((select private.owns_profile(profile_id)));

create policy "people can update own metric preferences"
  on public.profile_metric_preferences for update
  using ((select private.owns_profile(profile_id)))
  with check ((select private.owns_profile(profile_id)));

create policy "people can delete own metric preferences"
  on public.profile_metric_preferences for delete
  using ((select private.owns_profile(profile_id)));

create policy "people can view own selected metric Withs"
  on public.profile_metric_withs for select
  using ((select private.owns_profile(profile_id)));

create policy "people can add own selected metric Withs"
  on public.profile_metric_withs for insert
  with check (
    (select private.owns_profile(profile_id))
    and (select private.is_with_member(household_id))
  );

create policy "people can remove own selected metric Withs"
  on public.profile_metric_withs for delete
  using ((select private.owns_profile(profile_id)));

insert into public.profile_metric_preferences (profile_id, metric_type)
select p.id, metric.metric_type
from public.profiles p
cross join (values
  ('weight'::text),
  ('food'::text),
  ('activity'::text),
  ('water'::text),
  ('steps'::text),
  ('fasting'::text)
) as metric(metric_type)
on conflict (profile_id, metric_type) do nothing;

create or replace function private.can_view_profile_metric(pid uuid, metric_type text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.owns_profile(pid)
    or exists (
      select 1
      from public.profiles p
      join public.household_members profile_membership
        on profile_membership.user_id = p.user_id
      join public.household_members viewer_membership
        on viewer_membership.household_id = profile_membership.household_id
       and viewer_membership.user_id = (select auth.uid())
      left join public.profile_metric_preferences pref
        on pref.profile_id = p.id
       and pref.metric_type = $2
      where p.id = $1
        and p.user_id is not null
        and coalesce(pref.visibility, 'all_withs') <> 'private'
        and (
          coalesce(pref.visibility, 'all_withs') = 'all_withs'
          or (
            pref.visibility = 'selected_withs'
            and exists (
              select 1
              from public.profile_metric_withs selected_with
              where selected_with.profile_id = p.id
                and selected_with.metric_type = $2
                and selected_with.household_id = profile_membership.household_id
            )
          )
        )
    );
$$;

revoke all on function private.can_view_profile_metric(uuid, text) from public;
revoke all on function private.can_view_profile_metric(uuid, text) from anon;
grant execute on function private.can_view_profile_metric(uuid, text) to authenticated;
grant execute on function private.can_view_profile_metric(uuid, text) to service_role;

create or replace function public.can_view_profile_metric(pid uuid, metric_type text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_view_profile_metric(pid, metric_type);
$$;

revoke all on function public.can_view_profile_metric(uuid, text) from public;
revoke all on function public.can_view_profile_metric(uuid, text) from anon;
grant execute on function public.can_view_profile_metric(uuid, text) to authenticated;
grant execute on function public.can_view_profile_metric(uuid, text) to service_role;
