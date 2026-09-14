"use client";
import {useEffect,useState,useRef} from "react";
import {Scissors,Clock,ArrowRight,ArrowLeft,Check,CalendarDays,ShieldCheck,ChevronRight,ChevronUp,ChevronDown} from "lucide-react";
import {Button} from "@/components/ui/button";
import {RadioGroup,RadioGroupItem} from "@/components/ui/radio-group";
import {Input} from "@/components/ui/input";
import {normalizePhone,formatPhone} from "@/lib/phone";
import {services,today,time} from "@/lib/booking";
function Instagram({size=24}:{size?:number}){
return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none"/></svg>;
}
function PhoneInput({value,onChange,disabled}:{value:string,onChange:(value:string)=>void,disabled:boolean}){
const inputRef=useRef<HTMLInputElement>(null);
function update(raw:string,position:number){
 const formatted=formatPhone(raw);
 let digitsBefore=raw.slice(0,position).replace(/\D/g,"").length;
 if(raw.replace(/\D/g,"").length>=12&&raw.replace(/\D/g,"").startsWith("55"))digitsBefore=Math.max(0,digitsBefore-2);
 onChange(formatted);
 let caret=0,count=0;
 while(caret<formatted.length&&count<digitsBefore){if(/\d/.test(formatted[caret]))count++;caret++;}
 requestAnimationFrame(()=>inputRef.current?.setSelectionRange(caret,caret));
}
return <Input ref={inputRef} id="phone" autoComplete="tel" inputMode="tel" type="tel" placeholder="(46) 99999-9999" required disabled={disabled} value={value} onChange={e=>update(e.target.value,e.target.selectionStart??e.target.value.length)} onKeyDown={e=>{
 const el=e.currentTarget,start=el.selectionStart??0,end=el.selectionEnd??0;
 if(start!==end||!['Backspace','Delete'].includes(e.key))return;
 const backwards=e.key==='Backspace';let index=backwards?start-1:start;
 if(index<0||index>=value.length||/\d/.test(value[index]))return;
 e.preventDefault();
 while(index>=0&&index<value.length&&!/\d/.test(value[index]))index+=backwards?-1:1;
 if(index>=0&&index<value.length)update(value.slice(0,index)+value.slice(index+1),backwards?index:start);
 }} aria-describedby="phone-help"/>;
}
function TimeWheel({values,value,onChange}:{values:number[],value:number|null,onChange:(v:number)=>void}){
const rail=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
const active=value===null?0:Math.max(0,values.indexOf(value));
useEffect(()=>{const index=value===null?0:Math.max(0,values.indexOf(value));if(rail.current)rail.current.scrollTop=index*56;if(value===null&&values.length)onChange(values[0]);return()=>{if(timer.current)clearTimeout(timer.current)}},[values]);
function choose(index:number){const i=Math.max(0,Math.min(values.length-1,index));if(timer.current)clearTimeout(timer.current);onChange(values[i]);rail.current?.scrollTo({top:i*56,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})}
return <div className="time-picker"><div className="wheel-label"><span>HORÁRIO</span><span>{values.length} disponíveis</span></div><div className="wheel-layout"><div className="wheel-frame"><div className="wheel-guide" aria-hidden="true"/><div ref={rail} className="wheel" role="listbox" aria-label="Horário do atendimento" aria-activedescendant={"slot-"+values[active]} tabIndex={0} onKeyDown={e=>{if(["ArrowUp","ArrowDown","Home","End"].includes(e.key)){e.preventDefault();choose(e.key==="Home"?0:e.key==="End"?values.length-1:active+(e.key==="ArrowDown"?1:-1))}}} onScroll={()=>{if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{if(rail.current){const i=Math.max(0,Math.min(values.length-1,Math.round(rail.current.scrollTop/56)));onChange(values[i])}},100)}}>{values.map((t,i)=><div id={"slot-"+t} key={t} role="option" aria-selected={value===t} className={"wheel-option "+(value===t?"chosen":"")} onClick={()=>choose(i)}>{time(t)}</div>)}</div></div><div className="wheel-controls"><Button variant="outline" size="icon" onClick={()=>choose(active-1)} disabled={active===0} aria-label="Horário anterior"><ChevronUp/></Button><span>{value!==null&&value<720?"Manhã":"Tarde"}</span><Button variant="outline" size="icon" onClick={()=>choose(active+1)} disabled={active===values.length-1} aria-label="Próximo horário"><ChevronDown/></Button></div></div><p className="wheel-help">Role para escolher ou use as setas.</p></div>
}
export default function Home(){
const [service,setService]=useState("corte"),[step,setStep]=useState(0),[date,setDate]=useState(today()),[slot,setSlot]=useState<number|null>(null),[available,setAvailable]=useState<number[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(""),[name,setName]=useState(""),[phone,setPhone]=useState(""),[saving,setSaving]=useState(false),[booking,setBooking]=useState<string|null>(null),[reload,setReload]=useState(0);
const [customerState,setCustomerState]=useState<"unknown"|"existing"|"new">("unknown");
const panelRef=useRef<HTMLDivElement>(null);
useEffect(()=>{
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const animation=panelRef.current?.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)'});
 return()=>animation?.cancel();
},[step,booking]);
const selected=services.find(s=>s.id===service)!;
useEffect(()=>{const abort=new AbortController();setLoading(true);setSlot(null);setError("");fetch(`/api/bookings?date=${date}&service=${service}`,{signal:abort.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setAvailable(d.slots)}).catch(e=>{if(e.name!=="AbortError"){setError(e.message);setAvailable([])}}).finally(()=>{if(!abort.signal.aborted)setLoading(false)});return()=>abort.abort()},[date,service,reload]);
useEffect(()=>{const context=(document as any).modelContext;if(!context?.registerTool)return;const life=new AbortController();Promise.resolve(context.registerTool({name:"select_booking_service",description:"Seleciona o serviço no formulário, sem criar uma reserva.",inputSchema:{type:"object",properties:{service:{type:"string",enum:services.map(s=>s.id)}},required:["service"],additionalProperties:false},annotations:{readOnlyHint:false},execute:async(input:any)=>{if(!services.some(s=>s.id===input.service))throw Error("Serviço inválido");setService(input.service);setStep(0);return {selectedService:input.service}}},{signal:life.signal})).catch(()=>{});return()=>life.abort()},[]);
async function submit(e:React.FormEvent){
 e.preventDefault();if(saving)return;setError("");
 if(!normalizePhone(phone)){setError("Informe um telefone brasileiro válido com DDD.");return;}
 setSaving(true);
 try{
  if(customerState==="unknown"){
   const r=await fetch("/api/customers/lookup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone})});
   const d=await r.json();if(!r.ok)throw Error(d.error);
   setCustomerState(d.registered?"existing":"new");return;
  }
  const r=await fetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service,date,start:slot,...(customerState==="new"?{name}:{}),phone})});
  const d=await r.json();if(!r.ok){if(d.code==="NAME_REQUIRED")setCustomerState("new");if(r.status===409){setStep(1);setReload(x=>x+1)}throw Error(d.error)}setBooking(d.id);
 }catch(e){setError((e as Error).message)}finally{setSaving(false)}
}
const prettyDate=new Date(date+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"long"});
return <div className="site"><header className="header"><a href="/" className="brand"><img src="/logo.png" alt="Barbearia Sharp Razors"/><span>SHARP RAZORS<small>BARBEARIA</small></span></a><nav><a className="active" href="#agendamento">Agendamento</a><a href="#horarios">Horários</a><a href="https://www.instagram.com/barbeariasharprazors/" target="_blank" rel="noreferrer" aria-label="Instagram da barbearia"><Instagram size={19}/></a></nav></header>
<main><div className="intro"><p className="eyebrow">BARBEARIA SHARP RAZORS</p><h1>MARQUE SEU HORÁRIO<span>.</span></h1></div>
<div className="workspace" id="agendamento"><section className="booking-panel"><div className="steps">{["Serviço","Data e horário","Seus dados"].map((s,i)=><button key={s} disabled={i>step||!!booking||saving} onClick={()=>setStep(i)} className={i===step?"current":i<step?"done":""}><span>{i<step?<Check size={15}/>:"0"+(i+1)}</span>{s}{i<2&&<ChevronRight className="step-chevron" size={15}/>}</button>)}</div>
{booking?<div ref={panelRef} className="success"><div className="success-icon"><Check size={34}/></div><p className="eyebrow">TUDO CERTO</p><h2>Horário reservado!</h2><p>Seu agendamento está registrado.</p><div className="receipt"><strong>{selected.name}</strong><span>{prettyDate} às {time(slot!)}</span><span>Equipe Sharp Razors · {selected.duration} min</span><small>Comprovante: {booking.slice(0,8).toUpperCase()}</small></div><p className="fine">Guarde este comprovante. Para alterações, entre em contato com a barbearia pelo Instagram.</p><Button className="primary" onClick={()=>{setBooking(null);setStep(0);setName("");setPhone("");setCustomerState("unknown");setReload(x=>x+1)}}>Fazer outro agendamento <ArrowRight/></Button></div>:<div ref={panelRef} className="panel-body">
<div className="section-heading"><p className="eyebrow">ETAPA 0{step+1} DE 03</p><h2>{["O que vai ser hoje?","Escolha o seu horário.","Para fechar o agendamento."][step]}</h2><p>{["Escolha o serviço para o seu próximo atendimento.","Escolha uma data e um dos horários disponíveis.","Informe seu telefone para consultar o cadastro."][step]}</p></div>
{step===0&&<><RadioGroup value={service} onValueChange={setService} className="service-list" aria-label="Serviço">{services.map((s,i)=><label key={s.id} className={"service-card "+(service===s.id?"selected":"")} htmlFor={s.id}><span className="service-number">0{i+1}</span><div className="service-copy"><h3>{s.name}</h3><span className="duration"><Clock size={13}/>{s.duration} min <b>·</b> Valor sob consulta</span></div><RadioGroupItem value={s.id} id={s.id}/></label>)}</RadioGroup><div className="quiet-note"><ShieldCheck size={17}/> O valor do serviço é confirmado com a barbearia.</div></>}
{step===1&&<div className="date-selection"><label htmlFor="date">Data do atendimento</label><Input id="date" type="date" min={today()} max={new Date(Date.now()+89*86400000).toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/><div className="availability" aria-live="polite">{loading?<p>Consultando horários…</p>:available.length===0?<div className="empty"><CalendarDays/><p>Nenhum horário disponível nesta data.</p><span>Selecione outro dia para continuar.</span></div>:<TimeWheel values={available} value={slot} onChange={setSlot}/>}</div><p className="fine">Horários de Brasília. Agendamentos com até 90 dias de antecedência.</p></div>}
{step===2&&<form id="booking-form" onSubmit={submit} className="details-form">
<label htmlFor="phone">Telefone com DDD</label>
<PhoneInput disabled={saving} value={phone} onChange={value=>{setPhone(value);setCustomerState("unknown");setName("");setError("")}}/>
<p id="phone-help" className="phone-help">Use o mesmo número nos próximos agendamentos.</p>
<div aria-live="polite">
{customerState==="existing"&&<div className="customer-found"><Check size={20}/><div><strong>Telefone já cadastrado.</strong><p>Confira o horário abaixo e confirme sua reserva.</p></div></div>}
{customerState==="new"&&<div className="new-customer"><p>Primeira vez com este telefone? Informe seu nome para o cadastro.</p><label htmlFor="name">Nome completo</label><Input id="name" autoComplete="name" placeholder="Seu nome completo" required minLength={3} maxLength={100} disabled={saving} value={name} onChange={e=>setName(e.target.value)}/></div>}
</div>
{customerState!=="unknown"&&<div className="confirmation-summary"><span>SEU AGENDAMENTO</span><strong>{selected.name}</strong><p>{prettyDate} às {slot===null?"—":time(slot)} · {selected.duration} min</p></div>}
<div className="contact-note"><ShieldCheck size={21}/><p>Seus dados serão usados pela barbearia para identificar e atender seu agendamento.</p></div>
</form>}

{error&&step>0&&<div className="error" role="alert">{error}{step===1&&<button onClick={()=>setReload(x=>x+1)}>Tentar novamente</button>}</div>}
<div className="panel-footer"><span>{step===0?"Preços sob consulta":<button className="back" disabled={saving} onClick={()=>setStep(step-1)}><ArrowLeft size={16}/> Voltar</button>}</span>{step<2?<Button className="primary" disabled={step===1&&(slot===null||loading)} onClick={()=>setStep(step+1)}>Continuar <ArrowRight size={18}/></Button>:<Button form="booking-form" type="submit" className="primary" disabled={saving}>{saving?(customerState==="unknown"?"Consultando…":"Reservando…"):(customerState==="unknown"?"Continuar com telefone":"Confirmar agendamento")}<Check size={18}/></Button>}</div>
</div>}</section>
<aside><section className="brand-card"><img src="/logo.png" alt="Logo Sharp Razors"/><p className="eyebrow">BARBEARIA</p><h2>NA RÉGUA.<br/>NO SEU TEMPO.</h2><div className="brand-divider"/><div className="appointment-summary"><span>SEU AGENDAMENTO</span><div><Scissors size={17}/><strong>{selected.name}</strong></div><div><Clock size={17}/>{selected.duration} minutos · Equipe Sharp Razors</div>{slot!==null&&<div><CalendarDays size={17}/>{prettyDate}, {time(slot)}</div>}</div></section>
<section className="hours" id="horarios"><h3><Clock size={18}/> Horário de funcionamento</h3><dl><dt>Segunda a sexta</dt><dd>08:00 – 11:30<span>13:30 – 19:30</span></dd><dt>Sábado</dt><dd>08:00 – 11:30<span>13:30 – 17:00</span></dd><dt>Domingo</dt><dd className="closed">Fechado</dd></dl><a href="https://www.instagram.com/barbeariasharprazors/" target="_blank" rel="noreferrer"><Instagram size={17}/>@barbeariasharprazors <ArrowRight size={15}/></a></section></aside></div></main>
<footer><span>© {new Date().getFullYear()} Sharp Razors</span><span>Corte · Barba · Sharp Razors</span><span>BARBEARIA & ESTILO</span></footer></div>}
