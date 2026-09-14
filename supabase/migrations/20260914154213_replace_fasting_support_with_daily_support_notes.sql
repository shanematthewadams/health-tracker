create table public.support_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  support_date date not null,
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_notes_not_self check (sender_profile_id <> recipient_profile_id),
  constraint support_notes_message_length check (char_length(btrim(message)) between 1 and 280),
  constraint support_notes_daily_unique unique (household_id, sender_profile_id, recipient_profile_id, support_date)
);

create index support_notes_recipient_day_idx
  on public.support_notes(household_id, recipient_profile_id, support_date);

alter table public.support_notes enable row level security;

revoke all on table public.support_notes from anon;
grant select, insert, update, delete on table public.support_notes to authenticated;
grant all on table public.support_notes to service_role;

create policy "support note participants can view current With notes"
  on public.support_notes for select
  to authenticated
  using (
    (select private.is_with_member(household_id))
    and (
      (select private.owns_profile(sender_profile_id))
      or (select private.owns_profile(recipient_profile_id))
    )
  );

create policy "With members can send daily support notes"
  on public.support_notes for insert
  to authenticated
  with check (
    (select private.owns_profile(sender_profile_id))
    and sender_profile_id <> recipient_profile_id
    and (select private.is_with_member(household_id))
    and exists (
      select 1
      from public.profiles recipient
      join public.household_members recipient_membership
        on recipient_membership.user_id = recipient.user_id
      where recipient.id = support_notes.recipient_profile_id
        and recipient_membership.household_id = support_notes.household_id
    )
  );

create policy "senders can edit their daily support notes"
  on public.support_notes for update
  to authenticated
  using (
    (select private.owns_profile(sender_profile_id))
    and (select private.is_with_member(household_id))
  )
  with check (
    (select private.owns_profile(sender_profile_id))
    and sender_profile_id <> recipient_profile_id
    and (select private.is_with_member(household_id))
    and exists (
      select 1
      from public.profiles recipient
      join public.household_members recipient_membership
        on recipient_membership.user_id = recipient.user_id
      where recipient.id = support_notes.recipient_profile_id
        and recipient_membership.household_id = support_notes.household_id
    )
  );

create policy "senders can delete their daily support notes"
  on public.support_notes for delete
  to authenticated
  using (
    (select private.owns_profile(sender_profile_id))
    and (select private.is_with_member(household_id))
  );

drop table public.fasting_supports;
