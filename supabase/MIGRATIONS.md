# With Supabase migration baseline

`supabase/migrations/` is the authoritative migration history for With going forward.

## Shared database

Staging and production intentionally use the same Supabase project. Database changes therefore must remain backward-compatible with the production frontend until staging is promoted.

Do not create a separate Supabase staging project unless the product owner explicitly changes this decision.

## Historical SQL files

Several older `supabase-*.sql` files remain at the repository root. They document work that was applied before a formal migration history existed. Treat them as historical reference only.

**Do not replay, rename, or automatically move those files into `supabase/migrations/`.** Doing so could re-run already-applied schema changes or make the migration ledger inaccurate.

## Baseline established September 2026

The first authoritative tracked migrations cover the Multiple Withs transition. Some of the first committed filenames differ slightly from the versions recorded in Supabase because the changes were applied before their files were committed. The database ledger is the source of truth for what has already run.

Recorded database versions at the V2 Phase 1 baseline:

- `20260909140250_prepare_multiple_withs_foundation`
- `20260909145544_add_multiple_withs_v2_rpcs`
- `20260909145606_lock_down_multiple_withs_helpers`
- `20260909151348_add_relationship_based_health_policies`
- `20260910000828_add_remove_with_member_rpc`
- `20260910001424_add_leave_with_rpc`
- `20260910002233_add_transfer_with_ownership_rpc`
- `20260910002800_add_delete_with_rpc`
- `20260912200507_harden_person_owned_rls`
- `20260912200521_detach_person_data_from_with_deletes`

The repository contains the corresponding SQL for the Phase 1 migrations using their exact applied versions.

## Rules for future database changes

1. Audit the current schema and migration ledger first.
2. Prefer additive/backward-compatible changes while staging and production share the database.
3. Create a new migration for every schema/RLS/function change.
4. Never edit or replay an already-applied migration to change production state.
5. Treat RLS, destructive DDL, ownership changes, and cascade behavior as high risk.
6. Run Supabase security and performance advisors after DDL changes.
7. Test the current production frontend contract as well as staging behavior before promotion.

## Edge Functions

`supabase/functions/` is the canonical source for deployed Supabase Edge Functions.

The older top-level `functions/` directory and `DELETE-ACCOUNT-EDGE-FUNCTION.txt` are legacy copies retained only for historical reference. Do not deploy from those copies. New changes belong under `supabase/functions/` first, then should be deployed from the same source.
