import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminShell = readFileSync("src/AdminApp.jsx", "utf8");
const admin = readFileSync("src/AdminAppLegacy.jsx", "utf8");
const main = readFileSync("src/main.jsx", "utf8");
const migration = readFileSync("supabase/migrations/20260915125500_add_minimal_superadmin.sql", "utf8");

test("admin route is isolated from normal onboarding flow", () => {
  assert.match(main, /const isAdmin = pathname === "\/admin"/);
  assert.match(main, /isAdmin \? \([\s\S]*<AdminApp/);
  assert.match(adminShell, /<LegacyAdminApp \/>/);
});

test("admin authorization is server backed and account directory is gated", () => {
  assert.match(migration, /create table if not exists public\.app_admins/);
  assert.match(migration, /create or replace function public\.is_app_admin\(\)/);
  assert.match(migration, /create or replace function public\.admin_account_directory\(\)/);
  assert.match(migration, /if not public\.is_app_admin\(\) then/);
  assert.match(admin, /supabase\.rpc\("is_app_admin"\)/);
  assert.match(admin, /supabase\.rpc\("admin_account_directory"\)/);
});

test("global food maintenance is admin only while historical entries remain separate", () => {
  assert.match(migration, /admins can update global foods/);
  assert.match(migration, /using \(public\.is_app_admin\(\)\)/);
  assert.match(admin, /Edit Global Food/);
  assert.doesNotMatch(admin, /food_entries["')]/);
});

test("CSV import documents and enforces the agreed food contract", () => {
  assert.match(admin, /REQUIRED_IMPORT_FIELDS = \["name", "serving_description", "calories", "fat", "carbs", "protein"\]/);
  assert.match(admin, /OPTIONAL_IMPORT_FIELDS = \["fiber", "brand", "gtin_upc"\]/);
  assert.match(admin, /Sample CSV/);
  assert.match(admin, /guessMapping/);
  assert.match(admin, /Download rejected rows/);
  assert.match(admin, /source_type: "admin_import"/);
  assert.match(migration, /food_import_batches/);
});

test("admin support can send recovery without setting a user password", () => {
  assert.match(admin, /resetPasswordForEmail/);
  assert.doesNotMatch(admin, /updateUserById/);
  assert.doesNotMatch(admin, /password:/);
});
