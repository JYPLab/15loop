import assert from "node:assert/strict";
import test from "node:test";
import {
  applyEvaluationToReviewState,
  buildAdaptiveQueue,
  insertBoundedRetry,
  prioritizedSkillOrder,
} from "../lib/adaptive-queue.ts";

const scores = { see: 72, hear: 38, context: 64, recall: 55 };
const now = new Date("2026-07-17T00:00:00.000Z");
const wordIds = ["borrow", "choose", "decide", "explain", "invite", "practice"];

test("builds a deterministic unique queue for an unseen learner", () => {
  const input = { learnerId: "learner-a", dateKey: "2026-07-17", now, wordIds, progress: [], scores };
  const first = buildAdaptiveQueue(input);
  const second = buildAdaptiveQueue(input);

  assert.deepEqual(first, second);
  assert.equal(new Set(first.map((item) => item.wordId)).size, wordIds.length);
  assert.equal(first.every((item) => item.reason === "new"), true);
  assert.equal(first.every((item) => item.focusSkill === "hear"), true);
});

test("prioritizes overdue, due-soon, unseen, then future reviews", () => {
  const queue = buildAdaptiveQueue({
    learnerId: "learner-a",
    dateKey: "2026-07-17",
    now,
    wordIds: ["overdue", "boundary", "new", "future", "invalid"],
    progress: [
      { wordId: "overdue", mastery: 80, dueAt: "2026-07-16T23:59:59.000Z" },
      { wordId: "boundary", mastery: 60, dueAt: "2026-07-18T00:00:00.000Z" },
      { wordId: "future", mastery: 30, dueAt: "2026-07-19T00:00:00.000Z" },
      { wordId: "invalid", mastery: 20, dueAt: "not-a-date" },
      { wordId: "outside-curriculum", mastery: 0, dueAt: "2020-01-01T00:00:00.000Z" },
    ],
    scores,
  });

  assert.deepEqual(queue.map((item) => item.reason), ["overdue", "overdue", "due-soon", "new", "future"]);
  assert.equal(queue[0].wordId, "invalid");
  assert.equal(queue[2].wordId, "boundary");
  assert.equal(queue.some((item) => item.wordId === "outside-curriculum"), false);
});

test("starts with the weakest skill and still includes all four skills once", () => {
  assert.deepEqual(prioritizedSkillOrder("context"), ["context", "see", "hear", "recall"]);
  assert.deepEqual(prioritizedSkillOrder("recall"), ["recall", "see", "hear", "context"]);
});

test("inserts one bounded retry after three distinct words", () => {
  const baseQueue = wordIds.map((wordId) => ({
    wordId,
    focusSkill: "hear",
    reason: "new",
    mastery: null,
    dueAt: null,
  }));
  const first = insertBoundedRetry(baseQueue, 0, 0);
  assert.equal(first.inserted, true);
  assert.equal(first.queue[4].wordId, "borrow");
  assert.equal(first.queue[4].reason, "retry");
  assert.equal(insertBoundedRetry(first.queue, 0, 1).inserted, false);
  assert.equal(insertBoundedRetry(baseQueue, 0, 2).inserted, false);
  assert.equal(insertBoundedRetry(baseQueue, baseQueue.length - 2, 0).inserted, false);
});

test("preserves any lapse across a four-skill cycle and counts completion once", () => {
  const base = { now, today: "2026-07-17", score: 90 };
  let state = applyEvaluationToReviewState({ ...base, skill: "recall", correct: true });
  state = applyEvaluationToReviewState({ ...base, existing: state, skill: "see", correct: false });
  state = applyEvaluationToReviewState({ ...base, existing: state, skill: "see", correct: true });
  state = applyEvaluationToReviewState({ ...base, existing: state, skill: "hear", correct: true });
  state = applyEvaluationToReviewState({ ...base, existing: state, skill: "context", correct: true });

  assert.equal(state.cycleComplete, true);
  assert.equal(state.firstCompletionToday, true);
  assert.equal(state.intervalHours, 1);
  assert.equal(state.mastery, 30);
  assert.equal(state.cycleSkillMask, 0);

  for (const skill of ["hear", "see", "context", "recall"]) {
    state = applyEvaluationToReviewState({ ...base, existing: state, skill, correct: true });
  }
  assert.equal(state.cycleComplete, true);
  assert.equal(state.firstCompletionToday, false);
  assert.equal(state.intervalHours, 6);
  assert.equal(state.mastery, 36);
});
