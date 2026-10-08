CREATE TABLE `check_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggered_by` varchar(320) NOT NULL,
	`scope` varchar(200) NOT NULL,
	`started_at` datetime(3) NOT NULL,
	`finished_at` datetime(3),
	`status` enum('running','ok','failed') NOT NULL,
	`message` text,
	CONSTRAINT `check_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target_type` enum('tool','guide') NOT NULL,
	`target_key` varchar(100) NOT NULL,
	`changes` json NOT NULL,
	`summary` text,
	`confidence` enum('low','medium','high') NOT NULL,
	`trigger` enum('manual','news','stale','monthly') NOT NULL,
	`trigger_ref` varchar(320),
	`status` enum('pending','accepted','partial','rejected','expired','superseded') NOT NULL DEFAULT 'pending',
	`created_at` datetime(3) NOT NULL,
	`decided_by` varchar(320),
	`decided_at` datetime(3),
	`decision_note` text,
	CONSTRAINT `content_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watch_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tool_id` int NOT NULL,
	`url` varchar(500) NOT NULL,
	`last_hash` char(64),
	`last_checked_at` datetime(3),
	`last_status` varchar(200),
	CONSTRAINT `watch_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_watch_pages_tool_url` UNIQUE(`tool_id`,`url`)
);
--> statement-breakpoint
ALTER TABLE `watch_pages` ADD CONSTRAINT `watch_pages_tool_id_tools_id_fk` FOREIGN KEY (`tool_id`) REFERENCES `tools`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_suggestions_status` ON `content_suggestions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_suggestions_target` ON `content_suggestions` (`target_type`,`target_key`);