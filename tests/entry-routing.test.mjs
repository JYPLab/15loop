import assert from "node:assert/strict";
import test from "node:test";
import { entryDestination } from "../lib/entry-routing.ts";

const childLearnerId = "child-123e4567-e89b-12d3-a456-426614174000";

test("sends guests to the no-signup diagnostic instead of the learning demo", () => {
  assert.equal(entryDestination({ authenticated: false, learnerId: "learner-local", hasChallenge: false }), "diagnosis");
});

test("sends a signed-in parent without a selected child to the parent dashboard", () => {
  assert.equal(entryDestination({ authenticated: true, learnerId: "learner-local", hasChallenge: false }), "parent");
});

test("sends an expired child link to parent sign-in instead of the public diagnostic", () => {
  assert.equal(entryDestination({ authenticated: false, learnerId: childLearnerId, hasChallenge: false }), "parent");
});

test("opens learning only for an authenticated selected child", () => {
  assert.equal(entryDestination({ authenticated: true, learnerId: childLearnerId, hasChallenge: false }), "learn");
});

test("preserves guest challenge links without exposing the default learning demo", () => {
  assert.equal(entryDestination({ authenticated: false, learnerId: "learner-local", hasChallenge: true }), "learn");
});
