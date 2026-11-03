CREATE TABLE `community_posts` (
 `id` text PRIMARY KEY NOT NULL,
 `author_id` text NOT NULL REFERENCES `users`(`id`),
 `body` text NOT NULL,
 `image_key` text,
 `image_type` text,
 `comments_off` integer DEFAULT 0 NOT NULL,
 `edited` integer DEFAULT 0 NOT NULL,
 `created_at` text NOT NULL,
 `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_community_posts_created` ON `community_posts` (`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_community_posts_author` ON `community_posts` (`author_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `community_reactions` (
 `post_id` text NOT NULL REFERENCES `community_posts`(`id`),
 `user_id` text NOT NULL REFERENCES `users`(`id`),
 `kind` text NOT NULL,
 `created_at` text NOT NULL,
 PRIMARY KEY(`post_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `community_comments` (
 `id` text PRIMARY KEY NOT NULL,
 `post_id` text NOT NULL REFERENCES `community_posts`(`id`),
 `author_id` text NOT NULL REFERENCES `users`(`id`),
 `parent_id` text,
 `body` text NOT NULL,
 `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_community_comments_post` ON `community_comments` (`post_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `community_comment_reactions` (
 `comment_id` text NOT NULL REFERENCES `community_comments`(`id`),
 `user_id` text NOT NULL REFERENCES `users`(`id`),
 `created_at` text NOT NULL,
 PRIMARY KEY(`comment_id`,`user_id`)
);
