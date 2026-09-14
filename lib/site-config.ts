import {db} from "@/db/raw";
import {defaultHours,validHours,type Block,type Service,type SiteConfig} from "@/lib/booking";
export async function loadConfig():Promise<SiteConfig>{
  const [settings,services]=await db().batch<Record<string,unknown>>([
    db().prepare("SELECT key,value FROM settings"),
    db().prepare('SELECT id,name,duration,price_cents AS "priceCents" FROM services WHERE active=1 ORDER BY position,name')
  ]);
  const values=new Map((settings.results as {key:string,value:string}[]).map(row=>[row.key,row.value]));
  let hours=defaultHours;
  try{const parsed=JSON.parse(values.get("hours")??"null");if(validHours(parsed))hours=parsed}catch{}
  return {whatsapp:values.get("whatsapp")??"",phone:values.get("phone")??"",hours,services:services.results as Service[]};
}
export async function blocksOn(date:string){return (await db().prepare('SELECT id,date,start,"end",reason FROM schedule_blocks WHERE date=?').bind(date).all<Block>()).results}
