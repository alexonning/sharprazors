import { db } from "./raw";
export async function findCustomer(phone: string): Promise<{ name: string } | null> {
  const current = await db().prepare("SELECT name FROM customers WHERE phone = ?").bind(phone).first<{name:string}>();
  if (current) return current;
  // Recognize bookings created before the customer registry was introduced.
  return db().prepare("SELECT name FROM bookings WHERE phone IN (?, ?) ORDER BY created_at DESC LIMIT 1").bind(phone, phone.slice(2)).first<{name:string}>();
}
