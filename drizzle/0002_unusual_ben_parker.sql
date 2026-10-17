CREATE TABLE `chat_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`low_user_id` text NOT NULL,
	`high_user_id` text NOT NULL,
	`last_message_id` integer DEFAULT 0 NOT NULL,
	`low_read_id` integer DEFAULT 0 NOT NULL,
	`high_read_id` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`low_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`high_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_chat_pair` ON `chat_conversations` (`low_user_id`,`high_user_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_high_user` ON `chat_conversations` (`high_user_id`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`sender_name` text NOT NULL,
	`sender_role` text NOT NULL,
	`client_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_chat_messages_conversation` ON `chat_messages` (`conversation_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_chat_send_retry` ON `chat_messages` (`sender_id`,`client_id`);