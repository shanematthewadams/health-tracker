# With v2.5 — Transactional Auth Email Operations

With transactional email copy is now managed through the in-app Admin under:

**Admin → Editorial → Emails**

The guiding rule is:

> Content is admin-managed. Structure is code-managed.

## Current delivery paths

### Supabase Auth

Supabase Auth continues to send:

- account confirmation
- password recovery
- email-change confirmation

The application does not replace Supabase Auth delivery or token behavior.

The Admin editor stores approved copy in `public.transactional_email_content`. When an administrator saves one of these Auth-backed messages, `manage-transactional-email` renders the fixed With email structure and synchronizes the subject and HTML to the hosted Supabase Auth configuration through the Supabase Management API.

The renderer preserves `{{ .ConfirmationURL }}` for action and fallback links and maps approved With variables to supported Supabase Auth template variables. Admin users never edit raw HTML, CSS, auth URLs, or Supabase template syntax.

### With invitations

With invitations continue to send through the `send-with-invite` Edge Function and Resend.

The invitation function reads the active `with_invitation` copy from `public.transactional_email_content` at send time. If the editorial row cannot be read, the function uses code-owned fallback copy so an editorial problem cannot prevent an invitation from being sent.

## Required server-side secret

Automatic Supabase Auth template synchronization requires this Edge Function secret:

`WITH_WITH_SUPABASE_ACCESS_TOKEN`

It must be a Supabase personal access token with permission to manage the With project.

**Never put this token in React/Vite environment variables, GitHub source, browser code, logs, or this document.**

Configure it only as a Supabase Edge Function secret.

If the secret is missing or rejected:

- Admin copy still saves successfully to With
- invitation copy continues to work through Resend
- Auth template synchronization fails safely
- the Email editor shows the sync error
- the last working hosted Supabase Auth template remains in place

## System-controlled email structure

Code controls:

- approved With branding
- email-safe HTML and responsive structure
- CTA URL and fallback URL
- supported template variables
- variable escaping
- required security/account language
- footer structure
- provider integration
- environment-aware redirects

Admin controls only approved editorial fields:

- subject
- preheader
- headline
- body copy
- CTA label
- supporting text

## Supported Admin templates

| Template key | Admin name | Delivery |
| --- | --- | --- |
| `confirm_signup` | Confirm email | Supabase Auth |
| `password_recovery` | Password recovery | Supabase Auth |
| `email_change` | Confirm email change | Supabase Auth |
| `with_invitation` | Join a With invitation | Resend |

Magic-link/OTP and reauthentication emails are not currently exposed in Admin because the application does not currently use those flows.

## Redirect behavior

Do not replace Supabase's `{{ .ConfirmationURL }}` with a fixed production URL.

Signup and recovery calls already pass environment-aware return destinations. Staging-originated flows must return to staging; production-originated flows must return to production.

## Email-client assumptions

Transactional templates deliberately use email-safe typography and simple single-column markup.

- body fallback: Arial / Helvetica / sans-serif
- editorial heading fallback: Georgia / serif
- no remote web-font dependency
- no background-image dependency
- no animation
- no essential information contained only in images

The email remains understandable if images are blocked.
