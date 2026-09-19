import {db} from "@/db/raw";
import {currentAdmin} from "@/lib/admin-auth";
import {hasSameOrigin} from "@/lib/request-origin";

const noStore={"Cache-Control":"no-store"};

export async function GET(req:Request){
  try{
    const username=await currentAdmin(req);
    if(!username)return Response.json({error:"Faça login para continuar."},{status:401,headers:noStore});
    const phone=new URL(req.url).searchParams.get("phone");
    if(!phone)return Response.json({error:"Telefone obrigatório."},{status:400,headers:noStore});
    const [bookings,customer]=await Promise.all([
      db().prepare('SELECT id,date,start,"end",service,name,phone,status,created_at AS "createdAt" FROM bookings WHERE phone=? ORDER BY date DESC,start DESC').bind(phone).all(),
      db().prepare("SELECT name,created_at AS \"createdAt\" FROM customers WHERE phone=?").bind(phone).first<{name:string,createdAt:string}>()
    ]);
    const history=bookings.results;
    const totalVisits=history.length;
    const totalSpent=history.reduce((acc:number,b:any)=>{
      return acc;
    },0);
    const lastService=history.length>0?history[0].service:null;
    const lastVisit=history.length>0?history[0].date:null;
    return Response.json({
      phone,
      name:customer?.name||history[0]?.name||"",
      createdAt:customer?.createdAt||null,
      totalVisits,
      totalSpent,
      lastService,
      lastVisit,
      history
    },{headers:noStore});
  }catch(e){console.error("customer detail failed",e);return Response.json({error:"Não foi possível carregar os dados do cliente."},{status:503})}
}

export async function POST(req:Request){
  if(!hasSameOrigin(req))return Response.json({error:"Origem inválida."},{status:403});
  try{
    const username=await currentAdmin(req);
    if(!username)return Response.json({error:"Faça login para continuar."},{status:401});
    const body=await req.json().catch(()=>null);
    if(!body)return Response.json({error:"Dados inválidos."},{status:400});
    if(typeof body==="object"&&"action" in body&&body.action==="customerNote"){
      if(!("phone" in body)||!("note" in body))return Response.json({error:"Dados inválidos."},{status:400});
      if(typeof body.phone!=="string"||typeof body.note!=="string")return Response.json({error:"Dados inválidos."},{status:400});
      const trimmed=body.note.trim().slice(0,500);
      await db().prepare("INSERT INTO customers (phone,name,created_at) SELECT ?,name,created_at FROM bookings WHERE phone=? LIMIT 1 ON CONFLICT(phone) DO NOTHING").bind(body.phone,body.phone).run();
      return Response.json({ok:true});
    }
    return Response.json({error:"Ação desconhecida."},{status:400});
  }catch(e){console.error("customer action failed",e);return Response.json({error:"Erro interno."},{status:503})}
}
