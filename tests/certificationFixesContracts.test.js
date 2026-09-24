import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Daily Reflection is quiet on Today outside the active evening prompt", async () => {
  const source = await readSource("src/components/DailyReflection.jsx");
  assert.match(source, /const showPrompt = enabled && existing === null && isEvening/);
  assert.match(source, /if \(!profileId \|\| existing === undefined \|\| !showPrompt\) return null/);
  assert.match(source, /Past reflections/);
  assert.match(source, /View past reflections/);
});

test("Sign out is persistent across Profile sections instead of living inside Account", async () => {
  const source = await readSource("src/tabs/ProfileTab.jsx");
  const accountStart = source.indexOf('{section === "account"');
  const persistentSignOut = source.lastIndexOf("Sign out");
  const firstModal = source.indexOf('{modal === "invite"');
  const persistentBlock = source.indexOf('<LogOut', accountStart);
  assert.ok(accountStart >= 0);
  assert.ok(persistentSignOut > accountStart);
  assert.ok(persistentSignOut < firstModal);
  assert.ok(persistentBlock > source.indexOf("</section>", accountStart));
});

test("With logo uses the approved app teal", async () => {
  const source = await readSource("src/brand.jsx");
  assert.match(source, /teal: "#1F5E57"/);
  assert.match(source, /logoPrimary: "#1F5E57"/);
});

test("admin navigation waits for server-backed admin authorization", async () => {
  const source = await readSource("src/AdminApp.jsx");
  assert.match(source, /supabase\.rpc\("is_app_admin"\)/);
  assert.match(source, /const \[adminAuthorized, setAdminAuthorized\] = useState\(false\)/);
  assert.match(source, /\{adminAuthorized && \([\s\S]*<nav aria-label="Admin sections"/);
  assert.match(source, /adminAuthorized && view === "quotes"/);
  assert.match(source, /<ReflectionQuotesAdmin \/>/);
  assert.match(source, /adminAuthorized && view === "emails"/);
  assert.match(source, /<EmailAdmin \/>/);
  assert.match(source, /<LegacyAdminApp \/>/);
});

test("password recovery has a stable return marker and cannot leave stale recovery state behind", async () => {
  const [supabaseSource, mainSource, cssSource] = await Promise.all([
    readSource("src/supabase.js"),
    readSource("src/main.jsx"),
    readSource("src/global.css"),
  ]);

  assert.match(supabaseSource, /RECOVERY_QUERY_PARAM = "password-recovery"/);
  assert.match(supabaseSource, /resetPasswordForEmail[\s\S]*redirectUrl\.searchParams\.set\(RECOVERY_QUERY_PARAM, "1"\)/);
  assert.match(supabaseSource, /hasRecoveryFlag && !recoveryReturnIsPresent\(\)/);
  assert.match(supabaseSource, /RECOVERY_MAX_AGE_MS/);
  assert.match(supabaseSource, /recoveryReturnIsPresent\(\) && !options\?\.scope[\s\S]*scope: "local"/);
  assert.match(supabaseSource, /event === "SIGNED_OUT"[\s\S]*clearRecoveryState\(\)[\s\S]*clearRecoveryMarkerFromUrl\(\)/);
  assert.match(mainSource, /import '\.\/global\.css'/);
  assert.match(cssSource, /box-sizing: border-box/);
});

test("nutrition calculator shows one missing-goal-date instruction and prevents the duplicate error path", async () => {
  const source = await readSource("src/components/NutritionTargetCalculator.jsx");
  assert.match(source, /const needsGoalDate =/);
  assert.match(source, /const canCalculate = hasGoalWeight && !needsGoalDate/);
  assert.match(source, /\{needsGoalDate && <div[\s\S]*Add a goal date above so With can calculate the pace required\./);
  assert.match(source, /disabled=\{!canCalculate\}/);
  assert.match(source, /opacity: canCalculate \? 1 : \.55/);
});


test("major screen changes return to the top without tying scroll resets to modal state", async () => {
  const [tracker, profile] = await Promise.all([
    readSource("src/Tracker.jsx"),
    readSource("src/tabs/ProfileTab.jsx"),
  ]);

  assert.match(tracker, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\);\s*\}, \[tab\]\)/);
  assert.match(tracker, /async function selectWith[\s\S]*window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  assert.match(profile, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\);\s*\}, \[section\]\)/);
  assert.doesNotMatch(profile, /\[modal\][\s\S]{0,120}scrollTo/);
});
