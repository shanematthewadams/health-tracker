import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const brandLogo = readFileSync("src/brand.jsx", "utf8");

test("the compact in-app With logo returns through the existing Today navigation", () => {
  assert.match(brandLogo, /if \(!compact\) return logoMark\(false, style\)/i);
  assert.match(brandLogo, /aria-label="Go to Today"/i);
  assert.match(brandLogo, /button\.textContent\?\.trim\(\) === "Today"/i);
  assert.match(brandLogo, /todayButton\?\.click\(\)/i);
});
