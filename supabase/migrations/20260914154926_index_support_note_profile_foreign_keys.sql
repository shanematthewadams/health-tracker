create index support_notes_sender_profile_idx
  on public.support_notes(sender_profile_id);

create index support_notes_recipient_profile_idx
  on public.support_notes(recipient_profile_id);
