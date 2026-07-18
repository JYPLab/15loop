type Db = ReturnType<typeof import("../db").getDb>;
type Schema = typeof import("../db/schema");

export type BetaEventName =
  | "guardian_consent_accepted"
  | "learner_created"
  | "diagnostic_claimed"
  | "daily_session_completed"
  | "price_presented"
  | "price_intent_answered"
  | "payment_started"
  | "payment_completed";

export async function recordBetaEvent(
  db: Db,
  schema: Schema,
  event: {
    eventName: BetaEventName;
    guardianId?: string | null;
    learnerId?: string | null;
    metadata?: Record<string, string | number | boolean | null>;
  },
) {
  try {
    const eventDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
    await db.insert(schema.betaEvents).values({
      eventName: event.eventName,
      eventDate,
      guardianId: event.guardianId ?? null,
      learnerId: event.learnerId ?? null,
      metadataJson: JSON.stringify(event.metadata ?? {}),
    });
  } catch (error) {
    console.warn(JSON.stringify({
      level: "warn",
      event: "beta_event_write_failed",
      eventName: event.eventName,
      message: error instanceof Error ? error.message : "unknown",
    }));
  }
}
