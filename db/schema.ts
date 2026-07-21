import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const learnerProfiles = sqliteTable("learner_profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull().default("JY"),
  grade: text("grade").notNull().default("middle-1"),
  locale: text("locale").notNull().default("ko"),
  streak: integer("streak").notNull().default(1),
  completedToday: integer("completed_today").notNull().default(0),
  studySecondsToday: integer("study_seconds_today").notNull().default(0),
  dailySessionCompleted: integer("daily_session_completed", { mode: "boolean" }).notNull().default(false),
  lastHeartbeatAt: text("last_heartbeat_at"),
  lastStudyDate: text("last_study_date").notNull(),
  seeScore: integer("see_score").notNull().default(50),
  hearScore: integer("hear_score").notNull().default(50),
  contextScore: integer("context_score").notNull().default(50),
  recallScore: integer("recall_score").notNull().default(50),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const wordProgress = sqliteTable("word_progress", {
  id: text("id").primaryKey(),
  learnerId: text("learner_id").notNull(),
  wordId: text("word_id").notNull(),
  mastery: integer("mastery").notNull().default(40),
  intervalHours: integer("interval_hours").notNull().default(6),
  dueAt: text("due_at").notNull(),
  lastResult: integer("last_result", { mode: "boolean" }).notNull().default(false),
  cycleSkillMask: integer("cycle_skill_mask").notNull().default(0),
  cycleErrorMask: integer("cycle_error_mask").notNull().default(0),
  cycleHadError: integer("cycle_had_error", { mode: "boolean" }).notNull().default(false),
  completedOn: text("completed_on"),
  lastStudiedAt: text("last_studied_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("word_progress_learner_due_idx").on(table.learnerId, table.dueAt),
]);

export const evaluationEvents = sqliteTable("evaluation_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  learnerId: text("learner_id").notNull(),
  wordId: text("word_id").notNull(),
  skill: text("skill").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull(),
  score: integer("score").notNull(),
  responseKind: text("response_kind").notNull().default("answered"),
  evaluationReceiptId: text("evaluation_receipt_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("evaluation_events_learner_created_idx").on(table.learnerId, table.createdAt),
  uniqueIndex("evaluation_events_receipt_idx").on(table.evaluationReceiptId),
]);

export const evaluationReceipts = sqliteTable("evaluation_receipts", {
  id: text("id").primaryKey(),
  learnerId: text("learner_id").notNull(),
  wordId: text("word_id").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull(),
  score: integer("score").notNull(),
  expiresAt: text("expires_at").notNull(),
  consumedAt: text("consumed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("evaluation_receipts_learner_created_idx").on(table.learnerId, table.createdAt),
]);

export const guardianAccounts = sqliteTable("guardian_accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull().default("보호자"),
  customerKey: text("customer_key").notNull(),
  trialStartedAt: text("trial_started_at").notNull(),
  trialEndsAt: text("trial_ends_at").notNull(),
  planCode: text("plan_code").notNull().default("trial"),
  planStatus: text("plan_status").notNull().default("trial"),
  paidUntil: text("paid_until"),
  termsVersion: text("terms_version").notNull().default(""),
  privacyVersion: text("privacy_version").notNull().default(""),
  guardianConfirmed: integer("guardian_confirmed", { mode: "boolean" }).notNull().default(false),
  consentAcceptedAt: text("consent_accepted_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("guardian_accounts_email_idx").on(table.email),
  uniqueIndex("guardian_accounts_customer_key_idx").on(table.customerKey),
]);

export const guardianLearners = sqliteTable("guardian_learners", {
  id: text("id").primaryKey(),
  guardianId: text("guardian_id").notNull(),
  learnerId: text("learner_id").notNull(),
  relation: text("relation").notNull().default("parent"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("guardian_learners_guardian_idx").on(table.guardianId),
  uniqueIndex("guardian_learners_pair_idx").on(table.guardianId, table.learnerId),
]);

export const diagnosticSessions = sqliteTable("diagnostic_sessions", {
  id: text("id").primaryKey(),
  guestLearnerId: text("guest_learner_id").notNull(),
  guardianId: text("guardian_id"),
  learnerId: text("learner_id"),
  itemCount: integer("item_count").notNull(),
  answersJson: text("answers_json").notNull(),
  seeScore: integer("see_score").notNull(),
  hearScore: integer("hear_score").notNull(),
  contextScore: integer("context_score").notNull(),
  recallScore: integer("recall_score").notNull(),
  recommendedLevel: text("recommended_level").notNull(),
  completedAt: text("completed_at").notNull(),
  claimedAt: text("claimed_at"),
}, (table) => [
  index("diagnostic_sessions_guest_idx").on(table.guestLearnerId),
  index("diagnostic_sessions_guardian_idx").on(table.guardianId),
]);

export const paymentOrders = sqliteTable("payment_orders", {
  id: text("id").primaryKey(),
  guardianId: text("guardian_id").notNull(),
  provider: text("provider").notNull().default("toss"),
  planCode: text("plan_code").notNull(),
  orderName: text("order_name").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("KRW"),
  status: text("status").notNull().default("READY"),
  customerKey: text("customer_key").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  paymentKey: text("payment_key"),
  receiptUrl: text("receipt_url"),
  failureCode: text("failure_code"),
  failureMessage: text("failure_message"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  approvedAt: text("approved_at"),
}, (table) => [
  index("payment_orders_guardian_created_idx").on(table.guardianId, table.createdAt),
  index("payment_orders_status_idx").on(table.status),
]);

export const aiEvaluationUsage = sqliteTable("ai_evaluation_usage", {
  id: text("id").primaryKey(),
  actorType: text("actor_type").notNull(),
  usageDate: text("usage_date").notNull(),
  requestCount: integer("request_count").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("ai_evaluation_usage_date_idx").on(table.usageDate),
]);

export const contentDrafts = sqliteTable("content_drafts", {
  id: text("id").primaryKey(),
  catalogId: text("catalog_id").notNull(),
  itemType: text("item_type").notNull(),
  status: text("status").notNull().default("ready_for_review"),
  contentJson: text("content_json").notNull(),
  validationJson: text("validation_json").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("content_drafts_catalog_created_idx").on(table.catalogId, table.createdAt),
  index("content_drafts_status_created_idx").on(table.status, table.createdAt),
]);

export const contentReviews = sqliteTable("content_reviews", {
  catalogId: text("catalog_id").primaryKey(),
  draftId: text("draft_id").notNull(),
  status: text("status").notNull().default("candidate"),
  reviewerId: text("reviewer_id").notNull(),
  reviewNote: text("review_note").notNull().default(""),
  reviewedAt: text("reviewed_at"),
  publishedAt: text("published_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("content_reviews_status_idx").on(table.status),
  uniqueIndex("content_reviews_draft_idx").on(table.draftId),
]);

export const betaFeedback = sqliteTable("beta_feedback", {
  id: text("id").primaryKey(),
  guardianId: text("guardian_id").notNull(),
  category: text("category").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("beta_feedback_guardian_created_idx").on(table.guardianId, table.createdAt),
  index("beta_feedback_status_created_idx").on(table.status, table.createdAt),
]);

export const betaEvents = sqliteTable("beta_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  eventDate: text("event_date").notNull(),
  guardianId: text("guardian_id"),
  learnerId: text("learner_id"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("beta_events_name_date_idx").on(table.eventName, table.eventDate),
  index("beta_events_guardian_created_idx").on(table.guardianId, table.createdAt),
]);
