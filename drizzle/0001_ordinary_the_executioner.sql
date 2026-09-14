CREATE TABLE `customers` (
	`phone` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bookings_phone` ON `bookings` (`phone`);