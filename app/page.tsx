"use client";
import {Fragment,useEffect,useState,useRef} from "react";
import {Scissors,Clock,ArrowRight,ArrowLeft,Check,CalendarDays,ShieldCheck,ChevronRight,ChevronUp,ChevronDown,MapPin,Phone} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {Select,SelectContent,SelectGroup,SelectItem,SelectLabel,SelectTrigger,SelectValue} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import {PhoneInput} from "@/components/phone-input";
import {DateCalendar} from "@/components/date-calendar";
import {defaultBarber,type AvailableBarber} from "@/lib/barber-availability";
import {normalizePhone,formatPhone} from "@/lib/phone";
import {today,time,price,hoursSummary,type SiteConfig} from "@/lib/booking";
function Instagram({size=24}:{size?:number}){
return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none"/></svg>;
}
function WhatsApp({size=24}:{size?:number}){
return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>;
}
const MAP_URL="https://maps.app.goo.gl/57Cuf1TnEqRr7Qiw5";
const MAP_EMBED_URL="https://www.google.com/maps?q=-25.670698,-53.808721&z=17&output=embed";
const whatsappUrl=(number:string)=>"https://wa.me/"+number;
function TimeWheel({values,value,onChange}:{values:number[],value:number|null,onChange:(v:number)=>void}){
const rail=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
const active=value===null?0:Math.max(0,values.indexOf(value));
useEffect(()=>{const index=value===null?0:Math.max(0,values.indexOf(value));if(rail.current)rail.current.scrollTop=index*56;if(value===null&&values.length)onChange(values[0]);return()=>{if(timer.current)clearTimeout(timer.current)}},[values]);
function choose(index:number){const i=Math.max(0,Math.min(values.length-1,index));if(timer.current)clearTimeout(timer.current);onChange(values[i]);rail.current?.scrollTo({top:i*56,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})}
return <div className="time-picker"><div className="wheel-label"><span>HORÁRIO</span><span>{values.length} disponíveis</span></div><div className="wheel-layout"><div className="wheel-frame"><div className="wheel-guide" aria-hidden="true"/><div ref={rail} className="wheel" role="listbox" aria-label="Horário do atendimento" aria-activedescendant={"slot-"+values[active]} tabIndex={0} onKeyDown={e=>{if(["ArrowUp","ArrowDown","Home","End"].includes(e.key)){e.preventDefault();choose(e.key==="Home"?0:e.key==="End"?values.length-1:active+(e.key==="ArrowDown"?1:-1))}}} onScroll={()=>{if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{if(rail.current){const i=Math.max(0,Math.min(values.length-1,Math.round(rail.current.scrollTop/56)));onChange(values[i])}},100)}}>{values.map((t,i)=><div id={"slot-"+t} key={t} role="option" aria-selected={value===t} className={"wheel-option "+(value===t?"chosen":"")} onClick={()=>choose(i)}>{time(t)}</div>)}</div></div><div className="wheel-controls"><Button variant="outline" size="icon" onClick={()=>choose(active-1)} disabled={active===0} aria-label="Horário anterior"><ChevronUp/></Button><span>{value!==null&&value<720?"Manhã":"Tarde"}</span><Button variant="outline" size="icon" onClick={()=>choose(active+1)} disabled={active===values.length-1} aria-label="Próximo horário"><ChevronDown/></Button></div></div><p className="wheel-help">Role para escolher ou use as setas.</p></div>
}
export default function Home(){
const [service,setService]=useState<string[]>(["corte"]),[step,setStep]=useState(0),[date,setDate]=useState(today()),[slot,setSlot]=useState<number|null>(null),[available,setAvailable]=useState<number[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(""),[name,setName]=useState(""),[phone,setPhone]=useState(""),[saving,setSaving]=useState(false),[booking,setBooking]=useState<string|null>(null),[reload,setReload]=useState(0);
const [barber,setBarber]=useState("qualquer"),[barbersList,setBarbersList]=useState<{id:string,name:string}[]>([]);
const [availability,setAvailability]=useState<{start:number,barbers:AvailableBarber[]}[]>([]);
const slotBarbers=availability.find(option=>option.start===slot)?.barbers??[];
function chooseSlot(value:number){if(value!==slot){setSlot(value);setBarber(defaultBarber(availability.find(option=>option.start===value)?.barbers??[]))}}
const [customerState,setCustomerState]=useState<"unknown"|"existing"|"new">("unknown");
const [site,setSite]=useState<SiteConfig|null>(null),[siteError,setSiteError]=useState(""),[blocked,setBlocked]=useState(false),[conflict,setConflict]=useState(false);
const panelRef=useRef<HTMLDivElement>(null);
useEffect(()=>{
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const animation=panelRef.current?.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)'});
 return()=>animation?.cancel();
},[step,booking]);
useEffect(()=>{fetch("/api/site",{cache:"no-store"}).then(async r=>{const d=await r.json() as SiteConfig&{error?:string};if(!r.ok)throw Error(d.error);setSite(d);setService(current=>{const valid=current.filter(id=>d.services.some(s=>s.id===id));return valid.length?valid:(d.services[0]?.id?[d.services[0].id]:[])})}).catch(e=>setSiteError((e as Error).message||"Não foi possível carregar os dados da barbearia."))},[]);

const selected=site?.services.filter(s=>service.includes(s.id))??[];
const selectedNames=selected.map(s=>s.name).join(" + ");
const selectedDuration=selected.reduce((n,s)=>n+s.duration,0);
const selectedDurationLabel=selectedDuration>=60?`${Math.floor(selectedDuration/60)}h${selectedDuration%60?` ${selectedDuration%60}m`:""}`:`${selectedDuration} min`;
const selectedPrice=selected.some(s=>s.priceCents===null)?null:selected.reduce((n,s)=>n+(s.priceCents??0),0);
const serviceKey=service.join(",");
const autoDateRef=useRef(false);
useEffect(()=>{if(!selected.length)return;const abort=new AbortController();setLoading(true);setSlot(null);setBarber("qualquer");setAvailability([]);setAvailable([]);setError("");fetch(`/api/bookings?date=${date}&service=${serviceKey}`,{signal:abort.signal}).then(async r=>{const d=await r.json() as {error?:string,slots:number[],availability:{start:number,barbers:AvailableBarber[]}[],barbers:AvailableBarber[]};if(!r.ok)throw Error(d.error);setAvailable(d.slots);setAvailability(d.availability);setBarbersList(d.barbers)}).catch(e=>{if(e.name!=="AbortError"){setError(e.message);setAvailable([])}}).finally(()=>{if(!abort.signal.aborted)setLoading(false)});return()=>abort.abort()},[date,serviceKey,reload,site]);
  useEffect(()=>{autoDateRef.current=false},[serviceKey,reload]);
  useEffect(()=>{if(date!==today())autoDateRef.current=false},[date]);
  useEffect(()=>{
 if(!selected.length||date!==today()||loading||available.length||autoDateRef.current)return;
 autoDateRef.current=true;
 const abort=new AbortController();
 (async()=>{
  for(let offset=1;offset<=89;offset++){
   const candidate=new Date(today()+"T12:00:00");candidate.setDate(candidate.getDate()+offset);
   const candidateDate=candidate.toISOString().slice(0,10);
   try{
    const r=await fetch(`/api/bookings?date=${candidateDate}&service=${serviceKey}`,{signal:abort.signal});
    const d=await r.json() as {slots?:number[]};
    if(r.ok&&d.slots?.length){setDate(candidateDate);return;}
   }catch(e){if((e as Error).name==="AbortError")return;}
  }
  autoDateRef.current=false;
 })();
 return()=>abort.abort();
},[available.length,date,loading,selected.length,serviceKey]);
useEffect(()=>{const context=(document as any).modelContext;if(!site||!context?.registerTool)return;const life=new AbortController();Promise.resolve(context.registerTool({name:"select_booking_service",description:"Seleciona o serviço no formulário, sem criar uma reserva.",inputSchema:{type:"object",properties:{service:{type:"string",enum:site.services.map(s=>s.id)}},required:["service"],additionalProperties:false},annotations:{readOnlyHint:false},execute:async(input:any)=>{if(!site.services.some(s=>s.id===input.service))throw Error("Serviço inválido");setService([input.service]);setStep(0);return {selectedService:input.service}}},{signal:life.signal})).catch(()=>{});return()=>life.abort()},[site]);
async function submit(e:React.FormEvent){
 e.preventDefault();if(saving)return;setError("");setBlocked(false);setConflict(false);
 if(!normalizePhone(phone)){setError("Informe um telefone brasileiro válido com DDD.");return;}
 setSaving(true);
 try{
  if(customerState==="unknown"){
   const r=await fetch("/api/customers/lookup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone})});
   const d=await r.json() as {code?:string,error?:string,registered:boolean,name:string|null};if(!r.ok){if(d.code==="PHONE_BLOCKED")setBlocked(true);throw Error(d.error)}
   setName(d.name??"");setCustomerState(d.registered?"existing":"new");return;
  }
   const r=await fetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service:serviceKey,date,start:slot,barber,...(customerState==="new"?{name}:{}),phone})});
  const d=await r.json() as {code?:string,error?:string,barber:string,id:string};if(!r.ok){if(d.code==="NAME_REQUIRED")setCustomerState("new");if(d.code==="PHONE_BLOCKED")setBlocked(true);if(r.status===409){setConflict(true);setStep(1);setSlot(null);setReload(x=>x+1)}throw Error(d.error)}setBarber(d.barber);setBooking(d.id);
 }catch(e){setError((e as Error).message)}finally{setSaving(false)}
}
const prettyDate=new Date(date+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"long"});
return <div className="site"><header className="header"><a href="/" className="brand"><img src="/logo.png" alt="Barbearia Sharp Razors"/><span>SHARP RAZORS<small>BARBEARIA</small></span></a><nav><a className="active" href="#agendamento">Agendamento</a><a href="#horarios">Horários</a><a className="nav-location" href="#localizacao">Localização</a>{site?.whatsapp&&<a href={whatsappUrl(site.whatsapp)} target="_blank" rel="noreferrer" aria-label="WhatsApp da barbearia"><WhatsApp size={19}/></a>}<a href="https://www.instagram.com/barbeariasharprazors/" target="_blank" rel="noreferrer" aria-label="Instagram da barbearia"><Instagram size={19}/></a></nav></header>
<main><div className="intro"><p className="eyebrow">BARBEARIA SHARP RAZORS</p><h1>MARQUE SEU HORÁRIO<span>.</span></h1></div>
<div className="workspace" id="agendamento"><section className="booking-panel"><div className="steps">{["Serviço","Data e horário","Finalizar"].map((s,i)=><button key={s} disabled={i>step||!!booking||saving} onClick={()=>setStep(i)} className={i===step?"current":i<step?"done":""}><span>{i<step?<Check size={15}/>:"0"+(i+1)}</span>{s}{i<2&&<ChevronRight className="step-chevron" size={15}/>}</button>)}</div>
{booking?<div ref={panelRef} className="success"><div className="success-icon"><Check size={34}/></div><p className="eyebrow">TUDO CERTO</p><h2>Horário reservado!</h2><p>Seu agendamento está registrado.</p><div className="receipt"><strong>{selectedNames}</strong><span>{prettyDate} às {time(slot!)}</span><span>{barbersList.find(b=>b.id===barber)?.name||"Qualquer disponível"} · {selectedDurationLabel}</span><small>Comprovante: {booking.slice(0,8).toUpperCase()}</small></div><p className="fine">Guarde este comprovante. Para alterações, entre em contato com a barbearia pelo WhatsApp ou Instagram.</p><Button className="primary" onClick={()=>{setBooking(null);setStep(0);setName("");setPhone("");setBarber("qualquer");setCustomerState("unknown");setService(["corte"]);setReload(x=>x+1)}}>Fazer outro agendamento <ArrowRight/></Button></div>:<div ref={panelRef} className="panel-body">
<div className="section-heading"><p className="eyebrow">ETAPA 0{step+1} DE 03</p><h2>{["O que vai ser hoje?","Escolha o seu horário.","Finalizar."][step]}</h2><p>{["Escolha o serviço para o seu próximo atendimento.","Escolha a data, o horário e o barbeiro disponível.","Informe seus dados para confirmar o atendimento."][step]}</p></div>
{step===0&&(site?<><div className="service-picker-heading"><span>SERVIÇOS DISPONÍVEIS</span><span>{service.length} selecionado{service.length===1?"":"s"}</span></div><div className={"service-list"+(site.services.length>4?" is-scrollable":"")} role="group" aria-label="Serviços">{site.services.map((s,i)=>{const chosen=service.includes(s.id);return <label key={s.id} className={"service-card "+(chosen?"selected":"")} htmlFor={"service-"+s.id}><span className="service-number">{String(i+1).padStart(2,"0")}</span><div className="service-copy"><h3>{s.name}</h3><span className="duration"><Clock size={13}/>{s.duration} min <b>·</b> {price(s.priceCents)}</span></div><Checkbox checked={chosen} onCheckedChange={()=>setService(current=>chosen?current.filter(id=>id!==s.id):[...current,s.id])} id={"service-"+s.id} aria-label={`Selecionar ${s.name}`}/></label>})}</div><div className="service-total"><span>Total estimado</span><strong>{selectedPrice===null?"Valor sob consulta":price(selectedPrice)} · {selectedDurationLabel}</strong></div><div className="quiet-note"><ShieldCheck size={17}/> Você pode selecionar mais de um serviço.</div></>:<p className="loading-note" role={siteError?"alert":undefined}>{siteError||"Carregando serviços…"}</p>)}
{step===1&&<div className="date-selection"><label htmlFor="date">Data do atendimento</label><DateCalendar id="date" label="Data do atendimento" min={today()} max={new Date(Date.now()+89*86400000).toISOString().slice(0,10)} value={date} onChange={setDate}/><div className="availability" aria-live="polite">{loading?<p>Consultando horários⬦</p>:available.length===0?<div className="empty"><CalendarDays/><p>Nenhum horário disponível nesta data.</p><span>Selecione outro dia para continuar.</span></div>:<TimeWheel values={available} value={slot} onChange={chooseSlot}/>}</div><div className="barber-field">
<label htmlFor="booking-barber">Barbeiro</label>
<Select value={barber} onValueChange={setBarber} disabled={saving||loading||slot===null}>
<SelectTrigger id="booking-barber" className="w-full"><SelectValue placeholder="Selecione o barbeiro"/></SelectTrigger>
<SelectContent><SelectGroup><SelectLabel>Barbeiros</SelectLabel>
{slotBarbers.length!==1&&<SelectItem value="qualquer">Qualquer disponível</SelectItem>}
{slotBarbers.map((b)=><SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
</SelectGroup></SelectContent>
</Select>
</div>
<p className="fine">Horários de Brasília. Agendamentos com até 90 dias de antecedência.</p></div>}
{step===2&&<form id="booking-form" onSubmit={submit} className="details-form">
<label htmlFor="phone">Telefone com DDD</label>
<PhoneInput id="phone" describedBy="phone-help" disabled={saving} value={phone} onChange={value=>{setPhone(value);setCustomerState("unknown");setName("");setError("");setBlocked(false)}}/>
<p id="phone-help" className="phone-help">Use o mesmo número nos próximos agendamentos.</p>
<div aria-live="polite">
{customerState==="existing"&&<div className="customer-found"><Check size={20}/><div><strong>Bem vindo de volta {name}</strong><p>Confira o horário abaixo e confirme sua reserva.</p></div></div>}
{customerState==="new"&&<div className="new-customer"><p>Primeira vez com este telefone? Informe seu nome para o cadastro.</p><label htmlFor="name">Nome completo</label><Input id="name" autoComplete="name" placeholder="Seu nome completo" required minLength={3} maxLength={100} disabled={saving} value={name} onChange={e=>setName(e.target.value)}/></div>}
</div>
{customerState!=="unknown"&&<div className="confirmation-summary"><span>SEU AGENDAMENTO</span><strong>{selectedNames}</strong><p>{prettyDate} às {slot===null?"—":time(slot)} · {selectedDurationLabel} · {barbersList.find(b=>b.id===barber)?.name||"Qualquer disponível"}</p></div>}
<div className="contact-note"><ShieldCheck size={21}/><p>Seus dados serão usados pela barbearia para identificar e atender seu agendamento.</p></div>
</form>}

{(error||conflict)&&step>0&&<div className="error" role="alert">{conflict?<><strong>Esse horário acabou de ser reservado.</strong><p>Escolha outro horário disponível para concluir seu agendamento.</p><button onClick={()=>{setConflict(false);setError("");setSlot(null);setReload(x=>x+1);setStep(1)}}>Ver horários atualizados</button></>:<>{error}{step===1&&<button onClick={()=>setReload(x=>x+1)}>Tentar novamente</button>}</>}{blocked&&site?.whatsapp&&<a className="error-whatsapp" href={whatsappUrl(site.whatsapp)+"?text="+encodeURIComponent("Olá! Tentei agendar um horário pelo site e não consegui. Podem me ajudar?")} target="_blank" rel="noreferrer"><WhatsApp size={17}/>Falar no WhatsApp · {formatPhone(site.whatsapp)}<ArrowRight size={15}/></a>}</div>}
<div className="panel-footer"><span>{step===0?(site?.services.some(s=>s.priceCents===null)?"Preços sob consulta":"Valores por serviço"):<button className="back" disabled={saving} onClick={()=>setStep(step-1)}><ArrowLeft size={16}/> Voltar</button>}</span>{step<2?<Button className="primary" disabled={(step===0&&!selected.length)||(step===1&&(slot===null||loading))} onClick={()=>setStep(step+1)}>Continuar <ArrowRight size={18}/></Button>:<Button form="booking-form" type="submit" className="primary" disabled={saving}>{saving?(customerState==="unknown"?"Consultando⬦":"Reservando⬦"):(customerState==="unknown"?"Continuar com telefone":"Finalizar")}<Check size={18}/></Button>}</div>
</div>}</section>
<aside><section className="brand-card"><img src="/logo.png" alt="Logo Sharp Razors"/><p className="eyebrow">BARBEARIA</p><h2>NA RÉGUA.<br/>NO SEU TEMPO.</h2><div className="brand-divider"/><div className="appointment-summary"><span>SEU AGENDAMENTO</span>{selected.length>0&&<><div><Scissors size={17}/><strong>{selectedNames}</strong></div><div><Clock size={17}/>{selectedDurationLabel} · {barbersList.find(b=>b.id===barber)?.name||"Qualquer disponível"}</div></>}{slot!==null&&<div><CalendarDays size={17}/>{prettyDate}, {time(slot)}</div>}</div></section>
<section className="hours" id="horarios"><h3><Clock size={18}/> Horário de funcionamento</h3>{site?<dl>{hoursSummary(site.hours).map(g=><Fragment key={g.label}><dt>{g.label}</dt>{g.closed?<dd className="closed">Fechado</dd>:<dd>{time(g.periods[0][0])} – {time(g.periods[0][1])}{g.periods.slice(1).map(p=><span key={p[0]}>{time(p[0])} – {time(p[1])}</span>)}</dd>}</Fragment>)}</dl>:<p className="loading-note">{siteError||"Carregando horários⬦"}</p>}<a href="https://www.instagram.com/barbeariasharprazors/" target="_blank" rel="noreferrer"><Instagram size={17}/>@barbeariasharprazors <ArrowRight size={15}/></a>{site?.whatsapp&&<a href={whatsappUrl(site.whatsapp)} target="_blank" rel="noreferrer"><WhatsApp size={17}/>{formatPhone(site.whatsapp)} <ArrowRight size={15}/></a>}{site?.phone&&site.phone!==site.whatsapp&&<a href={"tel:+"+site.phone}><Phone size={17}/>{formatPhone(site.phone)} <ArrowRight size={15}/></a>}</section></aside></div>
<section className="location" id="localizacao"><div className="location-info"><p className="eyebrow">ONDE ESTAMOS</p><h2>VENHA NOS VISITAR<span>.</span></h2><p>Estamos te esperando na Barbearia Sharp Razors. Use o mapa para traçar sua rota.</p><a className="location-link" href={MAP_URL} target="_blank" rel="noreferrer"><MapPin size={17}/>Abrir no Google Maps <ArrowRight size={15}/></a>{site?.whatsapp&&<a className="location-link" href={whatsappUrl(site.whatsapp)} target="_blank" rel="noreferrer"><WhatsApp size={17}/>Falar no WhatsApp <ArrowRight size={15}/></a>}</div><div className="location-map"><iframe title="Mapa com a localização da Barbearia Sharp Razors" src={MAP_EMBED_URL} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/></div></section></main>
<footer><span>© {new Date().getFullYear()} Sharp Razors</span><span>Corte · Barba · Sharp Razors</span><span>BARBEARIA & ESTILO</span></footer></div>}
