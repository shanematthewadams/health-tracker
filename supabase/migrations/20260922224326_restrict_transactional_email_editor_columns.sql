revoke update on table public.transactional_email_content from authenticated;

grant update (
  subject,
  preheader,
  headline,
  body_copy,
  cta_label,
  supporting_text,
  updated_by,
  updated_at,
  last_sync_error
) on table public.transactional_email_content to authenticated;
