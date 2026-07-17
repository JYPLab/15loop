import { and, eq } from "drizzle-orm";
import { authErrorResponse, requireParent } from "../../../../lib/auth";
import { recordBetaEvent } from "../../../../lib/beta-ops";
import { commercialRouteError, getCommercialStorage, guardianHasConsent } from "../../../../lib/commercial";
import { commercialPlans, isCommercialPlanCode } from "../../../../lib/plans";

type TossPayment = {
  paymentKey?: string;
  orderId?: string;
  status?: string;
  totalAmount?: number;
  receipt?: { url?: string } | null;
};

export async function POST(request: Request) {
  try {
    const parent = await requireParent(request);
    const body = (await request.json()) as { paymentKey?: string; orderId?: string; amount?: number };
    const orderId = String(body.orderId || "").trim();
    const paymentKey = String(body.paymentKey || "").trim();
    const returnedAmount = Number(body.amount);
    if (!orderId || !paymentKey || !Number.isInteger(returnedAmount)) {
      return Response.json({ error: "결제 승인 정보가 올바르지 않습니다." }, { status: 400 });
    }

    const { db, schema } = await getCommercialStorage();
    const [order] = await db.select().from(schema.paymentOrders).where(and(
      eq(schema.paymentOrders.id, orderId),
      eq(schema.paymentOrders.guardianId, parent.id),
    )).limit(1);
    if (!order) return Response.json({ error: "주문을 찾지 못했습니다." }, { status: 404 });
    if (order.status === "PAID") return Response.json({ paid: true, orderId, receiptUrl: order.receiptUrl });
    if (returnedAmount !== order.amount) {
      await db.update(schema.paymentOrders).set({ status: "AMOUNT_MISMATCH", failureCode: "AMOUNT_MISMATCH" })
        .where(eq(schema.paymentOrders.id, orderId));
      return Response.json({ error: "결제 금액 검증에 실패했습니다." }, { status: 409 });
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      return Response.json({ error: "토스페이먼츠 시크릿 키가 설정되지 않았습니다." }, { status: 503 });
    }

    const tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${secretKey}:`)}`,
        "Content-Type": "application/json",
        "Idempotency-Key": order.idempotencyKey,
      },
      body: JSON.stringify({ paymentKey, orderId, amount: order.amount }),
    });
    const payment = (await tossResponse.json()) as TossPayment & { code?: string; message?: string };
    if (!tossResponse.ok || payment.orderId !== orderId || payment.totalAmount !== order.amount || payment.status !== "DONE") {
      await db.update(schema.paymentOrders).set({
        status: "FAILED",
        failureCode: String(payment.code || "CONFIRM_FAILED").slice(0, 80),
        failureMessage: String(payment.message || "Payment confirmation failed").slice(0, 300),
      }).where(eq(schema.paymentOrders.id, orderId));
      return Response.json({ error: "결제 승인에 실패했습니다. 결제 내역을 확인해주세요." }, { status: 502 });
    }

    if (!isCommercialPlanCode(order.planCode)) {
      return Response.json({ error: "주문 이용권 정보가 올바르지 않습니다." }, { status: 409 });
    }
    const [guardian] = await db.select().from(schema.guardianAccounts)
      .where(eq(schema.guardianAccounts.id, parent.id)).limit(1);
    if (!guardian || !guardianHasConsent(guardian)) {
      return Response.json({ error: "보호자 동의 상태를 확인할 수 없습니다." }, { status: 403 });
    }
    const now = new Date();
    const currentPaidUntil = guardian?.paidUntil ? new Date(guardian.paidUntil) : null;
    const base = currentPaidUntil && currentPaidUntil > now ? currentPaidUntil : now;
    const paidUntil = new Date(base.getTime() + commercialPlans[order.planCode].durationDays * 24 * 60 * 60 * 1000);
    const approvedAt = new Date().toISOString();

    await db.batch([
      db.update(schema.paymentOrders).set({
        status: "PAID",
        paymentKey,
        receiptUrl: payment.receipt?.url || null,
        approvedAt,
      }).where(eq(schema.paymentOrders.id, orderId)),
      db.update(schema.guardianAccounts).set({
        planCode: order.planCode,
        planStatus: "active",
        paidUntil: paidUntil.toISOString(),
        updatedAt: approvedAt,
      }).where(eq(schema.guardianAccounts.id, parent.id)),
    ]);
    await recordBetaEvent(db, schema, {
      eventName: "payment_completed",
      guardianId: parent.id,
      metadata: { planCode: order.planCode, amount: order.amount },
    });

    return Response.json({ paid: true, orderId, paidUntil: paidUntil.toISOString(), receiptUrl: payment.receipt?.url || null });
  } catch (error) {
    return authErrorResponse(error) ?? commercialRouteError(error);
  }
}
