type Appointment = { date: string; end: number };

export function filterCustomers<T extends {name:string}>(bookings:T[], names:string[]) {
  return names.length ? bookings.filter(booking=>names.includes(booking.name)) : bookings;
}

export function agendaTitle(date: string, today: string) {
  if (date === today) return "Agenda de Hoje";
  const tomorrow = new Date(today + "T12:00:00Z");
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (date === tomorrow.toISOString().slice(0, 10)) return "Agenda de amanhã";
  return `Agenda de ${date.split("-").reverse().join("/")}`;
}

export function isPastAppointment(booking: Appointment, today: string, now: number) {
  return booking.date < today || (booking.date === today && booking.end <= now);
}

export function agendaHistory<T extends Appointment>(bookings: T[], today: string, now: number, expanded: boolean) {
  const past = bookings.filter(booking => isPastAppointment(booking, today, now));
  const latest = past.reduce<T | undefined>((last, booking) =>
    !last || booking.end >= last.end ? booking : last, undefined);
  return {
    hiddenCount: Math.max(0, past.length - 1),
    visible: expanded ? bookings : bookings.filter(booking =>
      booking === latest || !isPastAppointment(booking, today, now)),
  };
}
