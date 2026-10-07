CREATE TABLE `news_tools` (
	`news_id` char(16) NOT NULL,
	`tool_id` int NOT NULL,
	CONSTRAINT `news_tools_news_id_tool_id_pk` PRIMARY KEY(`news_id`,`tool_id`)
);
--> statement-breakpoint
ALTER TABLE `news_tools` ADD CONSTRAINT `news_tools_news_id_news_items_id_fk` FOREIGN KEY (`news_id`) REFERENCES `news_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `news_tools` ADD CONSTRAINT `news_tools_tool_id_tools_id_fk` FOREIGN KEY (`tool_id`) REFERENCES `tools`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_news_tools_tool` ON `news_tools` (`tool_id`);