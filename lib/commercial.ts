import { eq } from "drizzle-orm";
import type { ParentIdentity } from "./auth";
import { hasCurrentGuardianConsent } from "./policies";

type Db = ReturnType<typeof import("../db").getDb>;
type Schema = typeof import("../db/schema");

export async function getCommercialStorage() {
  const [{ getDb }, schema] = await Promise.all([
    import("../db"),
    import("../db/schema"),
  ]);
  return { db: getDb(), schema };
}

export async function ensureGuardian(db: Db, schema: Schema, parent: ParentIdentity) {
  const [existing] = await db.select().from(schema.guardianAccounts)
    .where(eq(schema.guardianAccounts.id, parent.id))
    .limit(1);
  if (existing) {
    if (existing.email !== parent.email || existing.displayName !== parent.displayName) {
      const [updated] = await db.update(schema.guardianAccounts).set({
        email: parent.email,
        displayName: parent.displayName,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.guardianAccounts.id, parent.id)).returning();
      return updated;
    }
    return existing;
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [created] = await db.insert(schema.guardianAccounts).values({
    id: parent.id,
    email: parent.email,
    displayName: parent.displayName,
    customerKey: `guardian-${crypto.randomUUID()}`,
    trialStartedAt: now.toISOString(),
    trialEndsAt: trialEnd.toISOString(),
  }).returning();
  return created;
}

export function guardianHasAccess(account: {
  trialEndsAt: string;
  planStatus: string;
  paidUntil: string | null;
}, now = new Date()) {
  const trialActive = new Date(account.trialEndsAt).getTime() > now.getTime();
  const paidActive = account.planStatus === "active" && Boolean(account.paidUntil) &&
    new Date(account.paidUntil as string).getTime() > now.getTime();
  return trialActive || paidActive;
}

export function guardianHasConsent(account: {
  termsVersion: string;
  privacyVersion: string;
  guardianConfirmed: boolean;
  consentAcceptedAt: string | null;
}) {
  return hasCurrentGuardianConsent(account);
}

export function commercialRouteError(error: unknown) {
  const message = error instanceof Error ? error.message : "Commercial storage is unavailable";
  const missingSchema = message.includes("no such table") || message.includes("D1 binding");
  console.error("Commercial route failed", message);
  return Response.json(
    { error: missingSchema ? "상용 데이터베이스가 아직 초기화되지 않았습니다." : "요청을 처리하지 못했습니다." },
    { status: 503 },
  );
}
