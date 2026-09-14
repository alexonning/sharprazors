import { db } from "./raw";
export async function findCustomer(phone: string): Promise<{ name: string } | null> {
  const current = await db().prepare("SELECT name FROM customers WHERE phone = ?").bind(phone).first<{name:string}>();
  if (current) return current;
  // Recognize bookings created before the customer registry was introduced.
  return db().prepare("SELECT name FROM bookings WHERE phone IN (?, ?) ORDER BY created_at DESC LIMIT 1").bind(phone, phone.slice(2)).first<{name:string}>();
}
// The message never says the number is blacklisted; it points the customer to the shop's WhatsApp.
export const blockedPhoneError = "Não foi possível agendar com este telefone. Entre em contato com a barbearia pelo WhatsApp.";
export const blockedPhoneCode = "PHONE_BLOCKED";
export async function isPhoneBlocked(phone: string) {
  return !!(await db().prepare("SELECT 1 FROM blocked_phones WHERE phone = ?").bind(phone).first());
}
