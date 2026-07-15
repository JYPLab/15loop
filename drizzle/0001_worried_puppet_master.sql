CREATE TABLE `diagnostic_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`guest_learner_id` text NOT NULL,
	`guardian_id` text,
	`learner_id` text,
	`item_count` integer NOT NULL,
	`answers_json` text NOT NULL,
	`see_score` integer NOT NULL,
	`hear_score` integer NOT NULL,
	`context_score` integer NOT NULL,
	`recall_score` integer NOT NULL,
	`recommended_level` text NOT NULL,
	`completed_at` text NOT NULL,
	`claimed_at` text
);
--> statement-breakpoint
CREATE INDEX `diagnostic_sessions_guest_idx` ON `diagnostic_sessions` (`guest_learner_id`);--> statement-breakpoint
CREATE INDEX `diagnostic_sessions_guardian_idx` ON `diagnostic_sessions` (`guardian_id`);--> statement-breakpoint
CREATE TABLE `guardian_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text DEFAULT '보호자' NOT NULL,
	`customer_key` text NOT NULL,
	`trial_started_at` text NOT NULL,
	`trial_ends_at` text NOT NULL,
	`plan_code` text DEFAULT 'trial' NOT NULL,
	`plan_status` text DEFAULT 'trial' NOT NULL,
	`paid_until` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guardian_accounts_email_idx` ON `guardian_accounts` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `guardian_accounts_customer_key_idx` ON `guardian_accounts` (`customer_key`);--> statement-breakpoint
CREATE TABLE `guardian_learners` (
	`id` text PRIMARY KEY NOT NULL,
	`guardian_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`relation` text DEFAULT 'parent' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guardian_learners_guardian_idx` ON `guardian_learners` (`guardian_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `guardian_learners_pair_idx` ON `guardian_learners` (`guardian_id`,`learner_id`);--> statement-breakpoint
CREATE TABLE `payment_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`guardian_id` text NOT NULL,
	`provider` text DEFAULT 'toss' NOT NULL,
	`plan_code` text NOT NULL,
	`order_name` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'KRW' NOT NULL,
	`status` text DEFAULT 'READY' NOT NULL,
	`customer_key` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`payment_key` text,
	`receipt_url` text,
	`failure_code` text,
	`failure_message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`approved_at` text
);
--> statement-breakpoint
CREATE INDEX `payment_orders_guardian_created_idx` ON `payment_orders` (`guardian_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `payment_orders_status_idx` ON `payment_orders` (`status`);--> statement-breakpoint
ALTER TABLE `learner_profiles` ADD `grade` text DEFAULT 'middle-1' NOT NULL;