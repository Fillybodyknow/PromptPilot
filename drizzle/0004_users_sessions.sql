CREATE TABLE `sessions` (
	`id` char(64) NOT NULL,
	`user_id` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`display_name` varchar(100),
	`password_hash` varchar(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`failed_logins` int NOT NULL DEFAULT 0,
	`locked_until` datetime(3),
	`last_login_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`created_by` varchar(64),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_users_username` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expires` ON `sessions` (`expires_at`);