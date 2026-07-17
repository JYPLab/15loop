CREATE TABLE `evaluation_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`learner_id` text NOT NULL,
	`word_id` text NOT NULL,
	`correct` integer NOT NULL,
	`score` integer NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `evaluation_receipts_learner_created_idx` ON `evaluation_receipts` (`learner_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `evaluation_events` ADD `evaluation_receipt_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `evaluation_events_receipt_idx` ON `evaluation_events` (`evaluation_receipt_id`);--> statement-breakpoint
ALTER TABLE `learner_profiles` ADD `last_heartbeat_at` text;