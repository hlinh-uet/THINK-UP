CREATE TABLE `actions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`reflection_id` text,
	`text` text NOT NULL,
	`due` text NOT NULL,
	`status` text NOT NULL,
	`review` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reflection_id`) REFERENCES `reflections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_actions_user` ON `actions` (`user_id`);--> statement-breakpoint
CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`reflection_id` text NOT NULL,
	`version_id` text NOT NULL,
	`kind` text NOT NULL,
	`provider` text NOT NULL,
	`result_json` text NOT NULL,
	`rubric_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`reflection_id`) REFERENCES `reflections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_analyses_reflection` ON `analyses` (`reflection_id`);--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`reflection_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`object_key` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`reflection_id`) REFERENCES `reflections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_attachments_reflection` ON `attachments` (`reflection_id`);--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`target_id` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`weeks_json` text NOT NULL,
	`rubric_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`course_id` text,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invite_email_course` ON `invitations` (`email`,`course_id`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_membership_unique` ON `memberships` (`course_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_membership_user` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE TABLE `reflections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_id` text,
	`title` text NOT NULL,
	`week` integer NOT NULL,
	`content_json` text NOT NULL,
	`status` text NOT NULL,
	`rev` integer NOT NULL,
	`latest_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reflections_user` ON `reflections` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_reflections_course_status` ON `reflections` (`course_id`,`status`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`reflection_id` text NOT NULL,
	`version_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`comment` text NOT NULL,
	`scores_json` text NOT NULL,
	`total` integer,
	`level` integer,
	`decision` text NOT NULL,
	`rubric_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`reflection_id`) REFERENCES `reflections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_reflection` ON `reviews` (`reflection_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `versions` (
	`id` text PRIMARY KEY NOT NULL,
	`reflection_id` text NOT NULL,
	`content_json` text NOT NULL,
	`title` text NOT NULL,
	`stage` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`reflection_id`) REFERENCES `reflections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_versions_reflection` ON `versions` (`reflection_id`);