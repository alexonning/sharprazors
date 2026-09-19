UPDATE `bookings` SET
  `price_cents`=COALESCE(`price_cents`,(
    SELECT `price_cents` FROM `services` WHERE `services`.`id`=`bookings`.`service`
  )),
  `snapshot_version`=1
WHERE `snapshot_version`=0;
