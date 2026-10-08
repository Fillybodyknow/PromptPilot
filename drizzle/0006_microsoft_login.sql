ALTER TABLE `users` MODIFY COLUMN `display_name` varchar(200);--> statement-breakpoint
ALTER TABLE `users` ADD `ms_oid` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `role` enum('admin','editor') DEFAULT 'editor' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('pending','active','rejected','disabled') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `requested_at` datetime(3) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `decided_by` varchar(320);--> statement-breakpoint
ALTER TABLE `users` ADD `decided_at` datetime(3);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `uq_users_ms_oid` UNIQUE(`ms_oid`);--> statement-breakpoint
CREATE INDEX `idx_users_status` ON `users` (`status`);