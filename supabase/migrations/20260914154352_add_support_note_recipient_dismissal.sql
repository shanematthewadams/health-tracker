alter table public.support_notes
  add column dismissed_at timestamptz;

drop policy "senders can edit their daily support notes" on public.support_notes;

create policy "support note participants can update permitted fields"
  on public.support_notes for update
  to authenticated
  using (
    (select private.is_with_member(household_id))
    and (
      (select private.owns_profile(sender_profile_id))
      or (select private.owns_profile(recipient_profile_id))
    )
  )
  with check (
    (select private.is_with_member(household_id))
    and (
      (select private.owns_profile(sender_profile_id))
      or (select private.owns_profile(recipient_profile_id))
    )
    and sender_profile_id <> recipient_profile_id
    and exists (
      select 1
      from public.profiles recipient
      join public.household_members recipient_membership
        on recipient_membership.user_id = recipient.user_id
      where recipient.id = support_notes.recipient_profile_id
        and recipient_membership.household_id = support_notes.household_id
    )
  );

create or replace function private.enforce_support_note_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select private.owns_profile(old.sender_profile_id)) then
    if new.household_id is distinct from old.household_id
      or new.sender_profile_id is distinct from old.sender_profile_id
      or new.recipient_profile_id is distinct from old.recipient_profile_id
      or new.support_date is distinct from old.support_date
      or new.created_at is distinct from old.created_at
      or new.dismissed_at is distinct from old.dismissed_at then
      raise exception 'Support note identity and dismissal fields cannot be changed by sender';
    end if;
    new.updated_at := now();
    return new;
  end if;

  if (select private.owns_profile(old.recipient_profile_id)) then
    if new.household_id is distinct from old.household_id
      or new.sender_profile_id is distinct from old.sender_profile_id
      or new.recipient_profile_id is distinct from old.recipient_profile_id
      or new.support_date is distinct from old.support_date
      or new.message is distinct from old.message
      or new.created_at is distinct from old.created_at
      or new.updated_at is distinct from old.updated_at then
      raise exception 'Recipients can only dismiss support notes';
    end if;
    return new;
  end if;

  raise exception 'Support note update not permitted';
end;
$$;

create trigger support_notes_update_guard
before update on public.support_notes
for each row execute function private.enforce_support_note_update();
