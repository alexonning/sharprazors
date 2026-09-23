import {db} from "@/db/raw";
import {DEFAULT_BOOKING_WINDOW_DAYS,DEFAULT_MIN_ADVANCE_MINUTES,defaultHours,validHours,type Block,type Service,type SiteConfig} from "@/lib/booking";
function integerSetting(value:string|undefined,fallback:number,min:number,max:number){const parsed=Number(value);return Number.isInteger(parsed)&&parsed>=min&&parsed<=max?parsed:fallback}
export async function loadConfig():Promise<SiteConfig>{
  const [settings,services]=await db().batch<Record<string,unknown>>([
    db().prepare("SELECT key,value FROM settings"),
    db().prepare('SELECT id,name,duration,price_cents AS "priceCents" FROM services WHERE active=1 ORDER BY position,name')
  ]);
  const values=new Map((settings.results as {key:string,value:string}[]).map(row=>[row.key,row.value]));
  let hours=defaultHours;
  try{const parsed=JSON.parse(values.get("hours")??"null");if(validHours(parsed))hours=parsed}catch{}
  return {whatsapp:values.get("whatsapp")??"",phone:values.get("phone")??"",hours,services:services.results as Service[],bookingWindowDays:integerSetting(values.get("booking_window_days"),DEFAULT_BOOKING_WINDOW_DAYS,1,365),minAdvanceMinutes:integerSetting(values.get("min_advance_minutes"),DEFAULT_MIN_ADVANCE_MINUTES,5,60)};
}
export async function blocksOn(date:string){return (await db().prepare('SELECT id,date,start,"end",reason FROM schedule_blocks WHERE date=?').bind(date).all<Block>()).results}
