CREATE TABLE `learning_records` (
 `id` text PRIMARY KEY NOT NULL,
 `kind` text NOT NULL,
 `owner_id` text NOT NULL,
 `reflection_id` text,
 `course_id` text,
 `version_id` text,
 `payload_json` text NOT NULL,
 `revision` integer DEFAULT 1 NOT NULL,
 `created_at` text NOT NULL,
 `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_learning_reflection_kind` ON `learning_records` (`reflection_id`,`kind`);
--> statement-breakpoint
CREATE INDEX `idx_learning_owner_kind` ON `learning_records` (`owner_id`,`kind`);
--> statement-breakpoint
CREATE INDEX `idx_learning_course_kind` ON `learning_records` (`course_id`,`kind`);
