INSERT INTO `settings` (`key`,`value`) VALUES ('booking_window_days','30') ON CONFLICT(`key`) DO NOTHING;--> statement-breakpoint
INSERT INTO `settings` (`key`,`value`) VALUES ('min_advance_minutes','30') ON CONFLICT(`key`) DO NOTHING;
