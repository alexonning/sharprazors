import { normalizePhone } from "@/lib/phone";
import { blockedPhoneCode, blockedPhoneError, findCustomer, isPhoneBlocked } from "@/db/customers";
import {db} from "@/db/raw";
import {slots,validDate} from "@/lib/booking";
import {blocksOn,loadConfig} from "@/lib/site-config";
import {hasSameOrigin} from "@/lib/request-origin";
export async function GET(req:Request){try{const q=new URL(req.url).searchParams;const date=q.get("date")||"";const config=await loadConfig();const service=config.services.find(s=>s.id===q.get("service"));if(!service||!validDate(date))return Response.json({error:"Selecione uma data válida nos próximos 90 dias."},{status:400});const [rows,blocks]=await Promise.all([db().prepare('SELECT start,"end" FROM bookings WHERE date = ?').bind(date).all<{start:number,end:number}>(),blocksOn(date)]);return Response.json({slots:slots(date,service.duration,config.hours,blocks).filter(t=>!rows.results.some(b=>t<b.end&&t+service.duration>b.start))},{headers:{"Cache-Control":"no-store"}})}catch(e){console.error("availability",e);return Response.json({error:"Não foi possível carregar a agenda. Tente novamente."},{status:503})}}
export async function POST(req: Request) {
  if (!hasSameOrigin(req))
    return Response.json({ error: "Origem inválida" }, { status: 403 });
  let body:any;
  try { body = await req.json(); } catch { return Response.json({ error: "Dados inválidos." }, { status: 400 }); }
  const { date, start, service: serviceId } = body || {};
  const phone = normalizePhone(body?.phone);
  try {
    const config = await loadConfig();
    const service = config.services.find(s => s.id === serviceId);
    if (!phone || typeof date !== "string" || !service || !Number.isInteger(start) || !slots(date, service.duration, config.hours, await blocksOn(date)).includes(start))
      return Response.json({ error: "Confira telefone e horário selecionado." }, { status: 400 });
    if (await isPhoneBlocked(phone))
      return Response.json({ error: blockedPhoneError, code: blockedPhoneCode }, { status: 403 });
    const customer = await findCustomer(phone);
    const name = customer?.name ?? (typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "");
    if (name.length < 3 || name.length > 100)
      return Response.json({ error: "Informe seu nome para registrar este telefone.", code: "NAME_REQUIRED" }, { status: 400 });
    const id = crypto.randomUUID(), end = start + service.duration, now = new Date().toISOString();
    const results = await db().batch([
      db().prepare('INSERT INTO bookings (id,date,start,"end",service,name,phone,created_at) SELECT ?,?,CAST(? AS INTEGER),CAST(? AS INTEGER),?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE date=? AND start < ? AND "end" > ?)')
        .bind(id, date, start, end, service.id, name, phone, now, date, end, start),
      db().prepare("INSERT INTO customers (phone,name,created_at) SELECT phone,name,created_at FROM bookings WHERE id=? ON CONFLICT(phone) DO NOTHING").bind(id)
    ]);
    if (!results[0].meta.changes)
      return Response.json({ error: "Esse horário acabou de ser reservado. Escolha outro horário." }, { status: 409 });
    return Response.json({ id, date, start, service: service.name }, { status: 201 });
  } catch (e) {
    console.error("booking failed", e);
    return Response.json({ error: "Não foi possível salvar. Tente novamente." }, { status: 503 });
  }
}
