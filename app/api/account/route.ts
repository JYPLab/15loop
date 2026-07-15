import { and, eq } from "drizzle-orm";
import { chatGPTSignOutPath, getChatGPTUser } from "../../chatgpt-auth";

type Db = ReturnType<typeof import("../../../db").getDb>;
type Schema = typeof import("../../../db/schema");

type ClaimRequest = {
  guestLearnerId?: string;
};

function accountLearnerId(email: string) {
  return `account:${email.trim().toLowerCase()}`;
}

function isValidGuestLearnerId(value: string) {
  return /^learner-[0-9a-f-]{36}$/i.test(value);
}

async function getStorage() {
  const [{ getDb }, schema] = await Promise.all([
    import("../../../db"),
    import("../../../db/schema"),
  ]);
  return { db: getDb(), schema };
}

function accountPayload(user: { displayName: string; email: string }) {
  return {
    authenticated: true,
    user: {
      displayName: user.displayName,
      email: user.email,
    },
    signOutPath: chatGPTSignOutPath("/"),
  };
}

async function ensureAccountProfile(
  db: Db,
  schema: Schema,
  learnerId: string,
  displayName: string,
) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  await db.insert(schema.learnerProfiles).values({
    id: learnerId,
    displayName,
    lastStudyDate: today,
  }).onConflictDoNothing();

  const [profile] = await db.select().from(schema.learnerProfiles)
    .where(eq(schema.learnerProfiles.id, learnerId))
    .limit(1);
  return profile;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ authenticated: false });
  return Response.json(accountPayload(user));
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "Sign in is required" }, { status: 401 });
  }

  const body = (await request.json()) as ClaimRequest;
  const guestLearnerId = body.guestLearnerId?.trim() ?? "";
  if (!isValidGuestLearnerId(guestLearnerId)) {
    return Response.json({ error: "A valid guest learner ID is required" }, { status: 400 });
  }

  try {
    const { db, schema } = await getStorage();
    const learnerId = accountLearnerId(user.email);
    const accountProfile = await ensureAccountProfile(db, schema, learnerId, user.displayName);
    const [guestProfile] = await db.select().from(schema.learnerProfiles)
      .where(eq(schema.learnerProfiles.id, guestLearnerId))
      .limit(1);

    if (!guestProfile) {
      await db.update(schema.learnerProfiles).set({
        displayName: user.displayName,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.learnerProfiles.id, learnerId));
      return Response.json({ ...accountPayload(user), claimed: false });
    }

    const guestWords = await db.select().from(schema.wordProgress)
      .where(eq(schema.wordProgress.learnerId, guestLearnerId));
    const statements = [];

    for (const guestWord of guestWords) {
      const [accountWord] = await db.select().from(schema.wordProgress)
        .where(and(
          eq(schema.wordProgress.learnerId, learnerId),
          eq(schema.wordProgress.wordId, guestWord.wordId),
        ))
        .limit(1);

      const keepGuest = !accountWord || guestWord.mastery > accountWord.mastery;
      const source = keepGuest ? guestWord : accountWord;
      statements.push(
        db.insert(schema.wordProgress).values({
          ...source,
          id: `${learnerId}:${guestWord.wordId}`,
          learnerId,
        }).onConflictDoUpdate({
          target: schema.wordProgress.id,
          set: {
            mastery: source.mastery,
            intervalHours: source.intervalHours,
            dueAt: source.dueAt,
            lastResult: source.lastResult,
            completedOn: source.completedOn,
            lastStudiedAt: source.lastStudiedAt,
          },
        }),
      );
    }

    statements.push(
      db.update(schema.learnerProfiles).set({
        displayName: user.displayName,
        locale: guestProfile.locale,
        streak: Math.max(accountProfile.streak, guestProfile.streak),
        completedToday: Math.max(accountProfile.completedToday, guestProfile.completedToday),
        seeScore: Math.max(accountProfile.seeScore, guestProfile.seeScore),
        hearScore: Math.max(accountProfile.hearScore, guestProfile.hearScore),
        contextScore: Math.max(accountProfile.contextScore, guestProfile.contextScore),
        recallScore: Math.max(accountProfile.recallScore, guestProfile.recallScore),
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.learnerProfiles.id, learnerId)),
      db.update(schema.evaluationEvents).set({ learnerId })
        .where(eq(schema.evaluationEvents.learnerId, guestLearnerId)),
      db.delete(schema.wordProgress).where(eq(schema.wordProgress.learnerId, guestLearnerId)),
      db.delete(schema.learnerProfiles).where(eq(schema.learnerProfiles.id, guestLearnerId)),
    );

    await db.batch(statements as Parameters<typeof db.batch>[0]);
    return Response.json({ ...accountPayload(user), claimed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to claim learning progress";
    console.error("Account claim failed", message);
    return Response.json({ error: "Unable to connect the learning profile" }, { status: 503 });
  }
}
