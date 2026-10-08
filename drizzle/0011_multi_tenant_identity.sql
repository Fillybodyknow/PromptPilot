ALTER TABLE `users` DROP INDEX `uq_users_ms_oid`;--> statement-breakpoint
ALTER TABLE `users` ADD `ms_tid` varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `account_type` enum('member','guest','external','personal') DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `uq_users_ms_identity` UNIQUE(`ms_tid`,`ms_oid`);--> statement-breakpoint
-- ย้ายข้อมูลจากคอลัมน์ is_guest เดิม (0012 จะลบคอลัมน์นั้น)
UPDATE `users` SET `account_type` = 'guest' WHERE `is_guest` = true;