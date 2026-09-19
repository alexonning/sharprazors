CREATE TABLE `barbers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `status` text DEFAULT 'agendado' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `barber` text DEFAULT 'qualquer' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `service_name` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `barber_name` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `duration_minutes` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `price_cents` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `snapshot_version` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
INSERT INTO barbers (id,name,active,position,created_at)
VALUES ('qualquer','Qualquer disponível',1,0,'2026-09-19T00:00:00.000Z');
--> statement-breakpoint
-- Freeze available labels once. Old prices were never stored; leave them unknown.
UPDATE bookings SET
  service_name=COALESCE(service_name,(SELECT name FROM services WHERE services.id=bookings.service),service),
  barber_name=COALESCE(barber_name,(SELECT name FROM barbers WHERE barbers.id=bookings.barber),barber),
  duration_minutes=COALESCE(duration_minutes,"end"-start)
WHERE service_name IS NULL OR barber_name IS NULL OR duration_minutes IS NULL;
