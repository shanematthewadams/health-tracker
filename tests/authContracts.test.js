import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("password recovery bypasses invitation and onboarding gates", async () => {
  const [invitationGate, onboardingGate, tracker] = await Promise.all([
    readSource("src/InvitationGate.jsx"),
    readSource("src/OnboardingGate.jsx"),
    readSource("src/Tracker.jsx"),
  ]);

  assert.match(invitationGate, /PASSWORD_RECOVERY/);
  assert.match(invitationGate, /with-password-recovery/);
  assert.match(invitationGate, /sessionStorage\.getItem\("with-password-recovery"\)/);

  assert.match(onboardingGate, /PASSWORD_RECOVERY/);
  assert.match(onboardingGate, /with-password-recovery/);

  assert.match(tracker, /PASSWORD_RECOVERY/);
  assert.match(tracker, /ResetPasswordScreen/);
});

test("current invitation acceptance uses the Multiple Withs RPC", async () => {
  const invitationGate = await readSource("src/InvitationGate.jsx");
  assert.match(invitationGate, /accept_with_invitation_v2/);
  assert.match(invitationGate, /existingProfile/);
});


test("auth, recovery, onboarding, and invitation text fields have accessible names", async () => {
  const [tracker, onboarding, invitation] = await Promise.all([
    readSource("src/Tracker.jsx"),
    readSource("src/OnboardingGate.jsx"),
    readSource("src/InvitationGate.jsx"),
  ]);

  assert.match(tracker, /type="email" aria-label="Email"/);
  assert.match(tracker, /type="password" aria-label="Password"/);
  assert.match(tracker, /type="password" aria-label="New password"/);
  assert.match(tracker, /type="password" aria-label="Confirm password"/);
  assert.match(onboarding, /aria-label="With name"/);
  assert.match(onboarding, /aria-label="Your name"/);
  assert.match(invitation, /aria-label="Your name"/);
});
