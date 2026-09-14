CREATE TABLE `blocked_phones` (
	`phone` text PRIMARY KEY NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
