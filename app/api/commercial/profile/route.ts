import { and, desc, eq, inArray } from "drizzle-orm";
import { authErrorResponse, requireParent } from "../../../../lib/auth";
import { commercialRouteError, ensureGuardian, getCommercialStorage } from "../../../../lib/commercial";
import { commercialPlans, isCommercialPlanCode } from "../../../../lib/plans";

type ProfileAction = {
  action?: "addLearner" | "claimDiagnostic";
  nickname?: string;
  grade?: string;
  diagnosticId?: string;
  guestLearnerId?: string;
  learnerId?: string;
};

function publicGuardian(account: Awaited<ReturnType<typeof ensureGuardian>>) {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    trialStartedAt: account.trialStartedAt,
    trialEndsAt: account.trialEndsAt,
    planCode: account.planCode,
    planStatus: account.planStatus,
    paidUntil: account.paidUntil,
  };
}

async function profilePayload(
  db: Awaited<ReturnType<typeof getCommercialStorage>>["db"],
  schema: Awaited<ReturnType<typeof getCommercialStorage>>["schema"],
  account: Awaited<ReturnType<typeof ensureGuardian>>,
) {
  const mappings = await db.select().from(schema.guardianLearners)
    .where(eq(schema.guardianLearners.guardianId, account.id));
  const learnerIds = mappings.map((item) => item.learnerId);
  const learners = learnerIds.length
    ? await db.select().from(schema.learnerProfiles).where(inArray(schema.learnerProfiles.id, learnerIds))
    : [];
  const orders = await db.select({
    id: schema.paymentOrders.id,
    planCode: schema.paymentOrders.planCode,
    orderName: schema.paymentOrders.orderName,
    amount: schema.paymentOrders.amount,
    status: schema.paymentOrders.status,
    receiptUrl: schema.paymentOrders.receiptUrl,
    createdAt: schema.paymentOrders.createdAt,
    approvedAt: schema.paymentOrders.approvedAt,
  }).from(schema.paymentOrders)
    .where(eq(schema.paymentOrders.guardianId, account.id))
    .orderBy(desc(schema.paymentOrders.createdAt))
    .limit(10);
  const diagnostics = await db.select({
    id: schema.diagnosticSessions.id,
    learnerId: schema.diagnosticSessions.learnerId,
    itemCount: schema.diagnosticSessions.itemCount,
    seeScore: schema.diagnosticSessions.seeScore,
    hearScore: schema.diagnosticSessions.hearScore,
    contextScore: schema.diagnosticSessions.contextScore,
    recallScore: schema.diagnosticSessions.recallScore,
    recommendedLevel: schema.diagnosticSessions.recommendedLevel,
    completedAt: schema.diagnosticSessions.completedAt,
  }).from(schema.diagnosticSessions)
    .where(eq(schema.diagnosticSessions.guardianId, account.id))
    .orderBy(desc(schema.diagnosticSessions.completedAt))
    .limit(10);

  return {
    account: publicGuardian(account),
    learners: learners.map((learner) => ({
      id: learner.id,
      displayName: learner.displayName,
      grade: learner.grade,
      streak: learner.streak,
      completedToday: learner.completedToday,
      studySecondsToday: learner.studySecondsToday,
      dailySessionCompleted: learner.dailySessionCompleted,
      scores: {
        see: learner.seeScore,
        hear: learner.hearScore,
        context: learner.contextScore,
        recall: learner.recallScore,
      },
    })),
    diagnostics,
    orders,
  };
}

export async function GET(request: Request) {
  try {
    const parent = await requireParent(request);
    const { db, schema } = await getCommercialStorage();
    const account = await ensureGuardian(db, schema, parent);
    return Response.json(await profilePayload(db, schema, account));
  } catch (error) {
    return authErrorResponse(error) ?? commercialRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parent = await requireParent(request);
    const body = (await request.json()) as ProfileAction;
    const { db, schema } = await getCommercialStorage();
    const account = await ensureGuardian(db, schema, parent);

    if (body.action === "addLearner") {
      const nickname = String(body.nickname || "").trim().slice(0, 24);
      const grade = String(body.grade || "middle-1").trim();
      if (!nickname || !["elementary-5", "elementary-6", "middle-1", "middle-2", "middle-3"].includes(grade)) {
        return Response.json({ error: "아이의 닉네임과 학년을 확인해주세요." }, { status: 400 });
      }
      const existing = await db.select().from(schema.guardianLearners)
        .where(eq(schema.guardianLearners.guardianId, parent.id));
      const activeLimit = account.planStatus === "active" && isCommercialPlanCode(account.planCode)
        ? commercialPlans[account.planCode].learnerLimit
        : 3;
      if (existing.length >= activeLimit) {
        return Response.json({
          error: activeLimit === 1
            ? "개인 이용권에는 아이 1명만 연결할 수 있습니다. 가족 이용권으로 변경해주세요."
            : "가족 계정에는 아이를 최대 3명까지 연결할 수 있습니다.",
        }, { status: 409 });
      }
      const learnerId = `child-${crypto.randomUUID()}`;
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
      await db.batch([
        db.insert(schema.learnerProfiles).values({ id: learnerId, displayName: nickname, grade, lastStudyDate: today }),
        db.insert(schema.guardianLearners).values({ id: `${parent.id}:${learnerId}`, guardianId: parent.id, learnerId }),
      ]);
    } else if (body.action === "claimDiagnostic") {
      const diagnosticId = String(body.diagnosticId || "").trim();
      const guestLearnerId = String(body.guestLearnerId || "").trim();
      if (!/^diag-[0-9a-f-]{36}$/i.test(diagnosticId) || !/^learner-[0-9a-f-]{36}$/i.test(guestLearnerId)) {
        return Response.json({ error: "진단 연결 정보가 올바르지 않습니다." }, { status: 400 });
      }
      const [diagnostic] = await db.select().from(schema.diagnosticSessions).where(and(
        eq(schema.diagnosticSessions.id, diagnosticId),
        eq(schema.diagnosticSessions.guestLearnerId, guestLearnerId),
      )).limit(1);
      if (!diagnostic) return Response.json({ error: "진단 결과를 찾지 못했습니다." }, { status: 404 });
      if (diagnostic.guardianId && diagnostic.guardianId !== parent.id) {
        return Response.json({ error: "이미 다른 가족 계정에 연결된 진단입니다." }, { status: 409 });
      }

      const learnerId = String(body.learnerId || "").trim() || null;
      if (learnerId) {
        const [ownership] = await db.select().from(schema.guardianLearners).where(and(
          eq(schema.guardianLearners.guardianId, parent.id),
          eq(schema.guardianLearners.learnerId, learnerId),
        )).limit(1);
        if (!ownership) return Response.json({ error: "연결할 수 없는 학습자입니다." }, { status: 403 });
        await db.update(schema.learnerProfiles).set({
          seeScore: diagnostic.seeScore,
          hearScore: diagnostic.hearScore,
          contextScore: diagnostic.contextScore,
          recallScore: diagnostic.recallScore,
          updatedAt: new Date().toISOString(),
        }).where(eq(schema.learnerProfiles.id, learnerId));
      }
      await db.update(schema.diagnosticSessions).set({
        guardianId: parent.id,
        learnerId,
        claimedAt: new Date().toISOString(),
      }).where(eq(schema.diagnosticSessions.id, diagnosticId));
    } else {
      return Response.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
    }

    const [refreshed] = await db.select().from(schema.guardianAccounts)
      .where(eq(schema.guardianAccounts.id, parent.id)).limit(1);
    return Response.json(await profilePayload(db, schema, refreshed ?? account));
  } catch (error) {
    return authErrorResponse(error) ?? commercialRouteError(error);
  }
}
