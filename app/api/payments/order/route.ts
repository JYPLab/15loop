import { authErrorResponse, requireParent } from "../../../../lib/auth";
import { commercialRouteError, ensureGuardian, getCommercialStorage } from "../../../../lib/commercial";
import { commercialPlans, isCommercialPlanCode } from "../../../../lib/plans";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const parent = await requireParent(request);
    const body = (await request.json()) as { planCode?: string };
    const planCode = String(body.planCode || "");
    if (!isCommercialPlanCode(planCode)) {
      return Response.json({ error: "유효한 이용권을 선택해주세요." }, { status: 400 });
    }

    const { db, schema } = await getCommercialStorage();
    const account = await ensureGuardian(db, schema, parent);
    const plan = commercialPlans[planCode];
    const linkedLearners = await db.select({ id: schema.guardianLearners.id })
      .from(schema.guardianLearners)
      .where(eq(schema.guardianLearners.guardianId, parent.id));
    if (linkedLearners.length > plan.learnerLimit) {
      return Response.json({
        error: `현재 ${linkedLearners.length}명의 아이가 연결되어 있어 가족 이용권이 필요합니다.`,
      }, { status: 409 });
    }
    const orderId = `lv_${crypto.randomUUID().replaceAll("-", "")}`;
    const idempotencyKey = crypto.randomUUID();
    await db.insert(schema.paymentOrders).values({
      id: orderId,
      guardianId: parent.id,
      planCode,
      orderName: `15Loop ${plan.nameKo}`,
      amount: plan.amount,
      customerKey: account.customerKey,
      idempotencyKey,
    });

    return Response.json({
      orderId,
      orderName: `15Loop ${plan.nameKo}`,
      amount: plan.amount,
      currency: "KRW",
      customerKey: account.customerKey,
      customerEmail: parent.email,
      customerName: parent.displayName,
      clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || null,
    });
  } catch (error) {
    return authErrorResponse(error) ?? commercialRouteError(error);
  }
}
