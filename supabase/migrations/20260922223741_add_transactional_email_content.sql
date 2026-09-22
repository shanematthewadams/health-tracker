create table if not exists public.transactional_email_content (
  template_key text primary key check (template_key in ('confirm_signup','password_recovery','email_change','with_invitation')),
  internal_name text not null check (char_length(btrim(internal_name)) between 1 and 120),
  category text not null check (category in ('account','security','invitation')),
  trigger_description text not null check (char_length(btrim(trigger_description)) between 1 and 280),
  delivery_path text not null check (delivery_path in ('supabase_auth','resend')),
  subject text not null check (char_length(btrim(subject)) between 1 and 180),
  preheader text not null default '' check (char_length(preheader) <= 240),
  headline text not null check (char_length(btrim(headline)) between 1 and 180),
  body_copy text not null check (char_length(btrim(body_copy)) between 1 and 1600),
  cta_label text not null check (char_length(btrim(cta_label)) between 1 and 80),
  supporting_text text not null default '' check (char_length(supporting_text) <= 800),
  active boolean not null default true,
  system_required boolean not null default true,
  updated_by uuid null default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz null,
  last_sync_error text null
);

comment on table public.transactional_email_content is
  'Admin-managed editorial copy for the fixed With transactional email system. Rendering, URLs, variables, security text, and provider logic remain code-managed.';

alter table public.transactional_email_content enable row level security;

revoke all on table public.transactional_email_content from anon;
revoke all on table public.transactional_email_content from authenticated;
grant select, update on table public.transactional_email_content to authenticated;
grant all on table public.transactional_email_content to service_role;

drop policy if exists "admins can read transactional email content" on public.transactional_email_content;
create policy "admins can read transactional email content"
  on public.transactional_email_content
  for select
  to authenticated
  using ((select public.is_app_admin()));

drop policy if exists "admins can update transactional email content" on public.transactional_email_content;
create policy "admins can update transactional email content"
  on public.transactional_email_content
  for update
  to authenticated
  using ((select public.is_app_admin()))
  with check (
    (select public.is_app_admin())
    and template_key in ('confirm_signup','password_recovery','email_change','with_invitation')
    and system_required = true
    and active = true
  );

insert into public.transactional_email_content
  (template_key, internal_name, category, trigger_description, delivery_path, subject, preheader, headline, body_copy, cta_label, supporting_text)
values
  (
    'confirm_signup',
    'Confirm email',
    'account',
    'Sent after a person creates a With account and needs to verify their email address.',
    'supabase_auth',
    'Confirm your email for With',
    'One quick step to finish creating your account.',
    'Confirm your email.',
    'You’re almost in. Confirm this email address to finish creating your With account.',
    'Confirm my email',
    'Your health stays yours. With gives you a private place to take care of yourself alongside people you trust.'
  ),
  (
    'password_recovery',
    'Password recovery',
    'security',
    'Sent when a person requests a password reset from With or an administrator sends a recovery email.',
    'supabase_auth',
    'Reset your With password',
    'Use this link to choose a new password.',
    'Choose a new password.',
    'We received a request to reset your With password.',
    'Reset my password',
    ''
  ),
  (
    'email_change',
    'Confirm email change',
    'security',
    'Sent when a signed-in person asks to change the email address used for their With account.',
    'supabase_auth',
    'Confirm your new With email',
    'Confirm {{new_email}} as your new sign-in email.',
    'Confirm your new email.',
    'You asked to change the email address you use to sign in to With.',
    'Confirm new email',
    'The new address will be {{new_email}}.'
  ),
  (
    'with_invitation',
    'Join a With invitation',
    'invitation',
    'Sent when a With member invites someone by email to join their With.',
    'resend',
    '{{inviter_name}} invited you to With',
    'Join {{with_name}} on With.',
    '{{inviter_name}} invited you to join {{with_name}}.',
    'With is a private place to take care of yourself alongside people you trust.',
    'Join on With',
    'Joining shares the experience, not your health data or targets.'
  )
on conflict (template_key) do nothing;
