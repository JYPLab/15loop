CREATE TABLE `evaluation_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`learner_id` text NOT NULL,
	`word_id` text NOT NULL,
	`skill` text NOT NULL,
	`correct` integer NOT NULL,
	`score` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `evaluation_events_learner_created_idx` ON `evaluation_events` (`learner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `learner_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT 'JY' NOT NULL,
	`locale` text DEFAULT 'ko' NOT NULL,
	`streak` integer DEFAULT 1 NOT NULL,
	`completed_today` integer DEFAULT 0 NOT NULL,
	`last_study_date` text NOT NULL,
	`see_score` integer DEFAULT 50 NOT NULL,
	`hear_score` integer DEFAULT 50 NOT NULL,
	`context_score` integer DEFAULT 50 NOT NULL,
	`recall_score` integer DEFAULT 50 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `word_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`learner_id` text NOT NULL,
	`word_id` text NOT NULL,
	`mastery` integer DEFAULT 40 NOT NULL,
	`interval_hours` integer DEFAULT 6 NOT NULL,
	`due_at` text NOT NULL,
	`last_result` integer DEFAULT false NOT NULL,
	`completed_on` text,
	`last_studied_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `word_progress_learner_due_idx` ON `word_progress` (`learner_id`,`due_at`);