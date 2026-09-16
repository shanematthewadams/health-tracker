alter table public.custom_metrics
  drop constraint if exists custom_metrics_value_type_check;

alter table public.custom_metrics
  add constraint custom_metrics_value_type_check
  check (value_type in ('yes_no','count','duration','quantity','rating'));

alter table public.custom_metrics
  add column rating_low_label text,
  add column rating_high_label text;

alter table public.custom_metrics
  add constraint custom_metrics_rating_low_label_check
    check (rating_low_label is null or char_length(btrim(rating_low_label)) between 1 and 24),
  add constraint custom_metrics_rating_high_label_check
    check (rating_high_label is null or char_length(btrim(rating_high_label)) between 1 and 24);

create table public.profile_quick_add_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  configured boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.profile_quick_add_items (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  position smallint not null check (position between 1 and 5),
  standard_metric_type text,
  custom_metric_id uuid,
  created_at timestamptz not null default now(),
  primary key (profile_id, position),
  constraint profile_quick_add_items_one_kind_check
    check (num_nonnulls(standard_metric_type, custom_metric_id) = 1),
  constraint profile_quick_add_items_standard_type_check
    check (standard_metric_type is null or standard_metric_type in ('food','weight','activity','water','steps')),
  constraint profile_quick_add_items_custom_metric_fkey
    foreign key (custom_metric_id, profile_id)
    references public.custom_metrics(id, profile_id)
    on delete cascade
);

create unique index profile_quick_add_standard_unique
  on public.profile_quick_add_items(profile_id, standard_metric_type)
  where standard_metric_type is not null;

create unique index profile_quick_add_custom_unique
  on public.profile_quick_add_items(profile_id, custom_metric_id)
  where custom_metric_id is not null;

alter table public.profile_quick_add_settings enable row level security;
alter table public.profile_quick_add_items enable row level security;

revoke all on table public.profile_quick_add_settings from anon;
revoke all on table public.profile_quick_add_items from anon;
grant select, insert, update, delete on table public.profile_quick_add_settings to authenticated;
grant select, insert, update, delete on table public.profile_quick_add_items to authenticated;
grant all on table public.profile_quick_add_settings to service_role;
grant all on table public.profile_quick_add_items to service_role;

create policy "people can view own quick add settings"
  on public.profile_quick_add_settings for select
  using ((select private.owns_profile(profile_id)));
create policy "people can insert own quick add settings"
  on public.profile_quick_add_settings for insert
  with check ((select private.owns_profile(profile_id)));
create policy "people can update own quick add settings"
  on public.profile_quick_add_settings for update
  using ((select private.owns_profile(profile_id)))
  with check ((select private.owns_profile(profile_id)));
create policy "people can delete own quick add settings"
  on public.profile_quick_add_settings for delete
  using ((select private.owns_profile(profile_id)));

create policy "people can view own quick add items"
  on public.profile_quick_add_items for select
  using ((select private.owns_profile(profile_id)));
create policy "people can insert own quick add items"
  on public.profile_quick_add_items for insert
  with check ((select private.owns_profile(profile_id)));
create policy "people can update own quick add items"
  on public.profile_quick_add_items for update
  using ((select private.owns_profile(profile_id)))
  with check ((select private.owns_profile(profile_id)));
create policy "people can delete own quick add items"
  on public.profile_quick_add_items for delete
  using ((select private.owns_profile(profile_id)));

insert into public.profile_quick_add_settings (profile_id, configured)
select id, true
from public.profiles
on conflict (profile_id) do update
set configured = excluded.configured,
    updated_at = now();

with desired(metric_type, desired_order) as (
  values
    ('food'::text, 1),
    ('weight'::text, 2),
    ('activity'::text, 3),
    ('water'::text, 4),
    ('steps'::text, 5)
), enabled_choices as (
  select
    p.id as profile_id,
    d.metric_type,
    d.desired_order,
    row_number() over (partition by p.id order by d.desired_order) as position
  from public.profiles p
  cross join desired d
  left join public.profile_metric_preferences pref
    on pref.profile_id = p.id
   and pref.metric_type = d.metric_type
  where coalesce(pref.enabled, true)
)
insert into public.profile_quick_add_items (profile_id, position, standard_metric_type)
select profile_id, position, metric_type
from enabled_choices
where position <= 5
on conflict (profile_id, position) do nothing;

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
  elsif metric_kind = 'rating' then
    if new.numeric_value is null or new.boolean_value is not null then
      raise exception 'Rating trackers require a numeric value.';
    end if;
    if new.numeric_value < 1 or new.numeric_value > 5 or new.numeric_value <> trunc(new.numeric_value) then
      raise exception 'Rating trackers require a whole-number value from 1 to 5.';
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
