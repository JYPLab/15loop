import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const learnerProfiles = sqliteTable("learner_profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull().default("JY"),
  locale: text("locale").notNull().default("ko"),
  streak: integer("streak").notNull().default(1),
  completedToday: integer("completed_today").notNull().default(0),
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
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("evaluation_events_learner_created_idx").on(table.learnerId, table.createdAt),
]);
