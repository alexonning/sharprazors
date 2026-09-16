export type Period=[number,number];
export type DayHours={closed:boolean,periods:Period[]};
export type Service={id:string,name:string,duration:number,priceCents:number|null};
export type Block={id:string,date:string,start:number,end:number,reason:string};
export type BlockedPhone={phone:string,reason:string,createdAt:string};
export type SiteConfig={whatsapp:string,phone:string,hours:DayHours[],services:Service[]};
export const weekdays=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const open=(periods:Period[]):DayHours=>({closed:false,periods});
// Used only when the stored schedule is missing or malformed. Index 0 is Sunday.
export const defaultHours:DayHours[]=[{closed:true,periods:[]},open([[480,690],[810,1170]]),open([[480,690],[810,1170]]),open([[480,690],[810,1170]]),open([[480,690],[810,1170]]),open([[480,690],[810,1170]]),open([[480,690],[810,1020]])];
export const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export function validDate(date:string){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&!isNaN(Date.parse(date))&&new Date(date+"T12:00:00Z").toISOString().slice(0,10)===date&&date>=today()&&Date.parse(date)<=Date.now()+90*86400000}
export function validHours(value:unknown):value is DayHours[]{return Array.isArray(value)&&value.length===7&&value.every(day=>typeof day?.closed==="boolean"&&Array.isArray(day.periods)&&day.periods.length<=4&&day.periods.every((p:unknown)=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isInteger(n)&&n>=0&&n<=1440)&&p[0]<p[1]))}
export function slots(date:string,duration:number,hours:DayHours[],blocks:{start:number,end:number}[]=[]){if(!validDate(date))return [];const day=hours[new Date(date+"T12:00:00Z").getUTCDay()];if(!day||day.closed)return [];const result=new Set<number>();for(const [start,end] of day.periods)for(let t=start;t+duration<=end;t+=15){if(!blocks.some(b=>t<b.end&&t+duration>b.start)&&new Date(date+"T"+time(t)+":00-03:00").getTime()>Date.now())result.add(t)}return [...result].sort((a,b)=>a-b)}
export function time(n:number){return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}
export function minutes(value:string){const match=/^(\d{2}):(\d{2})$/.exec(value);if(!match||Number(match[2])>59)return null;const total=Number(match[1])*60+Number(match[2]);return total<=1440?total:null}
export function price(cents:number|null){return cents===null?"Valor sob consulta":(cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
// Groups consecutive days (Monday first) that share the same schedule, e.g. "Segunda a sexta".
export function hoursSummary(hours:DayHours[]){const groups:{days:number[],closed:boolean,periods:Period[]}[]=[];for(const index of [1,2,3,4,5,6,0]){const day=hours[index],closed=day.closed||day.periods.length===0,last=groups[groups.length-1];if(last&&last.closed===closed&&(closed||JSON.stringify(last.periods)===JSON.stringify(day.periods)))last.days.push(index);else groups.push({days:[index],closed,periods:day.periods})}return groups.map(({days,closed,periods})=>{const first=weekdays[days[0]],last=weekdays[days[days.length-1]].toLowerCase();return {label:days.length===1?first:`${first} ${days.length===2?"e":"a"} ${last}`,closed,periods}})}
