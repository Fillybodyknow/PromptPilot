CREATE TABLE `fetch_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggered_by` varchar(100) NOT NULL,
	`started_at` datetime(3) NOT NULL,
	`finished_at` datetime(3),
	`status` enum('running','ok','failed') NOT NULL,
	`message` text,
	CONSTRAINT `fetch_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `news_categories` (
	`news_id` char(16) NOT NULL,
	`category_key` varchar(64) NOT NULL,
	CONSTRAINT `news_categories_news_id_category_key_pk` PRIMARY KEY(`news_id`,`category_key`)
);
--> statement-breakpoint
CREATE TABLE `news_items` (
	`id` char(16) NOT NULL,
	`url` text NOT NULL,
	`source` varchar(200) NOT NULL,
	`title` text NOT NULL,
	`snippet` text NOT NULL,
	`published_at` datetime(3) NOT NULL,
	`fetched_at` datetime(3) NOT NULL,
	`title_th` varchar(500),
	`summary_th` text,
	`importance` tinyint,
	`ai_reason` text,
	`status` enum('pending','approved','rejected','auto_rejected') NOT NULL,
	`reviewed_by` varchar(100),
	`reviewed_at` datetime(3),
	CONSTRAINT `news_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `news_categories` ADD CONSTRAINT `news_categories_news_id_news_items_id_fk` FOREIGN KEY (`news_id`) REFERENCES `news_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_news_categories_key` ON `news_categories` (`category_key`);--> statement-breakpoint
CREATE INDEX `idx_news_status_published` ON `news_items` (`status`,`published_at`);