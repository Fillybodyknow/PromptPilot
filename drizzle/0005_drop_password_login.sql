-- เลิกใช้ login ด้วยรหัสผ่าน: บัญชีเดิมใช้ต่อไม่ได้ จึงลบทิ้งก่อน (session ถูกลบตามด้วย foreign key)
-- ต้องลบก่อน 0006 เพิ่มคอลัมน์ ms_oid ที่เป็น NOT NULL + UNIQUE
DELETE FROM `users`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `uq_users_username`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `username`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `password_hash`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `is_active`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `failed_logins`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `locked_until`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `created_by`;