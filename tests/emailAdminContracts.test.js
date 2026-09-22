import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin treats Quotes and Emails as sibling editorial surfaces", async () => {
  const admin = await readSource("src/AdminApp.jsx");
  assert.match(admin, /Editorial/);
  assert.match(admin, /\["quotes", "Quotes"\]/);
  assert.match(admin, /\["emails", "Emails"\]/);
  assert.match(admin, /<ReflectionQuotesAdmin \/>/);
  assert.match(admin, /<EmailAdmin \/>/);
});

test("transactional email content is fixed, admin-only, and copy-focused", async () => {
  const migration = await readSource("supabase/migrations/20260922223741_add_transactional_email_content.sql");
  assert.match(migration, /transactional_email_content/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /is_app_admin/);
  assert.match(migration, /confirm_signup/);
  assert.match(migration, /password_recovery/);
  assert.match(migration, /email_change/);
  assert.match(migration, /with_invitation/);
  assert.doesNotMatch(migration, /html_content|css|layout_json/i);
});

test("email editor exposes editorial fields but keeps system structure locked", async () => {
  const [admin, helpers] = await Promise.all([
    readSource("src/EmailAdmin.jsx"),
    readSource("src/emailTemplates.js"),
  ]);
  assert.match(helpers, /subject/);
  assert.match(helpers, /preheader/);
  assert.match(helpers, /headline/);
  assert.match(helpers, /body_copy/);
  assert.match(helpers, /cta_label/);
  assert.match(admin, /System controlled/);
  assert.match(admin, /action URL/);
  assert.match(admin, /variable escaping/);
  assert.match(admin, /Sync to Supabase Auth/);
});

test("Auth template sync is admin-gated and uses the Management API", async () => {
  const fn = await readSource("functions/manage-transactional-email/index.ts");
  assert.match(fn, /app_admins/);
  assert.match(fn, /SUPABASE_ACCESS_TOKEN/);
  assert.match(fn, /api\.supabase\.com\/v1\/projects/);
  assert.match(fn, /mailer_subjects_confirmation/);
  assert.match(fn, /mailer_templates_recovery_content/);
  assert.match(fn, /mailer_templates_email_change_content/);
  assert.doesNotMatch(fn, /console\.log/);
});

test("With invitations use stable With IDs and managed copy with safe fallback", async () => {
  const [tracker, fn] = await Promise.all([
    readSource("src/Tracker.jsx"),
    readSource("functions/send-with-invite/index.ts"),
  ]);
  assert.match(tracker, /body: \{ email, householdId \}/);
  assert.match(fn, /transactional_email_content/);
  assert.match(fn, /DEFAULT_INVITE_COPY/);
  assert.match(fn, /householdId/);
  assert.match(fn, /legacyInviteCode/);
  assert.match(fn, /escapeHtml/);
  assert.match(fn, /expires in/);
});
