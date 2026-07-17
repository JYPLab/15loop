CREATE TABLE `content_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`catalog_id` text NOT NULL,
	`item_type` text NOT NULL,
	`status` text DEFAULT 'ready_for_review' NOT NULL,
	`content_json` text NOT NULL,
	`validation_json` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_drafts_catalog_created_idx` ON `content_drafts` (`catalog_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `content_drafts_status_created_idx` ON `content_drafts` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `content_reviews` (
	`catalog_id` text PRIMARY KEY NOT NULL,
	`draft_id` text NOT NULL,
	`status` text DEFAULT 'candidate' NOT NULL,
	`reviewer_id` text NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`reviewed_at` text,
	`published_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_reviews_status_idx` ON `content_reviews` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_reviews_draft_idx` ON `content_reviews` (`draft_id`);