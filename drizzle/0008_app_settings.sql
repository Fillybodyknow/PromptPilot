CREATE TABLE `app_settings` (
	`key` varchar(64) NOT NULL,
	`value` varchar(1000) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`updated_by` varchar(320),
	CONSTRAINT `app_settings_key` PRIMARY KEY(`key`)
);
