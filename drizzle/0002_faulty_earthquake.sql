CREATE TABLE `ai_evaluation_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_type` text NOT NULL,
	`usage_date` text NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_evaluation_usage_date_idx` ON `ai_evaluation_usage` (`usage_date`);