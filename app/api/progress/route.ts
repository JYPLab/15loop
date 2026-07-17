import { and, asc, eq, isNull } from "drizzle-orm";
import { dailyWords } from "../../../data/words";
import { applyEvaluationToReviewState, buildAdaptiveQueue } from "../../../lib/adaptive-queue";
import { getOptionalParent } from "../../../lib/auth";
import { recordBetaEvent } from "../../../lib/beta-ops";
import { guardianHasAccess, guardianHasConsent } from "../../../lib/commercial";
import { allowedHeartbeatSeconds, evaluateChoice } from "../../../lib/learning-integrity";

type Db = ReturnType<typeof import("../../../db").getDb>;
type Schema = typeof import("../../../db/schema");

type ProfileRow = {
  id: string;
  displayName: string;
  locale: string;
  streak: number;
  completedToday: number;
  studySecondsToday: number;
  dailySessionCompleted: boolean;
  lastHeartbeatAt: string | null;
  lastStudyDate: string;
  seeScore: number;
  hearScore: number;
  contextScore: number;
  recallScore: number;
  createdAt: string;
  updatedAt: string;
};

type SkillKey = "see" | "hear" | "context" | "recall";

type ProgressRequest = {
  action?: "heartbeat";
  learnerId?: string;
  wordId?: string;
  skill?: SkillKey;
  answer?: string;
  evaluationReceiptId?: string;
  locale?: "ko" | "en";
  studySeconds?: number;
};

type LearnerResolution = {
  learnerId: string;
  guardianId?: string;
  status: "ok" | "invalid" | "auth" | "consent" | "expired";
};

async function resolveLearnerId(request: Request, fallbackLearnerId: string): Promise<LearnerResolution> {
  if (/^learner-[0-9a-f-]{36}$/i.test(fallbackLearnerId)) return { learnerId: fallbackLearnerId, status: "ok" };
  if (!/^child-[0-9a-f-]{36}$/i.test(fallbackLearnerId)) return { learnerId: "", status: "invalid" };
  const parent = await getOptionalParent(request);
  if (!parent) return { learnerId: "", status: "auth" };
  const { db, schema } = await getStorage();
  const [ownership] = await db.select().from(schema.guardianLearners).where(and(
    eq(schema.guardianLearners.guardianId, parent.id),
    eq(schema.guardianLearners.learnerId, fallbackLearnerId),
  )).limit(1);
  if (!ownership) return { learnerId: "", status: "auth" };
  const [account] = await db.select().from(schema.guardianAccounts)
    .where(eq(schema.guardianAccounts.id, parent.id)).limit(1);
  if (!account || !guardianHasAccess(account)) return { learnerId: "", status: "expired" };
  if (!guardianHasConsent(account)) return { learnerId: "", status: "consent" };
  return { learnerId: fallbackLearnerId, guardianId: parent.id, status: "ok" };
}

function learnerResolutionError(resolution: LearnerResolution) {
  if (resolution.status === "expired") {
    return Response.json({ error: "무료 체험 또는 이용권이 만료되었습니다." }, { status: 402 });
  }
  if (resolution.status === "auth") {
    return Response.json({ error: "이 학습자에 접근할 권한이 없습니다." }, { status: 401 });
  }
  if (resolution.status === "consent") {
    return Response.json({ error: "부모 계정에서 보호자 동의가 필요합니다." }, { status: 403 });
  }
  return Response.json({ error: "valid learnerId is required" }, { status: 400 });
}

function todayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function yesterdayOf(date: string) {
  const value = new Date(`${date}T00:00:00+09:00`);
  value.setDate(value.getDate() - 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(value);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function profilePayload(profile: ProfileRow, nextDueAt?: string | null) {
  const currentDay = profile.lastStudyDate === todayInSeoul();
  return {
    streak: profile.streak,
    completedToday: currentDay ? profile.completedToday : 0,
    studySecondsToday: currentDay ? profile.studySecondsToday : 0,
    dailySessionCompleted: currentDay ? profile.dailySessionCompleted : false,
    scores: {
      see: profile.seeScore,
      hear: profile.hearScore,
      context: profile.contextScore,
      recall: profile.recallScore,
    },
    nextDueAt: nextDueAt ?? null,
  };
}

async function getStorage() {
  const [{ getDb }, schema] = await Promise.all([
    import("../../../db"),
    import("../../../db/schema"),
  ]);
  return { db: getDb(), schema };
}

async function ensureProfile(
  db: Db,
  schema: Schema,
  learnerId: string,
  locale: "ko" | "en" = "ko",
  activate = false,
) {
  const { learnerProfiles } = schema;
  const today = todayInSeoul();
  await db.insert(learnerProfiles).values({
    id: learnerId,
    locale,
    lastStudyDate: activate ? today : "",
  }).onConflictDoNothing();

  let [profile] = await db.select().from(learnerProfiles).where(eq(learnerProfiles.id, learnerId)).limit(1);

  if (activate && profile.lastStudyDate !== today) {
    const continued = Boolean(profile.lastStudyDate) && profile.lastStudyDate === yesterdayOf(today);
    const [updated] = await db.update(learnerProfiles).set({
      completedToday: 0,
      studySecondsToday: 0,
      dailySessionCompleted: false,
      streak: continued ? profile.streak + 1 : 1,
      lastStudyDate: today,
      lastHeartbeatAt: null,
      locale,
      updatedAt: new Date().toISOString(),
    }).where(eq(learnerProfiles.id, learnerId)).returning();
    profile = updated;
  }

  return profile;
}

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Progress storage is unavailable";
  const missingSchema = message.includes("no such table") || message.includes("D1 binding");
  return Response.json(
    { error: missingSchema ? "Learning storage is not initialized yet" : "Unable to save progress" },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const fallbackLearnerId = new URL(request.url).searchParams.get("learnerId")?.trim() ?? "";
  const resolution = await resolveLearnerId(request, fallbackLearnerId);
  if (resolution.status !== "ok" || resolution.learnerId.length > 180) return learnerResolutionError(resolution);
  const learnerId = resolution.learnerId;

  try {
    const { db, schema } = await getStorage();
    const { wordProgress } = schema;
    const profile = await ensureProfile(db, schema, learnerId);
    const progress = await db.select({
      wordId: wordProgress.wordId,
      mastery: wordProgress.mastery,
      dueAt: wordProgress.dueAt,
    })
      .from(wordProgress)
      .where(eq(wordProgress.learnerId, learnerId));
    const nextDueAt = progress
      .map((item) => item.dueAt)
      .filter((dueAt) => Number.isFinite(Date.parse(dueAt)))
      .sort((left, right) => Date.parse(left) - Date.parse(right))[0];
    const learningQueue = buildAdaptiveQueue({
      learnerId,
      dateKey: todayInSeoul(),
      now: new Date(),
      wordIds: dailyWords.map((item) => item.id),
      progress,
      scores: {
        see: profile.seeScore,
        hear: profile.hearScore,
        context: profile.contextScore,
        recall: profile.recallScore,
      },
    });

    return Response.json({ profile: profilePayload(profile, nextDueAt), learningQueue });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProgressRequest;
  const resolution = await resolveLearnerId(request, body.learnerId?.trim() ?? "");
  if (resolution.status !== "ok" || resolution.learnerId.length > 180) return learnerResolutionError(resolution);
  const learnerId = resolution.learnerId;
  const wordId = body.wordId?.trim() ?? "";
  const skill = body.skill;
  const locale = body.locale === "en" ? "en" : "ko";
  if (body.action === "heartbeat") {
    const studySeconds = Number(body.studySeconds);
    if (!Number.isInteger(studySeconds) || studySeconds < 1 || studySeconds > 60) {
      return Response.json({ error: "invalid study heartbeat" }, { status: 400 });
    }
    try {
      const { db, schema } = await getStorage();
      const profile = await ensureProfile(db, schema, learnerId, locale, true);
      const now = new Date();
      const acceptedStudySeconds = allowedHeartbeatSeconds({
        requestedSeconds: studySeconds,
        lastHeartbeatAt: profile.lastHeartbeatAt,
        now,
      });
      if (acceptedStudySeconds < 1) {
        return Response.json({
          error: "study heartbeat arrived too quickly",
          acceptedStudySeconds: 0,
          profile: profilePayload(profile),
        }, { status: 429 });
      }
      const nextStudySeconds = Math.min(900, profile.studySecondsToday + acceptedStudySeconds);
      const [updatedProfile] = await db.update(schema.learnerProfiles).set({
        locale,
        studySecondsToday: nextStudySeconds,
        dailySessionCompleted: nextStudySeconds >= 900,
        lastHeartbeatAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }).where(eq(schema.learnerProfiles.id, learnerId)).returning();
      if (profile.studySecondsToday < 900 && nextStudySeconds >= 900 && resolution.guardianId) {
        await recordBetaEvent(db, schema, {
          eventName: "daily_session_completed",
          guardianId: resolution.guardianId,
          learnerId,
          metadata: { studySeconds: nextStudySeconds },
        });
      }
      return Response.json({ acceptedStudySeconds, profile: profilePayload(updatedProfile) });
    } catch (error) {
      return routeError(error);
    }
  }

  const curriculumWord = dailyWords.find((item) => item.id === wordId);
  if (
    !wordId || wordId.length > 80 || !curriculumWord
    || !skill || !["see", "hear", "context", "recall"].includes(skill)
  ) {
    return Response.json({ error: "invalid progress event" }, { status: 400 });
  }

  try {
    const { db, schema } = await getStorage();
    const { evaluationEvents, learnerProfiles, wordProgress } = schema;
    const profile = await ensureProfile(db, schema, learnerId, locale, true);
    const today = todayInSeoul();
    const now = new Date();
    const nowIso = now.toISOString();
    const progressId = `${learnerId}:${wordId}`;
    const [existing] = await db.select().from(wordProgress)
      .where(and(eq(wordProgress.learnerId, learnerId), eq(wordProgress.wordId, wordId)))
      .limit(1);

    let correct: boolean;
    let verifiedScore: number;
    let evaluationReceiptId: string | null = null;
    if (skill === "recall") {
      evaluationReceiptId = String(body.evaluationReceiptId || "").trim();
      if (!/^eval-[0-9a-f-]{36}$/i.test(evaluationReceiptId)) {
        return Response.json({ error: "a valid recall evaluation receipt is required" }, { status: 400 });
      }
      const [receipt] = await db.select().from(schema.evaluationReceipts).where(and(
        eq(schema.evaluationReceipts.id, evaluationReceiptId),
        eq(schema.evaluationReceipts.learnerId, learnerId),
        eq(schema.evaluationReceipts.wordId, wordId),
        isNull(schema.evaluationReceipts.consumedAt),
      )).limit(1);
      if (!receipt || Date.parse(receipt.expiresAt) <= now.getTime()) {
        return Response.json({ error: "recall evaluation receipt is invalid or expired" }, { status: 409 });
      }
      correct = receipt.correct;
      verifiedScore = clamp(receipt.score);
    } else {
      const answer = String(body.answer || "");
      if (!answer || answer.length > 300) {
        return Response.json({ error: "a valid answer is required" }, { status: 400 });
      }
      const verified = evaluateChoice({ word: curriculumWord, skill, locale, answer });
      correct = verified.correct;
      verifiedScore = verified.score;
    }
    const review = applyEvaluationToReviewState({ existing, skill, correct, score: verifiedScore, now, today });

    const currentScores = {
      see: profile.seeScore,
      hear: profile.hearScore,
      context: profile.contextScore,
      recall: profile.recallScore,
    };
    currentScores[skill] = clamp(currentScores[skill] * 0.78 + verifiedScore * 0.22, 20, 98);

    const statements = [
      db.insert(evaluationEvents).values({
        learnerId,
        wordId,
        skill,
        correct,
        score: verifiedScore,
        evaluationReceiptId,
      }),
      db.insert(wordProgress).values({
        id: progressId,
        learnerId,
        wordId,
        mastery: review.mastery,
        intervalHours: review.intervalHours,
        dueAt: review.dueAt,
        lastResult: correct,
        cycleSkillMask: review.cycleSkillMask,
        cycleHadError: review.cycleHadError,
        completedOn: review.completedOn,
        lastStudiedAt: nowIso,
      }).onConflictDoUpdate({
        target: wordProgress.id,
        set: {
          mastery: review.mastery,
          intervalHours: review.intervalHours,
          dueAt: review.dueAt,
          lastResult: correct,
          cycleSkillMask: review.cycleSkillMask,
          cycleHadError: review.cycleHadError,
          completedOn: review.completedOn,
          lastStudiedAt: nowIso,
        },
      }),
      db.update(learnerProfiles).set({
        locale,
        completedToday: clamp(profile.completedToday + (review.firstCompletionToday ? 1 : 0), 0, 30),
        seeScore: currentScores.see,
        hearScore: currentScores.hear,
        contextScore: currentScores.context,
        recallScore: currentScores.recall,
        updatedAt: new Date().toISOString(),
      }).where(eq(learnerProfiles.id, learnerId)),
    ];
    if (evaluationReceiptId) {
      statements.push(db.update(schema.evaluationReceipts).set({ consumedAt: nowIso }).where(and(
        eq(schema.evaluationReceipts.id, evaluationReceiptId),
        isNull(schema.evaluationReceipts.consumedAt),
      )));
    }
    await db.batch(statements);

    const [updatedProfile] = await db.select().from(learnerProfiles).where(eq(learnerProfiles.id, learnerId)).limit(1);
    const [nextWord] = await db.select({ dueAt: wordProgress.dueAt })
      .from(wordProgress)
      .where(eq(wordProgress.learnerId, learnerId))
      .orderBy(asc(wordProgress.dueAt))
      .limit(1);

    return Response.json({ profile: profilePayload(updatedProfile, nextWord?.dueAt) });
  } catch (error) {
    return routeError(error);
  }
}
