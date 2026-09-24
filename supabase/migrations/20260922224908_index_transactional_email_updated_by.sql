create index if not exists transactional_email_content_updated_by_idx
  on public.transactional_email_content (updated_by);
