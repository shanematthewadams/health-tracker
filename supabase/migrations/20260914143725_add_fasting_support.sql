create table public.fasting_supports (
  id uuid primary key default gen_random_uuid(),
  fasting_entry_id uuid not null references public.fasting_entries(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint fasting_supports_not_self check (sender_profile_id <> recipient_profile_id),
  constraint fasting_supports_sender_per_fast_unique unique (fasting_entry_id, sender_profile_id)
);

create index fasting_supports_sender_profile_idx
  on public.fasting_supports(sender_profile_id);
create index fasting_supports_recipient_profile_idx
  on public.fasting_supports(recipient_profile_id);

alter table public.fasting_supports enable row level security;

revoke all on table public.fasting_supports from anon;
grant select, insert on table public.fasting_supports to authenticated;
grant all on table public.fasting_supports to service_role;

create policy "support participants can view fasting support"
  on public.fasting_supports for select
  to authenticated
  using (
    (select private.owns_profile(sender_profile_id))
    or (select private.owns_profile(recipient_profile_id))
  );

create policy "With members can support visible active fasts"
  on public.fasting_supports for insert
  to authenticated
  with check (
    (select private.owns_profile(sender_profile_id))
    and sender_profile_id <> recipient_profile_id
    and (select private.can_view_profile_metric(recipient_profile_id, 'fasting'))
    and exists (
      select 1
      from public.fasting_entries fast
      where fast.id = fasting_supports.fasting_entry_id
        and fast.profile_id = fasting_supports.recipient_profile_id
        and fast.ended_at is null
    )
  );
