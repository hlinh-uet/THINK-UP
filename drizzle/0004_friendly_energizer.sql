CREATE TABLE `reflection_coach_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`reflection_id` text NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`question` text NOT NULL,
	`reply` text,
	`status` text NOT NULL,
	`provider` text,
	`included_attachments` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`reflection_id`) REFERENCES `reflections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reflection_coach_retry` ON `reflection_coach_turns` (`user_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `idx_reflection_coach_history` ON `reflection_coach_turns` (`reflection_id`,`created_at`);