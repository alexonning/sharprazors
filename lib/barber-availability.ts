export type AvailableBarber = { id: string; name: string };
export type BusyBooking = { start: number; end: number; barber: string; status: string };

export function freeBarbers(start: number, duration: number, barbers: AvailableBarber[], bookings: BusyBooking[]) {
  return barbers.filter(barber => !bookings.some(booking =>
    !["cancelado", "nao_compareceu"].includes(booking.status) &&
    start < booking.end && start + duration > booking.start &&
    // Old reservations did not assign a professional. Reserve the first one
    // until the next booking transaction persists that assignment.
    (booking.barber === barber.id || (booking.barber === "qualquer" && barber.id === barbers[0]?.id))));
}

export function defaultBarber(barbers: AvailableBarber[]) {
  return barbers.length === 1 ? barbers[0].id : "qualquer";
}

export const assignLegacyBookingsSql = `UPDATE bookings SET barber =
  (SELECT id FROM barbers WHERE active=1 AND id<>'qualquer' ORDER BY position,name,id LIMIT 1)
  WHERE date=? AND barber='qualquer'
  AND EXISTS (SELECT 1 FROM barbers WHERE active=1 AND id<>'qualquer')`;

// This statement runs in a serialized booking batch: check and assignment are
// one write, including when the customer chooses any available professional.
export const reserveBarberSql = `INSERT INTO bookings (id,date,start,"end",service,name,phone,barber,created_at)
  SELECT ?,?,CAST(? AS INTEGER),CAST(? AS INTEGER),?,?,?,b.id,?
  FROM barbers b WHERE b.active=1 AND b.id<>'qualquer' AND (?='qualquer' OR b.id=?)
  AND NOT EXISTS (SELECT 1 FROM bookings existing
    WHERE existing.date=? AND existing.barber=b.id
    AND existing.status NOT IN ('cancelado','nao_compareceu')
    AND existing.start < ? AND existing."end" > ?)
  ORDER BY b.position,b.name,b.id LIMIT 1`;
