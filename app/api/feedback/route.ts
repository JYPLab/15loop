import { desc, eq } from "drizzle-orm";
import { authErrorResponse, requireParent } from "../../../lib/auth";
import { commercialRouteError, ensureGuardian, getCommercialStorage, guardianHasConsent } from "../../../lib/commercial";

const categories = ["bug", "learning", "account", "payment", "suggestion"] as const;

export async function GET(request: Request) {
  try {
    const parent = await requireParent(request);
    const { db, schema } = await getCommercialStorage();
    const rows = await db.select({
      id: schema.betaFeedback.id,
      category: schema.betaFeedback.category,
      message: schema.betaFeedback.message,
      status: schema.betaFeedback.status,
      createdAt: schema.betaFeedback.createdAt,
    }).from(schema.betaFeedback)
      .where(eq(schema.betaFeedback.guardianId, parent.id))
      .orderBy(desc(schema.betaFeedback.createdAt))
      .limit(10);
    return Response.json({ feedback: rows });
  } catch (error) {
    return authErrorResponse(error) ?? commercialRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parent = await requireParent(request);
    const body = (await request.json()) as { category?: string; message?: string };
    const category = String(body.category || "");
    const message = String(body.message || "").trim();
    if (!categories.includes(category as typeof categories[number]) || message.length < 5 || message.length > 2000) {
      return Response.json({ error: "피드백 종류와 5~2,000자의 내용을 확인해주세요." }, { status: 400 });
    }
    const { db, schema } = await getCommercialStorage();
    const account = await ensureGuardian(db, schema, parent);
    if (!guardianHasConsent(account)) {
      return Response.json({ error: "보호자 동의 후 피드백을 보낼 수 있습니다." }, { status: 403 });
    }
    const id = `feedback-${crypto.randomUUID()}`;
    await db.insert(schema.betaFeedback).values({ id, guardianId: parent.id, category, message });
    return Response.json({ id, saved: true }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error) ?? commercialRouteError(error);
  }
}
