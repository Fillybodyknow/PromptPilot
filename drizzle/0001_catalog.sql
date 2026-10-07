CREATE TABLE `guides` (
	`category_key` varchar(64) NOT NULL,
	`how_to_use` text NOT NULL,
	`access_method` enum('web','api','cli','desktop','self-host','ide-extension') NOT NULL,
	`links` json,
	`install_steps` json,
	`data_handling_note` text NOT NULL,
	`notes` json NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`updated_by` varchar(100),
	CONSTRAINT `guides_category_key` PRIMARY KEY(`category_key`)
);
--> statement-breakpoint
CREATE TABLE `news_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`url` text NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `news_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompt_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category_key` varchar(64) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`task` text NOT NULL,
	`bad_prompt` text,
	`good_prompt` text NOT NULL,
	`why` text NOT NULL,
	`tested` boolean NOT NULL,
	`tested_at` date,
	`tested_with` json NOT NULL,
	`sample_output` text,
	`draft_note` text,
	`source_url` text,
	CONSTRAINT `prompt_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category_key` varchar(64) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`name` varchar(200) NOT NULL,
	`vendor` varchar(200) NOT NULL,
	`model_id` varchar(200),
	`release_date` varchar(50) NOT NULL,
	`source_label` enum('official','community') NOT NULL,
	`verified_at` date NOT NULL,
	`status` enum('active','preview','not-recommended-th','closing','closed','restricted') NOT NULL,
	`url` text NOT NULL,
	`source_url` text,
	`benchmark` text,
	`price_usd_in` double,
	`price_usd_out` double,
	`price_note` text NOT NULL,
	`best_for` text NOT NULL,
	`summary` text NOT NULL,
	`warning` text,
	`access_method` enum('web','api','cli','desktop','self-host','ide-extension') NOT NULL,
	`install_steps` json NOT NULL,
	`tags` json,
	`extra` json NOT NULL,
	`featured` boolean NOT NULL DEFAULT false,
	`updated_at` datetime(3) NOT NULL,
	`updated_by` varchar(100),
	CONSTRAINT `tools_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_tools_category_slug` UNIQUE(`category_key`,`slug`)
);
--> statement-breakpoint
ALTER TABLE `prompt_templates` ADD CONSTRAINT `prompt_templates_category_key_guides_category_key_fk` FOREIGN KEY (`category_key`) REFERENCES `guides`(`category_key`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_prompt_templates_category_order` ON `prompt_templates` (`category_key`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_tools_category_order` ON `tools` (`category_key`,`sort_order`);