# With V2 Phase 1 architecture baseline

This document records the Phase 1 architecture decisions made before adding V2 tracker, privacy, fasting, encouragement, or admin features.

## Core ownership model

The canonical model is:

**PERSON → WITH → SHARED EXPERIENCE**

A profile is personal. Health history is personal. A With grants relationship-based visibility but does not own a person's health records.

Stable identifiers are the authoritative internal identity:

- `auth.users.id` / `user_id` identifies the authenticated account.
- `profiles.id` / `profile_id` identifies the person's health profile.
- `households.id` / `with_id` identifies a With. The database retains the historical `household` name internally.

Display names must never be used as authorization identifiers.

## RLS baseline

Phase 1 removed the overlapping household-based and relationship-based policy sets from personal health tables.

Personal tables now use one access model:

- owner writes/deletes through `profile_id` ownership;
- viewing is allowed to the owner and people who currently share a With with the profile owner;
- metric-level visibility is routed through `private.can_view_profile_metric`, which is the extension point for V2 tracker privacy.

With-owned compatibility data such as saved-food state continues to use With membership.

The public legacy ownership helpers remain only for historical compatibility and are not exposed as callable Data API authorization endpoints.

## Legacy `household_id`

The nullable `household_id` fields on profiles and personal health entries remain for backward compatibility during V2.

They are **not** the ownership authority.

Phase 1 changed their foreign keys from `ON DELETE CASCADE` to `ON DELETE SET NULL`. Deleting a With can therefore detach legacy metadata but cannot delete a person's profile or health history.

The columns should not be removed until frontend writes, compatibility triggers, saved-food behavior, and historical migrations no longer depend on them. Removal is not required for V2.

## Multiple Withs lifecycle

A person may belong to multiple Withs while retaining one personal profile and one health history.

Account deletion was updated to:

1. identify every With membership;
2. delete personal health data by `profile_id`, not With;
3. remove the person's profile;
4. remove all memberships;
5. preserve each remaining With;
6. promote a remaining member when a departing account was the sole owner;
7. remove a With only when no members remain;
8. delete the auth account last.

Deleting, leaving, or switching a With must never transfer or delete personal health history.

## Frontend identity status

The Multiple Withs frontend already uses stable IDs for the important relationship decisions:

- membership rows use `household_id`;
- active With selection is stored by With ID;
- profile rows are also mapped by `profile_id`;
- edit permission checks ultimately use profile `user_id` ownership.

`Tracker.jsx` still contains transition-era name-keyed view state and old Shane/Alli fallback presentation/default constants. Those values are not used for database authorization. A wholesale rewrite was deliberately avoided in Phase 1 because the state model is large and currently working.

The V2 tracker-model work should continue moving component state toward `profile_id` as the primary key when touched. Name-keyed state should be treated as UI compatibility, not a pattern to extend.

## Data loading status

`loadAll()` currently loads the active With roster and all visible history for its profiles in one pass. With's present dataset is small, so splitting the loader during an architecture-hardening pass would add meaningful regression risk without a measurable user benefit.

Phase 1 instead:

- confirmed all health loading is scoped by visible `profile_id` values rather than trusting legacy `household_id` ownership;
- added profile/date indexes for food, activity, water, and fasting history;
- retained the current loader contract so Today, Log, Goals, and Trends continue to share a consistent in-memory model.

Before custom trackers create materially more history, data access should move behind page-aware query helpers. The intended direction is:

- Today: current day plus only the recent context it needs;
- Log: selected date/relevant recent entries;
- Trends: explicit requested date range;
- Profile: account/settings/With membership, not health history.

This should be done incrementally as V2 tracker data is introduced rather than by rewriting the current app shell first.

## Migration and backend source of truth

- `supabase/migrations/` is authoritative for schema changes going forward.
- Root-level historical `supabase-*.sql` files are reference material and must not be replayed.
- `supabase/functions/` is authoritative for Supabase Edge Function source.
- Top-level legacy function copies are historical only.

See `supabase/MIGRATIONS.md` for the exact migration baseline.

## Dependency and regression baseline

Frontend dependencies are pinned to exact versions and `package-lock.json` is committed.

Staging has a small automated suite covering:

- Multiple With selection/fallback behavior;
- password recovery routing;
- invitation acceptance contract;
- personal-data foreign-key safety;
- ownership/relationship RLS contract;
- Multiple With account deletion contract;
- critical person/date logging uniqueness.

A staging CI workflow runs `npm ci`, `npm test`, and `npm run build` on every push to `staging`.

## Known advisor findings intentionally retained

Two RLS-enabled internal tables currently have no direct client policies: `household_invitations` and `saved_food_global_map`. This is intentional; current flows access them through trusted server/database paths rather than direct client reads.

Several authenticated `SECURITY DEFINER` RPCs remain callable because they are the intended application API for guarded With lifecycle actions. Their function bodies perform authentication/authorization checks. They should not be converted mechanically merely to make an advisor warning disappear.

Leaked-password protection remains an account-level Supabase Auth setting to review separately; it is not a schema migration.
