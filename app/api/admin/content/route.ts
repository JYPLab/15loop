import { desc, eq } from "drizzle-orm";
import { contentAdminError, contentReviewer } from "../../../../lib/content-admin";
import { findCatalogEntry } from "../../../../lib/content-catalog";
import { contentPromptVersion, generateLearningContent } from "../../../../lib/content-pipeline";

type ReviewAction = "review" | "publish" | "reject";

async function storage() {
  const [{ getDb }, schema] = await Promise.all([
    import("../../../../db"),
    import("../../../../db/schema"),
  ]);
  return { db: getDb(), schema };
}

function storageError(error: unknown) {
  const message = error instanceof Error ? error.message : "Content pipeline is unavailable";
  const unavailable = message.includes("D1 binding") || message.includes("no such table");
  return Response.json(
    { error: unavailable ? "Content storage is not initialized" : message },
    { status: unavailable ? 503 : 502 },
  );
}

export async function GET(request: Request) {
  const authError = await contentAdminError(request);
  if (authError) return authError;
  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim();
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20));

  try {
    const { db, schema } = await storage();
    const query = db.select().from(schema.contentDrafts);
    const rows = status
      ? await query.where(eq(schema.contentDrafts.status, status)).orderBy(desc(schema.contentDrafts.createdAt)).limit(limit)
      : await query.orderBy(desc(schema.contentDrafts.createdAt)).limit(limit);
    return Response.json({ drafts: rows.map((row) => ({
      ...row,
      content: JSON.parse(row.contentJson),
      validation: JSON.parse(row.validationJson),
      contentJson: undefined,
      validationJson: undefined,
    })) });
  } catch (error) {
    return storageError(error);
  }
}

export async function POST(request: Request) {
  const authError = await contentAdminError(request);
  if (authError) return authError;
  const body = (await request.json()) as { catalogId?: string };
  const entry = findCatalogEntry(body.catalogId ?? "");
  if (!entry) return Response.json({ error: "Unknown catalog item" }, { status: 404 });

  try {
    const { generated, model, validation } = await generateLearningContent(entry);
    const { db, schema } = await storage();
    const id = `draft-${crypto.randomUUID()}`;
    const status = validation.passed ? "ready_for_review" : "validation_failed";
    await db.insert(schema.contentDrafts).values({
      id,
      catalogId: entry.id,
      itemType: generated.itemType,
      status,
      contentJson: JSON.stringify(generated),
      validationJson: JSON.stringify(validation),
      model,
      promptVersion: contentPromptVersion,
    });
    return Response.json({ id, catalogId: entry.id, status, validation }, { status: 201 });
  } catch (error) {
    return storageError(error);
  }
}

export async function PATCH(request: Request) {
  const authError = await contentAdminError(request);
  if (authError) return authError;
  const body = (await request.json()) as {
    draftId?: string;
    action?: ReviewAction;
    note?: string;
  };
  const draftId = body.draftId?.trim() ?? "";
  const action = body.action;
  const note = body.note?.trim().slice(0, 1000) ?? "";
  if (!draftId || !action || !["review", "publish", "reject"].includes(action)) {
    return Response.json({ error: "Valid draftId and review action are required" }, { status: 400 });
  }

  try {
    const { db, schema } = await storage();
    const [draft] = await db.select().from(schema.contentDrafts)
      .where(eq(schema.contentDrafts.id, draftId)).limit(1);
    if (!draft) return Response.json({ error: "Draft not found" }, { status: 404 });
    const [current] = await db.select().from(schema.contentReviews)
      .where(eq(schema.contentReviews.catalogId, draft.catalogId)).limit(1);

    if (action === "review" && draft.status !== "ready_for_review") {
      return Response.json({ error: "Only validated drafts can be reviewed" }, { status: 409 });
    }
    if (action === "publish" && (!current || current.status !== "reviewed" || current.draftId !== draft.id)) {
      return Response.json({ error: "The same draft must be reviewed before publication" }, { status: 409 });
    }

    const nextStatus = action === "review" ? "reviewed" : action === "publish" ? "published" : "rejected";
    const now = new Date().toISOString();
    const reviewerId = contentReviewer(request);
    await db.batch([
      db.update(schema.contentDrafts).set({ status: nextStatus, updatedAt: now })
        .where(eq(schema.contentDrafts.id, draft.id)),
      db.insert(schema.contentReviews).values({
        catalogId: draft.catalogId,
        draftId: draft.id,
        status: nextStatus,
        reviewerId,
        reviewNote: note,
        reviewedAt: action === "review" ? now : current?.reviewedAt ?? null,
        publishedAt: action === "publish" ? now : null,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: schema.contentReviews.catalogId,
        set: {
          draftId: draft.id,
          status: nextStatus,
          reviewerId,
          reviewNote: note,
          reviewedAt: action === "review" ? now : current?.reviewedAt ?? null,
          publishedAt: action === "publish" ? now : null,
          updatedAt: now,
        },
      }),
    ]);
    return Response.json({ catalogId: draft.catalogId, draftId: draft.id, status: nextStatus });
  } catch (error) {
    return storageError(error);
  }
}
