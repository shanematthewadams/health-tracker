import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("personal data detaches from a deleted With instead of cascading", async () => {
  const migration = await readSource("supabase/migrations/20260912200521_detach_person_data_from_with_deletes.sql");
  const personalTables = [
    "profiles",
    "weight_entries",
    "food_entries",
    "activity_entries",
    "step_entries",
    "water_entries",
    "fasting_entries",
  ];

  for (const table of personalTables) {
    assert.match(migration, new RegExp(`alter table public\\.${table}[\\s\\S]*?on delete set null`, "i"));
  }
});

test("personal-health RLS is based on profile ownership and shared relationships", async () => {
  const migration = await readSource("supabase/migrations/20260912200507_harden_person_owned_rls.sql");

  assert.match(migration, /private\.owns_profile/);
  assert.match(migration, /private\.can_view_profile_metric/);
  assert.match(migration, /private\.is_with_member/);
  assert.doesNotMatch(migration, /create policy .* v2/i);
});

test("account deletion handles every With membership and deletes health by profile ownership", async () => {
  const source = await readSource("supabase/functions/delete-account/index.ts");

  assert.match(source, /const \{ data: memberships/);
  assert.match(source, /for \(const membership of priorMemberships\)/);
  assert.match(source, /\.in\("profile_id", profileIds\)/);
  assert.doesNotMatch(source, /\.eq\("user_id", userId\)\s*\.maybeSingle\(\)/);
});

test("critical daily totals stay unique per person and date", async () => {
  const tracker = await readSource("src/Tracker.jsx");

  assert.match(tracker, /onConflict:\s*"profile_id,entry_date"/);
  assert.match(tracker, /profile_id:\s*p\.id/);
});
