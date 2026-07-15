import { and, asc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";

type Db = ReturnType<typeof import("../../../db").getDb>;
type Schema = typeof import("../../../db/schema");

type ProfileRow = {
  id: string;
  displayName: string;
  locale: string;
  streak: number;
  completedToday: number;
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
  learnerId?: string;
  wordId?: string;
  skill?: SkillKey;
  correct?: boolean;
  score?: number;
  locale?: "ko" | "en";
};

function accountLearnerId(email: string) {
  return `account:${email.trim().toLowerCase()}`;
}

async function resolveLearnerId(fallbackLearnerId: string) {
  const user = await getChatGPTUser();
  return user ? accountLearnerId(user.email) : fallbackLearnerId;
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
  return {
    streak: profile.streak,
    completedToday: profile.completedToday,
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

async function ensureProfile(db: Db, schema: Schema, learnerId: string, locale: "ko" | "en" = "ko") {
  const { learnerProfiles } = schema;
  const today = todayInSeoul();
  await db.insert(learnerProfiles).values({
    id: learnerId,
    locale,
    lastStudyDate: today,
  }).onConflictDoNothing();

  let [profile] = await db.select().from(learnerProfiles).where(eq(learnerProfiles.id, learnerId)).limit(1);

  if (profile.lastStudyDate !== today) {
    const continued = profile.lastStudyDate === yesterdayOf(today);
    const [updated] = await db.update(learnerProfiles).set({
      completedToday: 0,
      streak: continued ? profile.streak + 1 : 1,
      lastStudyDate: today,
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
  const learnerId = await resolveLearnerId(fallbackLearnerId);
  if (!learnerId || learnerId.length > 180) {
    return Response.json({ error: "valid learnerId is required" }, { status: 400 });
  }

  try {
    const { db, schema } = await getStorage();
    const { wordProgress } = schema;
    const profile = await ensureProfile(db, schema, learnerId);
    const [nextWord] = await db.select({ dueAt: wordProgress.dueAt })
      .from(wordProgress)
      .where(eq(wordProgress.learnerId, learnerId))
      .orderBy(asc(wordProgress.dueAt))
      .limit(1);

    return Response.json({ profile: profilePayload(profile, nextWord?.dueAt) });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProgressRequest;
  const learnerId = await resolveLearnerId(body.learnerId?.trim() ?? "");
  const wordId = body.wordId?.trim() ?? "";
  const skill = body.skill;
  const locale = body.locale === "en" ? "en" : "ko";
  const score = clamp(Number(body.score ?? 0));

  if (!learnerId || learnerId.length > 180 || !wordId || wordId.length > 80 || !skill || !["see", "hear", "context", "recall"].includes(skill)) {
    return Response.json({ error: "invalid progress event" }, { status: 400 });
  }

  try {
    const { db, schema } = await getStorage();
    const { evaluationEvents, learnerProfiles, wordProgress } = schema;
    const profile = await ensureProfile(db, schema, learnerId, locale);
    const today = todayInSeoul();
    const progressId = `${learnerId}:${wordId}`;
    const [existing] = await db.select().from(wordProgress)
      .where(and(eq(wordProgress.learnerId, learnerId), eq(wordProgress.wordId, wordId)))
      .limit(1);

    const correct = Boolean(body.correct);
    const previousMastery = existing?.mastery ?? 40;
    const mastery = clamp(previousMastery + (correct ? Math.max(4, Math.round(score / 15)) : -10));
    const intervalHours = correct
      ? mastery >= 85 ? 168 : mastery >= 70 ? 72 : mastery >= 55 ? 24 : 6
      : 1;
    const dueAt = new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString();
    const firstCompletionToday = skill === "recall" && correct && existing?.completedOn !== today;

    const currentScores = {
      see: profile.seeScore,
      hear: profile.hearScore,
      context: profile.contextScore,
      recall: profile.recallScore,
    };
    currentScores[skill] = clamp(currentScores[skill] * 0.78 + score * 0.22, 20, 98);

    await db.batch([
      db.insert(evaluationEvents).values({ learnerId, wordId, skill, correct, score }),
      db.insert(wordProgress).values({
        id: progressId,
        learnerId,
        wordId,
        mastery,
        intervalHours,
        dueAt,
        lastResult: correct,
        completedOn: firstCompletionToday ? today : existing?.completedOn ?? null,
        lastStudiedAt: new Date().toISOString(),
      }).onConflictDoUpdate({
        target: wordProgress.id,
        set: {
          mastery,
          intervalHours,
          dueAt,
          lastResult: correct,
          completedOn: firstCompletionToday ? today : existing?.completedOn ?? null,
          lastStudiedAt: new Date().toISOString(),
        },
      }),
      db.update(learnerProfiles).set({
        locale,
        completedToday: clamp(profile.completedToday + (firstCompletionToday ? 1 : 0), 0, 30),
        seeScore: currentScores.see,
        hearScore: currentScores.hear,
        contextScore: currentScores.context,
        recallScore: currentScores.recall,
        updatedAt: new Date().toISOString(),
      }).where(eq(learnerProfiles.id, learnerId)),
    ]);

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
