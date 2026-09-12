import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeWithMemberships,
  chooseActiveWithId,
} from "../src/withMemberships.js";

test("normalizes multiple With memberships by stable IDs", () => {
  const memberships = [
    { household_id: "with-b", role: "member" },
    { household_id: "with-a", role: "owner" },
  ];
  const households = [
    { id: "with-a", name: "Family", invite_code: "AAAA" },
    { id: "with-b", name: "Friends", invite_code: "BBBB" },
  ];

  assert.deepEqual(normalizeWithMemberships(memberships, households), [
    { id: "with-a", name: "Family", inviteCode: "AAAA", role: "owner" },
    { id: "with-b", name: "Friends", inviteCode: "BBBB", role: "member" },
  ]);
});

test("preserves the preferred active With when membership still exists", () => {
  const withs = [
    { id: "with-a", name: "Family" },
    { id: "with-b", name: "Friends" },
  ];

  assert.equal(chooseActiveWithId(withs, "with-b"), "with-b");
});

test("falls back safely when a stored With ID is stale", () => {
  const withs = [
    { id: "with-a", name: "Family" },
    { id: "with-b", name: "Friends" },
  ];

  assert.equal(chooseActiveWithId(withs, "deleted-with"), "with-a");
  assert.equal(chooseActiveWithId([], "with-a"), null);
});
