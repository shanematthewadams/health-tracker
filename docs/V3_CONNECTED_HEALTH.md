# With V3 Connected Health — implementation checkpoint

## Verified scope

Development source: `staging`, initially `0ca812b8ce3f52efca9a536c7d9653579b608b55` (V2.5).
Production: `main`, Netlify site `244de24a-8f2e-4772-ad10-96b31ad17766`.
Supabase project: `zlrnragsrttgipmeliwo`, PostgreSQL 17, shared by staging and production; no development database branch exists.
Live schema and RLS were inspected through the Supabase connector. No health records were exported or changed.
Latest applied migration at inspection: `20260922224908`.
Existing activity records have name/date/calories, without structured sets, distance or recovery.
Live personal record ownership and per-metric sharing are already implemented. All inspected security-definer functions have PUBLIC execution revoked.

## Implemented

- Official MCP SDK 1.32.1, stateless Streamable HTTP POST in a Netlify Function at `/mcp`.
- RFC 9728 protected-resource metadata; Supabase OAuth 2.1 discovery is the authorization server. Supabase owns PKCE, code exchange, refresh rotation and client registration. With never handles users' passwords in a new auth system or stores OAuth bearer tokens.
- Dedicated `with_mcp` database role. It does not inherit `authenticated` or With membership access. User tokens and RLS apply to data queries; no service-role credential is used by the MCP server.
- Signed-token verification using `auth.getClaims`, issuer/resource audience/expiry/role/client/session checks, followed by Auth `getUser` and a live session/consent check in PostgreSQL.
- Per-user/client consent: categories, read/write permissions, 90-day expiry, revocation. OIDC `openid` is a login scope; health permissions are separate live With grants, not invented Supabase OAuth scopes.
- Bounded queries (93 days, 2,000 rows), strict validation, 64 KB request limit, same-origin validation when Origin is present, no-store responses, generic errors without health payload logging, Netlify declarative IP/domain rate limiting.
- Own profile/goals, weight, nutrition, activities, workouts/strength, wellness, preferences, summaries, range comparisons and missing-record tools. Missing days and null measurements never become observed zeros.
- Weight/food/workout/wellness writes; goal/correction safeguards with one-time, expiring human approval in With; tracker enable/hide. No SQL, admin, delete, membership or sharing mutation tools.
- An AI boolean cannot approve goals or corrections: prepare a request, have the owner approve its exact before/after values in With, then consume that immutable approval on the matching write. Optimistic concurrency rejects changed records.
- Transactional SQL RPC with durable submission receipts, SHA-256 fingerprints, advisory locks, rejection of reusing keys for different inputs, and atomic rollback of activity/workout/provenance/audit writes.
- Structured workout sets preserve exercise, muscle groups, equipment, reps, weight/unit, load basis, RPE and RIR. Workouts bridge to the existing Activity UI rather than duplicating totals.
- Wellness records preserve unknown sleep/RHR/HRV/energy/fatigue/soreness values.
- Connection settings, OAuth consent and workout detail UI.
- Inbound health import planner with explicit categories, original units/timestamps/source IDs, exact-id duplicate detection and cross-source review candidates. Original observations are retained; overlapping totals are never summed.

## Activation status

The server is held behind a private readiness gate. The MCP and readiness migrations **are applied to the shared database**; the external-observation migration is not. The Custom Access Token hook is saved and enabled in Supabase. OAuth Server remains off, and a live client exchange has not been verified. The readiness gate remains false pending a successful ordinary With login and the OAuth configuration checks below.

The schema test uses PGlite PostgreSQL and a synthetic subset of the live schema, including deliberately broad browser sharing. It meaningfully tests SQL/RLS/transactions, but does not replace testing Auth, PostgREST, the existing food triggers, or Netlify deployment.

Verification checkpoint: 197 automated checks pass locally; the full frontend and Netlify Function bundle build successfully. The first staging commit passed GitHub CI. The deployed `/connected-health/status` returns HTTP 200 with `enabled=false`, `/mcp` returns HTTP 503 while inactive, and the staging consent screen renders its inactive message. Live OAuth discovery returns `feature_disabled`; the project publishes an ES256 signing key. No live authenticated read/write has been demonstrated.

The native Apple Health data path, iOS companion, background delivery, direct Garmin/Strava sync and an in-app AI model are not implemented. No paid API or resource was enabled. Coaching occurs in the connected AI client once activation is complete.

## Required activation sequence (maintainer)

1. Review the two migrations and run `npm test` plus `npm run build`. Validate them against a full isolated schema copy before applying to the shared database. Do not replay historical migrations or backfill health records.
2. Apply the new migration(s) only once. Grant the dedicated role to PostgREST's authenticator. Check security/performance advisors and the current browser flows. The security-definer PUBLIC grant loop preserves old browser/backend access; the live audit found no functions that require this change.
3. Supabase Dashboard → Authentication → OAuth Server: enable OAuth Server, choose `/oauth/consent` as the authorization path, and configure the staging site URL/authorization UI carefully. The single shared project cannot silently move production login/recovery redirects to staging. The current vendor code concatenates Site URL + Authorization Path, so a full staging URL is not a supported escape hatch. Resolve this environment limitation before activation, using an explicitly approved isolated staging auth environment or a separately approved, narrow production consent-page deployment. Do not change the project's Site URL simply to make OAuth work.
4. Authentication → Hooks → Custom Access Token: select `public.with_mcp_access_token_hook`. Preserve any existing hook behavior by composing it, if one is configured. Normal login claims remain unchanged; authorized OAuth clients receive role `with_mcp` and their exact MCP resource audience. The hook must be enabled **before any third-party OAuth authorization**.
5. Register an OAuth client (or enable dynamic registration after considering abuse). Use public-client PKCE, exact redirect URI from the ChatGPT connection UI, and `openid`. Verify refresh tokens are actually issued and honored. Do not claim offline access based on a scope name the provider doesn't support.
6. Netlify → project → Environment variables: create `WITH_MCP_ENABLED=true`, `WITH_MCP_RESOURCE=https://staging--shane-and-alli-health-tracker.netlify.app/mcp`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, scoped to **staging branch Functions**, then redeploy staging. Never enable the switch in production. These are publishable credentials, not a service-role key.
7. Verify the live protected-resource metadata, OAuth issuer metadata, PKCE flow, client redirect, audience-bound signed JWT and `with_mcp` PostgREST role. Supabase's `resource` parameter behavior still needs an actual exchange test; a static audience hook alone does not prove full RFC 8707 interoperability.
8. Use a dedicated test user's independent account/profile. Connect a supported client, read its weight/nutrition history, add synthetic records, retry IDs, test a second user and same-With sharing, revoke and test the original token again. Confirm workouts and sets render in the staging application. Do not write test records into Shane, Alli or Tyson's real histories.
9. Only after the staging demonstration, ask Shane for explicit production promotion approval. Never write `main` without it.

## Connect from ChatGPT (after activation)

Official documentation was checked October 12, 2026: https://developers.openai.com/api/docs/guides/custom-mcp-server and https://developers.openai.com/plugins/build/auth . UI availability remains account/workspace dependent.

1. Open ChatGPT on the web and go to **Plugins**.
2. Select **+ → Add custom MCP server**.
3. Name it **With** and enter the staging `/mcp` URL.
4. Choose **OAuth**. Use the pre-registered client or the configured DCR flow; copy the exact displayed callback URI into Supabase's client registration. No shared bearer secret or database key goes here.
5. Review the connection notice and choose **Create as a plugin**.
6. Install the resulting personal/workspace plugin, sign in to your With account, choose information categories, and optionally approve write access.
7. In a conversation with With enabled, try a bounded weight/nutrition query. Deployment alone does not connect or install this plugin.

Revocation: With → Profile → Account → **Connected Apps & AI → Disconnect**. The live With grant blocks existing tokens immediately; the UI also revokes the Supabase OAuth grant. Disconnect the plugin in ChatGPT as well if removing the client entirely.

## Test checklist before calling the milestone complete

- Authenticated live SDK client + ChatGPT connection, own history retrieval
- Different-person and same-With isolation
- Test-account write visible in Activity and Workout details
- Idempotent retry, conflicting request key, invalid input, read-only denial
- Revocation, expiry, wrong issuer/audience, removed Auth session
- Existing browser auth/onboarding/invitations/food triggers
- Production remains unmodified; health migrations and configuration are explicitly tracked

## Remaining limitations

- Pagination is intentionally not implemented; users must narrow a query above 2,000 rows. No silent truncation.
- Existing macro zeros may mean default values entered by the legacy UI; the server cannot reconstruct what was unknown historically.
- Workout calories are unknown unless supplied. The old dashboard may display those as zero; detailed workout UI retains the unknown value.
- Physiological estimates, PRs, progressive overload recommendations and training-load calculation are not generated. Any provided training load retains provenance; it is not assumed equivalent across providers.
- Legacy workout/food edits in the current UI are not automatically included in the new MCP receipts. Do not claim a complete audit history of all application writes.
- Native Apple Health sync and provider registration remain future work after the first authenticated milestone.

## Current blocker

Supabase OAuth discovery confirms the OAuth Server is disabled. Its consent UI is tied to the project Site URL (production). The live project has ES256 signing keys, but no third-party exchange has been tested. Do not change Site URL to staging: that risks redirecting production account flows. The connected tools cannot modify OAuth/Auth Hook or Netlify branch environment settings. Those settings require a dashboard workflow, with approval at the moment new sensitive-data access is created. Production consent-page changes remain a production deployment and are not implicitly authorized by this V3 brief.

## Shared-instance preparation — October 12, 2026

Shane explicitly chose to keep one Supabase instance and authorized the narrow production consent/settings release. No separate project or billing was created.

The exact live public schema (31 tables, 37 functions, existing policies and eight triggers) was recreated locally without health rows. Synthetic weight, food and workout operations, duplicate retry, admin RPC denial and revocation passed against that copy. The MCP migration was applied as `20261012143823_connected_health_mcp`; the readiness gate as `20261012143835_mcp_rollout_readiness`. Repository filenames now match the live ledger. The external-observation migration remains unapplied.

Health row counts were unchanged before and after application. Live SQL also verified that the unauthenticated `with_mcp` role sees no weight rows and lacks admin RPC execution. The readiness flag remains false.

The production release contains only OAuth consent, human change-review and connection-management UI plus a public metadata function. Its consent uses the exact staging MCP resource instead of the production page origin. The production MCP server is not part of this release. Supabase Site URL and existing account redirects remain unchanged.

Connection readiness is held in a private administrative table. Public `mcp_rollout_status()` returns only the setup flag and canonical endpoint. Its SECURITY DEFINER advisor warning is intentional: it reads no health data and public clients cannot modify the private flag. Existing app routines were not rewritten. Performance advisors identified constant per-row checks in new policies and inherited preference policies; these do not widen access and are a later optimization.

Supabase dashboard sign-in is complete. On October 12, `public.with_mcp_access_token_hook` was selected as the enabled Postgres Customize Access Token (JWT) Claims hook. There was no existing hook to replace. Live SQL confirms Supabase Auth can execute it, browser users cannot execute it, normal-login input is returned unchanged, and an unregistered OAuth client is rejected. The connector cannot impersonate `supabase_auth_admin` via SET ROLE; execution privileges were verified instead.

A fresh production With sign-in attempt returned the application's incorrect-email/password message. This does not establish a successful ordinary sign-in, so the readiness gate remains false. Retry with the user's With credentials through secure sign-in or manual handoff; never request credentials in chat. OAuth Server is still disabled. Its disabled dashboard hides authorization-path settings, so `/oauth/consent` must still be configured when activating it. Keep the readiness gate false until normal login and the saved OAuth path are verified; then set `private.mcp_rollout_settings.security_ready=true`. The gate prevents deployed consent UI from approving an AI connection before setup is complete.

No Netlify environment edits are required: the function uses the existing project's publishable configuration and fixed staging address. The publishable key is not a server secret. Earlier activation instructions above describe historical defaults; this shared-instance checkpoint is authoritative.
