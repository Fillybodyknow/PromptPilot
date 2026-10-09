CREATE TABLE `ai_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`at` datetime(3) NOT NULL,
	`feature` enum('news','tool_check','guide_check') NOT NULL,
	`provider` varchar(20) NOT NULL,
	`model` varchar(100) NOT NULL,
	`input_tokens` int NOT NULL DEFAULT 0,
	`output_tokens` int NOT NULL DEFAULT 0,
	`cost_usd` decimal(12,6),
	`ok` boolean NOT NULL,
	`error` varchar(500),
	`ref` varchar(200),
	CONSTRAINT `ai_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_ai_usage_at` ON `ai_usage` (`at`);