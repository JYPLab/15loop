export type SkillKey = "see" | "hear" | "context" | "recall";

export type SkillScores = Record<SkillKey, number>;

export type AdaptiveQueueReason = "overdue" | "due-soon" | "new" | "future" | "retry";

export type AdaptiveQueueItem = {
  wordId: string;
  focusSkill: SkillKey;
  reason: AdaptiveQueueReason;
  mastery: number | null;
  dueAt: string | null;
};

export type WordReviewSnapshot = {
  wordId: string;
  mastery: number;
  dueAt: string;
};

export type ReviewCycleState = {
  mastery: number;
  intervalHours: number;
  dueAt: string;
  cycleSkillMask: number;
  cycleHadError: boolean;
  completedOn: string | null;
};

const skillOrder: SkillKey[] = ["see", "hear", "context", "recall"];
const skillBits: Record<SkillKey, number> = { see: 1, hear: 2, context: 4, recall: 8 };
const completeSkillMask = 15;
const dueSoonWindowMs = 24 * 60 * 60 * 1000;

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function seededRank(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function parsedDueAt(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function weakestSkill(scores: SkillScores): SkillKey {
  return skillOrder.reduce((weakest, skill) => (
    scores[skill] < scores[weakest] ? skill : weakest
  ), skillOrder[0]);
}

export function prioritizedSkillOrder(focusSkill: SkillKey) {
  return [focusSkill, ...skillOrder.filter((skill) => skill !== focusSkill)];
}

export function buildAdaptiveQueue(input: {
  learnerId: string;
  dateKey: string;
  now: Date;
  wordIds: string[];
  progress: WordReviewSnapshot[];
  scores: SkillScores;
}): AdaptiveQueueItem[] {
  const curriculumIds = new Set(input.wordIds);
  const progressByWord = new Map(
    input.progress
      .filter((item) => curriculumIds.has(item.wordId))
      .map((item) => [item.wordId, item]),
  );
  const focusSkill = weakestSkill(input.scores);
  const nowMs = input.now.getTime();

  return input.wordIds.map((wordId) => {
    const review = progressByWord.get(wordId);
    if (!review) {
      return {
        item: { wordId, focusSkill, reason: "new" as const, mastery: null, dueAt: null },
        tier: 2,
        dueTime: Number.POSITIVE_INFINITY,
        seeded: seededRank(`${input.learnerId}|${input.dateKey}|${wordId}`),
      };
    }

    const dueTime = parsedDueAt(review.dueAt);
    const reason = dueTime <= nowMs
      ? "overdue" as const
      : dueTime <= nowMs + dueSoonWindowMs
        ? "due-soon" as const
        : "future" as const;
    const tier = reason === "overdue" ? 0 : reason === "due-soon" ? 1 : 3;
    return {
      item: {
        wordId,
        focusSkill,
        reason,
        mastery: clamp(review.mastery),
        dueAt: Number.isFinite(Date.parse(review.dueAt)) ? review.dueAt : null,
      },
      tier,
      dueTime,
      seeded: seededRank(`${input.learnerId}|${input.dateKey}|${wordId}`),
    };
  }).sort((left, right) => (
    left.tier - right.tier
    || left.dueTime - right.dueTime
    || (left.item.mastery ?? 100) - (right.item.mastery ?? 100)
    || left.seeded - right.seeded
  )).map(({ item }) => item);
}

export function insertBoundedRetry(
  queue: AdaptiveQueueItem[],
  currentIndex: number,
  retryCount: number,
  maxRetries = 2,
) {
  const current = queue[currentIndex];
  if (!current || retryCount >= maxRetries) return { queue, inserted: false };
  if (queue.slice(currentIndex + 1).some((item) => item.wordId === current.wordId)) {
    return { queue, inserted: false };
  }

  const intervening = new Set<string>();
  let insertAt = -1;
  for (let index = currentIndex + 1; index < queue.length; index += 1) {
    if (queue[index].wordId !== current.wordId) intervening.add(queue[index].wordId);
    if (intervening.size >= 3) {
      insertAt = index + 1;
      break;
    }
  }
  if (insertAt < 0) return { queue, inserted: false };

  const next = [...queue];
  next.splice(insertAt, 0, { ...current, reason: "retry" });
  return { queue: next, inserted: true };
}

export function applyEvaluationToReviewState(input: {
  existing?: ReviewCycleState | null;
  skill: SkillKey;
  correct: boolean;
  score: number;
  now: Date;
  today: string;
}) {
  const previous = input.existing ?? {
    mastery: 40,
    intervalHours: 6,
    dueAt: new Date(input.now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
    cycleSkillMask: 0,
    cycleHadError: false,
    completedOn: null,
  };
  const nextMask = previous.cycleSkillMask | skillBits[input.skill];
  const nextHadError = previous.cycleHadError || !input.correct;
  const cycleComplete = input.correct && nextMask === completeSkillMask;

  if (cycleComplete) {
    const mastery = clamp(previous.mastery + (
      nextHadError ? -10 : Math.max(4, Math.round(clamp(input.score) / 15))
    ));
    const intervalHours = nextHadError
      ? 1
      : mastery >= 85 ? 168 : mastery >= 70 ? 72 : mastery >= 55 ? 24 : 6;
    return {
      mastery,
      intervalHours,
      dueAt: new Date(input.now.getTime() + intervalHours * 60 * 60 * 1000).toISOString(),
      cycleSkillMask: 0,
      cycleHadError: false,
      completedOn: input.today,
      cycleComplete: true,
      firstCompletionToday: previous.completedOn !== input.today,
    };
  }

  const intervalHours = input.correct ? previous.intervalHours : 1;
  return {
    mastery: previous.mastery,
    intervalHours,
    dueAt: input.correct
      ? previous.dueAt
      : new Date(input.now.getTime() + 60 * 60 * 1000).toISOString(),
    cycleSkillMask: nextMask,
    cycleHadError: nextHadError,
    completedOn: previous.completedOn,
    cycleComplete: false,
    firstCompletionToday: false,
  };
}
