-- Default services, contacts and opening hours (the values previously hard-coded in the site).
INSERT INTO `services` (`id`,`name`,`duration`,`price_cents`,`position`,`active`) VALUES ('corte','Corte de cabelo',30,NULL,0,1),('barba','Barba',30,NULL,1,1),('combo','Corte + barba',60,NULL,2,1);
--> statement-breakpoint
INSERT INTO `settings` (`key`,`value`) VALUES ('whatsapp','5546999073974'),('phone','5546999073974'),('hours','[{"closed":true,"periods":[]},{"closed":false,"periods":[[480,690],[810,1170]]},{"closed":false,"periods":[[480,690],[810,1170]]},{"closed":false,"periods":[[480,690],[810,1170]]},{"closed":false,"periods":[[480,690],[810,1170]]},{"closed":false,"periods":[[480,690],[810,1170]]},{"closed":false,"periods":[[480,690],[810,1020]]}]');
