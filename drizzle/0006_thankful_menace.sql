CREATE TABLE `beta_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`event_date` text NOT NULL,
	`guardian_id` text,
	`learner_id` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `beta_events_name_date_idx` ON `beta_events` (`event_name`,`event_date`);--> statement-breakpoint
CREATE INDEX `beta_events_guardian_created_idx` ON `beta_events` (`guardian_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `beta_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`guardian_id` text NOT NULL,
	`category` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `beta_feedback_guardian_created_idx` ON `beta_feedback` (`guardian_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `beta_feedback_status_created_idx` ON `beta_feedback` (`status`,`created_at`);--> statement-breakpoint
ALTER TABLE `guardian_accounts` ADD `terms_version` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `guardian_accounts` ADD `privacy_version` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `guardian_accounts` ADD `guardian_confirmed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `guardian_accounts` ADD `consent_accepted_at` text;