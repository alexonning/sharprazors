CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`service` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bookings_date_start` ON `bookings` (`date`,`start`);