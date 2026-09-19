import { normalizePhone } from "@/lib/phone";
import { blockedPhoneCode, blockedPhoneError, findCustomer, isPhoneBlocked } from "@/db/customers";
import { hasSameOrigin } from "@/lib/request-origin";
export async function POST(req: Request) {
  if (!hasSameOrigin(req))
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Informe um telefone válido." }, { status: 400 }); }
  const phone = normalizePhone(body && typeof body === "object" && "phone" in body ? body.phone : undefined);
  if (!phone) return Response.json({ error: "Informe um telefone brasileiro válido com DDD." }, { status: 400 });
  try {
    if (await isPhoneBlocked(phone)) return Response.json({ error: blockedPhoneError, code: blockedPhoneCode }, { status: 403 });
    const customer = await findCustomer(phone);
    return Response.json({ registered: !!customer, name: customer?.name ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("customer lookup failed", e);
    return Response.json({ error: "Não foi possível consultar o cadastro. Tente novamente." }, { status: 503 });
  }
}
