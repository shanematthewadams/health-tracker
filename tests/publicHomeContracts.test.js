import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const readSource = (path) => readFile(new URL(\`../\${path}\`, import.meta.url), "utf8");

test("public homepage stays wired into the existing auth flow", async () => {
  const tracker = await readSource("src/Tracker.jsx");

  assert.match(tracker, /import PolishedPublicHome from "\.\/PublicHome\.jsx"/);
  assert.match(tracker, /const \[mode, setMode\] = useState\(hasInvite \? "signup" : "welcome"\)/);
  assert.match(tracker, /if \(mode === "welcome"\)/);
  assert.match(tracker, /<PolishedPublicHome onGetStarted=\{\(\) => changeMode\("signup"\)\} onSignIn=\{\(\) => changeMode\("signin"\)\}/);
});

test("public homepage makes solo use and private ownership explicit", async () => {
  const homepage = await readSource("src/PublicHome.jsx");

  assert.match(homepage, /Start with yourself/);
  assert.match(homepage, /No invitation is required/);
  assert.match(homepage, /Private by default/);
  assert.match(homepage, /Each person keeps their own goals and health information/);
  assert.match(homepage, /I already use With/);
});

test("public homepage serves screenshots as standalone webp assets", async () => {
  const homepage = await readSource("src/PublicHome.jsx");
  const assets = ["today.webp", "trends.webp", "goals.webp"];

  assert.doesNotMatch(homepage, /assets\/home\/.*Screen\.js/);
  assert.match(homepage, /loading="eager"/);
  assert.match(homepage, /loading="lazy"/);
  assert.match(homepage, /fetchPriority="high"/);

  for (const asset of assets) {
    const info = await stat(new URL(\`../public/home/\${asset}\`, import.meta.url));
    assert.ok(info.size > 0, \`\${asset} should not be empty\`);
    assert.ok(info.size < 100_000, \`\${asset} should remain lightweight\`);
  }
});
