import assert from "node:assert/strict";
import test from "node:test";
import { dailyWords } from "../data/words.ts";
import { allowedHeartbeatSeconds, evaluateChoice } from "../lib/learning-integrity.ts";

const borrow = dailyWords.find((item) => item.id === "borrow");

test("derives choice correctness and score from server curriculum data", () => {
  assert.deepEqual(evaluateChoice({ word: borrow, skill: "see", locale: "ko", answer: "빌리다" }), {
    correct: true,
    score: 92,
  });
  assert.deepEqual(evaluateChoice({ word: borrow, skill: "hear", locale: "en", answer: "bring" }), {
    correct: false,
    score: 42,
  });
  assert.deepEqual(evaluateChoice({ word: borrow, skill: "context", locale: "en", answer: " BORROW " }), {
    correct: true,
    score: 92,
  });
});

test("never credits heartbeat time faster than server elapsed time", () => {
  const now = new Date("2026-07-18T00:00:30.000Z");
  assert.equal(allowedHeartbeatSeconds({ requestedSeconds: 60, lastHeartbeatAt: null, now }), 30);
  assert.equal(allowedHeartbeatSeconds({ requestedSeconds: 30, lastHeartbeatAt: now.toISOString(), now }), 0);
  assert.equal(allowedHeartbeatSeconds({
    requestedSeconds: 30,
    lastHeartbeatAt: "2026-07-18T00:00:18.000Z",
    now,
  }), 12);
});
