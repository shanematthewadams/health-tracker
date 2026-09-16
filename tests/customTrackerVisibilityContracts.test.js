import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const customToday = readFileSync("src/components/CustomTodayLoggedSection.jsx", "utf8");

test("disabled custom trackers stay out of Today while their history remains stored", () => {
  assert.match(customToday, /select\("id,profile_id,name,value_type,unit,enabled,/i);
  assert.match(customToday, /if \(!metric\.enabled\) return false/i);
  assert.doesNotMatch(customToday, /from\("custom_metric_entries"\)\.delete/i);
});
