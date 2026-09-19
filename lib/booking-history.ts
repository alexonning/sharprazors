export type Booking = {
  id:string;date:string;start:number;end:number;service:string;name:string;phone:string;
  status:string;barber:string;serviceName:string;barberName:string;durationMinutes:number;
  priceCents:number|null;snapshotVersion:number;createdAt:string;
};

// Read the reservation itself: catalog changes must never rewrite its history.
export const bookingHistoryColumns = `id,date,start,"end",service,name,phone,status,barber,
  COALESCE(service_name,service) AS "serviceName",COALESCE(barber_name,barber) AS "barberName",
  COALESCE(duration_minutes,"end"-start) AS "durationMinutes",price_cents AS "priceCents",
  snapshot_version AS "snapshotVersion",created_at AS "createdAt"`;

export function bookingPrice(booking:Pick<Booking,"priceCents"|"snapshotVersion">) {
  if(booking.priceCents===null)return booking.snapshotVersion===0?"Valor não registrado":"Valor sob consulta";
  return (booking.priceCents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
}

export function completedRevenue(bookings:Pick<Booking,"status"|"priceCents">[]) {
  return bookings.reduce((total,booking)=>total+(booking.status==="finalizado"?(booking.priceCents??0):0),0);
}
