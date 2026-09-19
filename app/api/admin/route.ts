import {db} from "@/db/raw";
import {currentAdmin,hashPassword,login,logout,readToken,sessionCookie,tokenHash,verifyPassword} from "@/lib/admin-auth";
import {normalizePhone} from "@/lib/phone";
import {today,validDate,validHours,type Block,type BlockedPhone} from "@/lib/booking";
import {loadConfig} from "@/lib/site-config";
import {hasSameOrigin} from "@/lib/request-origin";
import {bookingHistoryColumns,type Booking} from "@/lib/booking-history";

const noStore={"Cache-Control":"no-store"};
const fail=(error:string,status=400)=>Response.json({error},{status,headers:noStore});
const ok=(data:object,headers:Record<string,string>={})=>Response.json(data,{headers:{...noStore,...headers}});
const setting=(key:string,value:string)=>db().prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key,value);

function buildServiceColors(services:{id:string}[]):Record<string,string>{
  const hues=["210","270","140","340","30"];
  const map:Record<string,string>={};
  services.forEach((s,i)=>{map[s.id]=hues[i%hues.length]});
  return map;
}

async function dashboard(username:string){
  const [config,blocks,blockedPhones,bookings,barbers,customerRows]=await Promise.all([
    loadConfig(),
    db().prepare('SELECT id,date,start,"end",reason FROM schedule_blocks WHERE date >= ? ORDER BY date,start').bind(today()).all<Block>(),
    db().prepare('SELECT phone,reason,created_at AS "createdAt" FROM blocked_phones ORDER BY created_at DESC').all<BlockedPhone>(),
    db().prepare(`SELECT ${bookingHistoryColumns} FROM bookings ORDER BY date,start`).all<Booking>(),
    db().prepare('SELECT id,name,active,position FROM barbers ORDER BY position,name').all(),
    db().prepare('SELECT phone,name,created_at AS "createdAt" FROM customers ORDER BY name,phone').all<{phone:string,name:string,createdAt:string}>()
  ]);
  const services=config.services||[];
  const customers=new Map<string,{phone:string,name:string,createdAt:string|null}>();
  for(const booking of bookings.results){
    if(!customers.has(booking.phone))customers.set(booking.phone,{phone:booking.phone,name:booking.name,createdAt:booking.createdAt});
  }
  for(const customer of customerRows.results){
    const existing=customers.get(customer.phone);
    customers.set(customer.phone,{phone:customer.phone,name:customer.name||existing?.name||"",createdAt:customer.createdAt||existing?.createdAt||null});
  }
  return {username,...config,blocks:blocks.results,blockedPhones:blockedPhones.results,bookings:bookings.results,barbers:barbers.results,customers:[...customers.values()].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")||a.phone.localeCompare(b.phone)),serviceColors:buildServiceColors(services)};
}

export async function GET(req:Request){
  try{
    const username=await currentAdmin(req);
    if(!username)return fail("Faça login para continuar.",401);
    return ok(await dashboard(username));
  }catch(e){console.error("admin load failed",e);return fail("Não foi possível carregar o painel.",503)}
}

export async function POST(req:Request){
  if (!hasSameOrigin(req))return fail("Origem inválida.",403);
  let body:any;
  try{body=await req.json()}catch{return fail("Dados inválidos.")}
  try{
    if(body?.action==="login"){
      const username=typeof body.username==="string"?body.username.trim():"",password=typeof body.password==="string"?body.password:"";
      const token=username&&password.length<=200?await login(username,password):null;
      if(!token)return fail("Usuário ou senha inválidos.",401);
      return ok({ok:true},{"Set-Cookie":sessionCookie(req,token)});
    }
    const username=await currentAdmin(req);
    if(!username)return fail("Sua sessão expirou. Faça login novamente.",401);
    switch(body?.action){
      case "logout":
        await logout(req);
        return ok({ok:true},{"Set-Cookie":sessionCookie(req,"",0)});
      case "contact":{
        const whatsapp=normalizePhone(body.whatsapp),phone=normalizePhone(body.phone);
        if(!whatsapp||!phone)return fail("Informe WhatsApp e telefone brasileiros válidos, com DDD.");
        await db().batch([setting("whatsapp",whatsapp),setting("phone",phone)]);
        break;
      }
      case "hours":{
        const input:unknown=body.hours;
        if(!validHours(input))return fail("Confira os horários: cada período precisa começar antes de terminar.");
        const hours=input.map(day=>({closed:day.closed,periods:[...day.periods].sort((a,b)=>a[0]-b[0])}));
        if(hours.some(day=>!day.closed&&day.periods.length===0))return fail("Adicione ao menos um período nos dias abertos ou marque o dia como fechado.");
        if(hours.some(day=>day.periods.some((p,i)=>i>0&&p[0]<day.periods[i-1][1])))return fail("Os períodos de um mesmo dia não podem se sobrepor.");
        await setting("hours",JSON.stringify(hours)).run();
        break;
      }
      case "services":{
        const list=Array.isArray(body.services)?body.services:[];
        if(!list.length||list.length>30)return fail("Cadastre entre 1 e 30 serviços.");
        const services=[];
        for(const item of list){
          const name=typeof item?.name==="string"?item.name.trim().replace(/\s+/g," "):"";
          const {duration}=item??{},priceCents=item?.priceCents??null;
          const id=typeof item?.id==="string"&&/^[a-z0-9-]{1,64}$/.test(item.id)?item.id:crypto.randomUUID();
          if(name.length<2||name.length>60)return fail("Cada serviço precisa de um nome entre 2 e 60 caracteres.");
          if(!Number.isInteger(duration)||duration<10||duration>480||duration%5)return fail(`Duração inválida em "${name}". Use minutos múltiplos de 5, entre 10 e 480.`);
          if(priceCents!==null&&(!Number.isInteger(priceCents)||priceCents<0||priceCents>10000000))return fail(`Valor inválido em "${name}".`);
          services.push({id,name,duration,priceCents});
        }
        // Removed services are deactivated, not deleted, so existing bookings keep their reference.
        await db().batch([
          db().prepare("UPDATE services SET active=0"),
          ...services.map((s,i)=>db().prepare("INSERT INTO services (id,name,duration,price_cents,position,active) VALUES (?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET name=excluded.name,duration=excluded.duration,price_cents=excluded.price_cents,position=excluded.position,active=1").bind(s.id,s.name,s.duration,s.priceCents,i))
        ]);
        break;
      }
      case "addBlock":{
        const {date,start,end}=body,reason=typeof body.reason==="string"?body.reason.trim().slice(0,80):"";
        if(typeof date!=="string"||!validDate(date))return fail("Escolha uma data entre hoje e os próximos 90 dias.");
        if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>1440||start>=end)return fail("O horário de início precisa ser anterior ao horário de fim.");
        await db().prepare('INSERT INTO schedule_blocks (id,date,start,"end",reason,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),date,start,end,reason,new Date().toISOString()).run();
        break;
      }
      case "deleteBlock":
        if(typeof body.id!=="string")return fail("Ausência inválida.");
        await db().prepare("DELETE FROM schedule_blocks WHERE id=?").bind(body.id).run();
        break;
      case "password":{
        const current=typeof body.current==="string"?body.current:"",next=typeof body.next==="string"?body.next:"";
        if(next.length<8||next.length>200)return fail("A nova senha precisa ter entre 8 e 200 caracteres.");
        const user=await db().prepare("SELECT password_hash AS hash FROM admin_users WHERE username=?").bind(username).first<{hash:string}>();
        if(!user||!await verifyPassword(current,user.hash))return fail("Senha atual incorreta.");
        // Keep this session and sign out every other device.
        await db().batch([
          db().prepare("UPDATE admin_users SET password_hash=?,updated_at=? WHERE username=?").bind(await hashPassword(next),new Date().toISOString(),username),
          db().prepare("DELETE FROM admin_sessions WHERE username=? AND token_hash<>?").bind(username,await tokenHash(readToken(req)??""))
        ]);
        break;
      }
      case "blockPhone":{
        const phone=normalizePhone(body.phone),reason=typeof body.reason==="string"?body.reason.trim().slice(0,120):"";
        if(!phone)return fail("Informe um telefone brasileiro válido, com DDD.");
        const result=await db().prepare("INSERT INTO blocked_phones (phone,reason,created_at) VALUES (?,?,?) ON CONFLICT(phone) DO NOTHING").bind(phone,reason,new Date().toISOString()).run();
        if(!result.meta.changes)return fail("Este telefone já está na lista de bloqueio.");
        break;
      }
      case "unblockPhone":
        if(typeof body.phone!=="string")return fail("Telefone inválido.");
        await db().prepare("DELETE FROM blocked_phones WHERE phone=?").bind(body.phone).run();
        break;
      case "updateCustomer":{
        const currentPhone=normalizePhone(body.currentPhone),phone=normalizePhone(body.phone);
        const name=typeof body.name==="string"?body.name.trim().replace(/\s+/g," "):"";
        if(!currentPhone||!phone)return fail("Informe um telefone brasileiro válido, com DDD.");
        if(name.length<2||name.length>100)return fail("O nome do cliente deve ter entre 2 e 100 caracteres.");
        if(currentPhone!==phone){
          const taken=await db().prepare("SELECT phone FROM customers WHERE phone=?").bind(phone).first<{phone:string}>();
          if(taken)return fail("Este telefone já está cadastrado para outro cliente.");
        }
        const existing=await db().prepare("SELECT phone FROM customers WHERE phone=?").bind(currentPhone).first<{phone:string}>();
        if(existing)await db().prepare("UPDATE customers SET phone=?,name=? WHERE phone=?").bind(phone,name,currentPhone).run();
        else await db().prepare("INSERT INTO customers (phone,name,created_at) VALUES (?,?,?)").bind(phone,name,new Date().toISOString()).run();
        break;
      }
      case "updateBookingStatus":{
        if(typeof body.id!=="string")return fail("Agendamento inválido.");
        const validStatuses=["agendado","confirmado","em_atendimento","finalizado","cancelado","nao_compareceu"];
        const newStatus=typeof body.status==="string"?body.status:"";
        if(!validStatuses.includes(newStatus))return fail("Status inválido.");
        await db().prepare("UPDATE bookings SET status=? WHERE id=?").bind(newStatus,body.id).run();
        break;
      }
      case "addBarber":{
        const barberName=typeof body.name==="string"?body.name.trim().replace(/\s+/g," "):"";
        if(barberName.length<2||barberName.length>60)return fail("Nome do barbeiro deve ter entre 2 e 60 caracteres.");
        const id=barberName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+Date.now();
        const maxPos=(await db().prepare("SELECT COALESCE(MAX(position),0) AS p FROM barbers").first<{p:number}>())?.p??0;
        await db().prepare("INSERT INTO barbers (id,name,active,position,created_at) VALUES (?,?,1,?,?)").bind(id,barberName,maxPos+1,new Date().toISOString()).run();
        break;
      }
      case "editBarber":{
        if(typeof body.id!=="string"||body.id==="qualquer")return fail("Barbeiro inválido.");
        const editName=typeof body.name==="string"?body.name.trim().replace(/\s+/g," "):"";
        if(editName.length<2||editName.length>60)return fail("Nome do barbeiro deve ter entre 2 e 60 caracteres.");
        await db().prepare("UPDATE barbers SET name=? WHERE id=?").bind(editName,body.id).run();
        break;
      }
      case "toggleBarber":{
        if(typeof body.id!=="string"||body.id==="qualquer")return fail("Barbeiro inválido.");
        await db().prepare("UPDATE barbers SET active=CASE WHEN active=1 THEN 0 ELSE 1 END WHERE id=?").bind(body.id).run();
        break;
      }
      case "deleteBarber":{
        if(typeof body.id!=="string"||body.id==="qualquer")return fail("Barbeiro inválido.");
        await db().prepare("DELETE FROM barbers WHERE id=? AND id<>'qualquer'").bind(body.id).run();
        break;
      }
      default:
        return fail("Ação desconhecida.");
    }
    return ok(await dashboard(username));
  }catch(e){console.error("admin action failed",e);return fail("Não foi possível salvar. Tente novamente.",503)}
}
