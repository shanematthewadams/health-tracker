alter table public.profiles
  add column if not exists support_enabled boolean not null default true;

drop policy if exists "With members can send daily support notes" on public.support_notes;
create policy "With members can send daily support notes"
on public.support_notes
for insert
to authenticated
with check (
  (select private.owns_profile(support_notes.sender_profile_id))
  and support_notes.sender_profile_id <> support_notes.recipient_profile_id
  and (select private.is_with_member(support_notes.household_id))
  and exists (
    select 1
    from public.profiles recipient
    join public.household_members recipient_membership
      on recipient_membership.user_id = recipient.user_id
    where recipient.id = support_notes.recipient_profile_id
      and recipient_membership.household_id = support_notes.household_id
      and recipient.support_enabled is true
  )
);

drop policy if exists "support note participants can update permitted fields" on public.support_notes;
create policy "support note participants can update permitted fields"
on public.support_notes
for update
to authenticated
using (
  (select private.is_with_member(support_notes.household_id))
  and (
    (select private.owns_profile(support_notes.sender_profile_id))
    or (select private.owns_profile(support_notes.recipient_profile_id))
  )
)
with check (
  (select private.is_with_member(support_notes.household_id))
  and (
    (select private.owns_profile(support_notes.sender_profile_id))
    or (select private.owns_profile(support_notes.recipient_profile_id))
  )
  and support_notes.sender_profile_id <> support_notes.recipient_profile_id
  and exists (
    select 1
    from public.profiles recipient
    join public.household_members recipient_membership
      on recipient_membership.user_id = recipient.user_id
    where recipient.id = support_notes.recipient_profile_id
      and recipient_membership.household_id = support_notes.household_id
      and (
        (select private.owns_profile(support_notes.recipient_profile_id))
        or recipient.support_enabled is true
      )
  )
);
