import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const quickAdd = readFileSync("src/components/QuickAddSection.jsx", "utf8");
const fastingToday = readFileSync("src/components/FastingTodaySection.jsx", "utf8");
const logTab = readFileSync("src/tabs/LogTab.jsx", "utf8");
const migration = readFileSync("supabase/migrations/20260914224300_allow_fasting_quick_add.sql", "utf8");

test("inactive fasting is optional on Today", () => {
  assert.match(quickAdd, /id: "fasting", label: "Fasting"/);
  assert.match(quickAdd, /with-start-fast-requested/);
  assert.match(fastingToday, /window\.addEventListener\("with-start-fast-requested"/);
  assert.doesNotMatch(fastingToday, /Fasting today\?/);
  assert.doesNotMatch(fastingToday, /Not today/);
});

test("Log always provides fasting start access when the tracker is available", () => {
  assert.match(logTab, /trackerEnabled\("fasting"\)/);
  assert.match(logTab, /showStartAction/);
  assert.match(fastingToday, /Start one here whenever you want to track it\./);
});

test("active fast behavior remains explicit and quick add persistence accepts fasting", () => {
  assert.match(fastingToday, /<CurrentFastCard/);
  assert.match(migration, /'fasting'::text/);
  assert.match(migration, /profile_quick_add_items_standard_type_check/);
});
