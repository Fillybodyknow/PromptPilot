ALTER TABLE `news_items` MODIFY COLUMN `status` enum('pending','approved','rejected','auto_rejected','duplicate') NOT NULL;--> statement-breakpoint
ALTER TABLE `news_items` ADD `role_employee` text;--> statement-breakpoint
ALTER TABLE `news_items` ADD `role_it` text;--> statement-breakpoint
ALTER TABLE `news_items` ADD `role_exec` text;--> statement-breakpoint
ALTER TABLE `news_items` ADD `duplicate_of` char(16);--> statement-breakpoint
CREATE INDEX `idx_news_duplicate_of` ON `news_items` (`duplicate_of`);