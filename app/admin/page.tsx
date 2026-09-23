"use client";
import {useEffect,useState} from "react";
import {ArrowRight,Ban,Calendar,CalendarOff,Check,ChevronDown,ChevronRight,ChevronUp,Clock,LogOut,Phone,Plus,Scissors,Settings,Trash2,Users,UserCheck,UserX} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "@/components/ui/select";
import {PhoneInput} from "@/components/phone-input";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter,DialogClose} from "@/components/ui/dialog";
import {formatPhone} from "@/lib/phone";
import {lastBookableDate,minutes,time,today,type Block,type BlockedPhone,type DayHours,type Service,type SiteConfig} from "@/lib/booking";
import {AvailabilityScheduler} from "@/components/admin/availability-scheduler";
import {AgendaTimeline} from "@/components/admin/agenda-timeline";

type Barber={id:string,name:string,active:number,position:number};
import type {Booking} from "@/lib/booking-history";
type CustomerSummary={phone:string,name:string,createdAt:string|null};
type Dashboard=SiteConfig&{username:string,blocks:Block[],blockedPhones:BlockedPhone[],bookings:Booking[],barbers:Barber[],customers:CustomerSummary[],serviceColors:Record<string,string>};
type Tab="contato"|"horarios"|"servicos"|"barbeiros"|"ausencias"|"bloqueios"|"configuracoes"|"agenda"|"clientes";
type Ctx={data:Dashboard,onData:(data:Dashboard)=>void,onExpired:()=>void};
const tabs:{id:Tab,label:string,Icon:typeof Clock}[]=[{id:"agenda",label:"Agenda",Icon:Calendar},{id:"clientes",label:"Clientes",Icon:UserCheck},{id:"contato",label:"Contato",Icon:Phone},{id:"horarios",label:"Horário de funcionamento",Icon:Clock},{id:"servicos",label:"Serviços e valores",Icon:Scissors},{id:"barbeiros",label:"Barbeiros",Icon:Users},{id:"ausencias",label:"Ausências",Icon:CalendarOff},{id:"bloqueios",label:"Telefones bloqueados",Icon:Ban},{id:"configuracoes",label:"Configurações",Icon:Settings}];
const longDate=(date:string)=>new Date(date+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});

class RequestError extends Error{status:number;constructor(message:string,status:number){super(message);this.status=status}}
async function send(payload:object):Promise<Dashboard>{
 const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw new RequestError((d as {error?:string}).error||"Não foi possível concluir. Tente novamente.",r.status);
 return d as Dashboard;
}
function useAction({onData,onExpired}:Ctx){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function run(payload:object,success:string){
  setBusy(true);setError("");setNotice("");
  try{const data=await send(payload);onData(data);setNotice(success);return data}
  catch(e){if(e instanceof RequestError&&e.status===401)onExpired();setError((e as Error).message);return null}
  finally{setBusy(false)}
 }
 return {busy,error,notice,run,fail:(message:string)=>{setNotice("");setError(message)}};
}
type Action=ReturnType<typeof useAction>;
function Feedback({action}:{action:Action}){return <div aria-live="polite">{action.error&&<div className="error" role="alert">{action.error}</div>}{action.notice&&<div className="admin-notice" role="status"><Check size={17}/>{action.notice}</div>}</div>}
function Heading({title,text}:{title:string,text:string}){return <div className="section-heading"><h2>{title}</h2><p>{text}</p></div>}
function SaveFooter({busy,label,hint}:{busy:boolean,label:string,hint?:string}){return <div className="panel-footer"><span>{hint}</span><Button type="submit" className="primary" disabled={busy}>{busy?"Salvando⬦":label}<Check size={18}/></Button></div>}

function ContactTab(ctx:Ctx){
 const action=useAction(ctx);
 const [whatsapp,setWhatsapp]=useState(formatPhone(ctx.data.whatsapp)),[phone,setPhone]=useState(formatPhone(ctx.data.phone));
 return <form className="admin-form" onSubmit={e=>{e.preventDefault();action.run({action:"contact",whatsapp,phone},"Contato atualizado no site.")}}>
  <Heading title="Contato da barbearia" text="O WhatsApp · usado nos botões de conversa do site. O telefone aparece junto ao horário de funcionamento quando for diferente do WhatsApp."/>
  <label htmlFor="whatsapp">Número do WhatsApp</label><PhoneInput id="whatsapp" value={whatsapp} onChange={setWhatsapp} disabled={action.busy}/>
  <label htmlFor="contact-phone">Telefone</label><PhoneInput id="contact-phone" value={phone} onChange={setPhone} disabled={action.busy}/>
  <Feedback action={action}/><SaveFooter busy={action.busy} label="Salvar contato"/>
 </form>;
}

function HoursTab(ctx:Ctx){
 const action=useAction(ctx);
 const [hours,setHours]=useState<DayHours[]>(()=>structuredClone(ctx.data.hours));
 async function save(e:React.FormEvent){e.preventDefault();const data=await action.run({action:"hours",hours},"Horário de funcionamento atualizado. A agenda do site já segue a nova grade.");if(data)setHours(structuredClone(data.hours))}
 return <form className="admin-form" onSubmit={save}>
  <Heading title="Horário de funcionamento" text="Defina os dias e períodos de atendimento. Os horários oferecidos no agendamento seguem esta grade, em intervalos de 5 minutos."/>
  <AvailabilityScheduler value={hours} onChange={setHours} disabled={action.busy}/>
  <Feedback action={action}/><SaveFooter busy={action.busy} label="Salvar horários"/>
 </form>;
}

type Draft={key:string,id?:string,name:string,duration:string,price:string};
const toDraft=(s:Service):Draft=>({key:s.id,id:s.id,name:s.name,duration:String(s.duration),price:s.priceCents===null?"":(s.priceCents/100).toFixed(2).replace(".",",")});
function cents(value:string){const text=value.trim().replace(/^R\$\s*/i,"");if(!text)return null;if(!/^\d{1,6}([.,]\d{1,2})?$/.test(text))return NaN;return Math.round(Number(text.replace(",","."))*100)}
function ServicesTab(ctx:Ctx){
 const action=useAction(ctx);
 const [drafts,setDrafts]=useState<Draft[]>(()=>ctx.data.services.map(toDraft));
 const edit=(key:string,field:"name"|"duration"|"price",value:string)=>setDrafts(list=>list.map(d=>d.key===key?{...d,[field]:value}:d));
 const move=(index:number,offset:number)=>setDrafts(list=>{const next=[...list];[next[index],next[index+offset]]=[next[index+offset],next[index]];return next});
 async function save(e:React.FormEvent){
  e.preventDefault();
  const services=[];
  for(const d of drafts){const priceCents=cents(d.price);if(Number.isNaN(priceCents))return action.fail(`Valor inválido em "${d.name||"serviço sem nome"}". Use o formato 35,00 ou deixe em branco.`);services.push({id:d.id,name:d.name,duration:Number(d.duration),priceCents})}
  const data=await action.run({action:"services",services},"Serviços atualizados no site.");
  if(data)setDrafts(data.services.map(toDraft));
 }
 return <form className="admin-form" onSubmit={save}>
  <Heading title="Serviços e valores" text="Cadastre os serviços oferecidos, a duração usada para montar a agenda e o valor exibido ao cliente."/>
  <div className="service-edit-list">{drafts.map((d,i)=><div className="service-edit" key={d.key}>
   <div className="admin-field service-name"><label htmlFor={"name-"+d.key}>Serviço</label><Input id={"name-"+d.key} value={d.name} maxLength={60} required placeholder="Ex.: Corte infantil" onChange={e=>edit(d.key,"name",e.target.value)}/></div>
   <div className="admin-field"><label htmlFor={"duration-"+d.key}>Duração (min)</label><Input id={"duration-"+d.key} type="number" inputMode="numeric" min={10} max={480} step={5} required value={d.duration} onChange={e=>edit(d.key,"duration",e.target.value)}/></div>
   <div className="admin-field"><label htmlFor={"price-"+d.key}>Valor (R$)</label><Input id={"price-"+d.key} inputMode="decimal" placeholder="Sob consulta" value={d.price} onChange={e=>edit(d.key,"price",e.target.value)}/></div>
   <div className="service-actions">
    <button type="button" className="icon-button" onClick={()=>move(i,-1)} disabled={i===0} aria-label={`Mover ${d.name||"serviço"} para cima`}><ChevronUp size={16}/></button>
    <button type="button" className="icon-button" onClick={()=>move(i,1)} disabled={i===drafts.length-1} aria-label={`Mover ${d.name||"serviço"} para baixo`}><ChevronDown size={16}/></button>
    <button type="button" className="icon-button" onClick={()=>setDrafts(list=>list.filter(x=>x.key!==d.key))} disabled={drafts.length===1} aria-label={`Remover ${d.name||"serviço"}`}><Trash2 size={16}/></button>
   </div>
  </div>)}</div>
  <button type="button" className="text-button" disabled={drafts.length>=30} onClick={()=>setDrafts(list=>[...list,{key:"new-"+Date.now(),name:"",duration:"30",price:""}])}><Plus size={15}/> Adicionar serviço</button>
  <p className="admin-hint">Deixe o valor em branco para exibir “Valor sob consulta—. Serviços removidos deixam de aparecer para novos agendamentos; reservas já feitas são mantidas.</p>
  <Feedback action={action}/><SaveFooter busy={action.busy} label="Salvar serviços"/>
 </form>;
}

function BlocksTab(ctx:Ctx){
 const action=useAction(ctx);
 const [date,setDate]=useState(today()),[allDay,setAllDay]=useState(false),[start,setStart]=useState("12:00"),[end,setEnd]=useState("13:30"),[reason,setReason]=useState("");
 async function add(e:React.FormEvent){
  e.preventDefault();
  const from=allDay?0:minutes(start),to=allDay?1440:minutes(end);
  if(from===null||to===null||from>=to)return action.fail("Informe um horário de início anterior ao horário de fim.");
  if(await action.run({action:"addBlock",date,start:from,end:to,reason},"Ausência registrada. Esses horários não aparecem mais para agendamento."))setReason("");
 }
 return <div className="admin-form">
  <Heading title="Ausências e pausas" text="Bloqueie um período de um dia específico, como uma saída temporária ou uma folga. Os clientes não verão esses horários na agenda."/>
  <form className="block-form" onSubmit={add}>
   <div className="admin-field"><label htmlFor="block-date">Data</label><Input id="block-date" type="date" required min={today()} max={lastBookableDate(ctx.data.bookingWindowDays)} value={date} onChange={e=>setDate(e.target.value)}/></div>
   <div className="admin-field block-all-day"><label className="admin-check"><input type="checkbox" checked={allDay} onChange={e=>setAllDay(e.target.checked)}/>Dia inteiro</label></div>
   {!allDay&&<><div className="admin-field"><label htmlFor="block-start">Início</label><Input id="block-start" type="time" step={300} required value={start} onChange={e=>setStart(e.target.value)}/></div>
   <div className="admin-field"><label htmlFor="block-end">Fim</label><Input id="block-end" type="time" step={300} required value={end} onChange={e=>setEnd(e.target.value)}/></div></>}
   <div className="admin-field wide"><label htmlFor="block-reason">Motivo (opcional, uso interno)</label><Input id="block-reason" maxLength={80} placeholder="Ex.: consulta médica" value={reason} onChange={e=>setReason(e.target.value)}/></div>
   <div className="wide"><Button type="submit" className="primary" disabled={action.busy}>{action.busy?"Salvando⬦":"Registrar ausência"}<Plus size={18}/></Button></div>
  </form>
  <Feedback action={action}/>
  <h3 className="admin-subtitle">Próximas ausências</h3>
  {ctx.data.blocks.length===0?<p className="admin-empty">Nenhuma ausência programada.</p>:<ul className="block-list">{ctx.data.blocks.map(b=><li key={b.id}>
   <div><strong>{longDate(b.date)}</strong><span>{b.start===0&&b.end===1440?"Dia inteiro":`${time(b.start)} – ${time(b.end)}`}{b.reason?` · ${b.reason}`:""}</span></div>
   <button type="button" className="icon-button" disabled={action.busy} onClick={()=>action.run({action:"deleteBlock",id:b.id},"Ausência removida. Os horários voltaram para a agenda.")} aria-label={`Remover ausência de ${longDate(b.date)}`}><Trash2 size={16}/></button>
  </li>)}</ul>}
 </div>;
}

function CustomersTab(ctx:Ctx){
 const action=useAction(ctx);
 const [query,setQuery]=useState(""),[page,setPage]=useState(1),[openPhone,setOpenPhone]=useState<string|null>(null),[editName,setEditName]=useState(""),[editPhone,setEditPhone]=useState("");
 const normalizedQuery=query.trim().toLocaleLowerCase("pt-BR");
 const phoneQuery=query.replace(/\D/g,"");
 const filteredCustomers=(ctx.data.customers||[]).filter(c=>!normalizedQuery||c.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery)||(phoneQuery.length>0&&c.phone.includes(phoneQuery)));
 const pageCount=Math.max(1,Math.ceil(filteredCustomers.length/10));
 const currentPage=Math.min(page,pageCount);
 const customers=filteredCustomers.slice((currentPage-1)*10,currentPage*10);
 useEffect(()=>setPage(1),[query]);
 const historyFor=(phone:string)=>ctx.data.bookings.filter(b=>b.phone===phone).sort((a,b)=>b.date.localeCompare(a.date)||b.start-a.start);
 const nextFor=(history:Booking[])=>history.filter(b=>b.date>=today()&&!['finalizado','cancelado','nao_compareceu'].includes(b.status)).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start)[0];
 const open=(customer:CustomerSummary)=>{setOpenPhone(customer.phone);setEditName(customer.name);setEditPhone(formatPhone(customer.phone));action.fail("")};
 async function save(e:React.FormEvent){e.preventDefault();if(!openPhone)return;const data=await action.run({action:"updateCustomer",currentPhone:openPhone,phone:editPhone,name:editName},"Cliente atualizado.");if(data)setOpenPhone(null)}
 return <div className="admin-form">
  <Heading title="Clientes" text="Consulte os clientes registrados, atualize seus dados e acompanhe os atendimentos realizados e o próximo horário."/>
  <label htmlFor="customer-search">Filtrar por nome ou telefone</label><Input id="customer-search" type="search" placeholder="Digite um nome ou telefone" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/>
  <Feedback action={action}/>
  <h3 className="admin-subtitle">Clientes registrados ({filteredCustomers.length})</h3>
  {filteredCustomers.length===0?<p className="admin-empty">Nenhum cliente encontrado.</p>:<><div className="customer-list">{customers.map(customer=>{const history=historyFor(customer.phone),next=nextFor(history),openCard=openPhone===customer.phone;return <article className="customer-card" key={customer.phone}>
   <button type="button" className="customer-card-head" onClick={()=>openCard?setOpenPhone(null):open(customer)} aria-expanded={openCard}><span><strong>{customer.name||"Cliente sem nome"}</strong><small>{formatPhone(customer.phone)} · {history.length} atendimento{history.length===1?"":"s"}</small></span><ChevronDown size={18}/></button>
   {openCard&&<div className="customer-card-body"><form className="customer-edit" onSubmit={save}><div className="admin-field"><label htmlFor={`customer-name-${customer.phone}`}>Nome do cliente</label><Input id={`customer-name-${customer.phone}`} value={editName} maxLength={100} required onChange={e=>setEditName(e.target.value)} disabled={action.busy}/></div><div className="admin-field"><label htmlFor={`customer-phone-${customer.phone}`}>Telefone</label><PhoneInput id={`customer-phone-${customer.phone}`} value={editPhone} onChange={setEditPhone} disabled={action.busy}/></div><Button type="submit" className="primary" disabled={action.busy}>{action.busy?"Salvando…":"Salvar dados"}<Check size={18}/></Button></form>
    {next&&<div className="customer-next"><span>PRÓXIMO ATENDIMENTO</span><strong>{longDate(next.date)} às {time(next.start)}</strong><small>{next.serviceName} · {next.barberName||"Qualquer disponível"}</small></div>}
    <div className="customer-history"><h4>Histórico de atendimentos</h4>{history.length===0?<p className="admin-empty">Nenhum atendimento registrado.</p>:<ul>{history.map(item=><li key={item.id}><div><strong>{longDate(item.date)} às {time(item.start)}</strong><span>{item.serviceName} · {item.barberName||"Qualquer disponível"}</span></div><b>{item.status}</b></li>)}</ul>}</div>
   </div>}
  </article>})}</div><div className="customer-pagination" aria-label="Paginação de clientes"><span>Página {currentPage} de {pageCount}</span><div><Button type="button" variant="outline" disabled={currentPage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>Anterior</Button><Button type="button" variant="outline" disabled={currentPage===pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>Próxima</Button></div></div></>}
 </div>;
}

function BlockedPhonesTab(ctx:Ctx){
 const action=useAction(ctx);
 const [phone,setPhone]=useState(""),[reason,setReason]=useState("");
 const since=(iso:string)=>new Date(iso).toLocaleDateString("pt-BR",{day:"numeric",month:"short",year:"numeric"});
 async function add(e:React.FormEvent){
  e.preventDefault();
  if(await action.run({action:"blockPhone",phone,reason},"Telefone bloqueado. Ele não consegue mais agendar pelo site.")){setPhone("");setReason("")}
 }
 return <div className="admin-form">
  <Heading title="Telefones bloqueados" text="Clientes com um telefone desta lista não conseguem agendar pelo site. Agendamentos já feitos por esse número continuam registrados."/>
  <form className="block-form" onSubmit={add}>
   <div className="admin-field"><label htmlFor="blocked-phone">Telefone</label><PhoneInput id="blocked-phone" value={phone} onChange={setPhone} disabled={action.busy}/></div>
   <div className="admin-field"><label htmlFor="blocked-reason">Motivo (opcional, uso interno)</label><Input id="blocked-reason" maxLength={120} placeholder="Ex.: faltou sem avisar" disabled={action.busy} value={reason} onChange={e=>setReason(e.target.value)}/></div>
   <div className="wide"><Button type="submit" className="primary" disabled={action.busy}>{action.busy?"Salvando⬦":"Bloquear telefone"}<Ban size={18}/></Button></div>
  </form>
  <Feedback action={action}/>
  <h3 className="admin-subtitle">Lista de bloqueio ({ctx.data.blockedPhones.length})</h3>
  {ctx.data.blockedPhones.length===0?<p className="admin-empty">Nenhum telefone bloqueado.</p>:<ul className="block-list">{ctx.data.blockedPhones.map(b=><li key={b.phone}>
   <div><strong>{formatPhone(b.phone)}</strong><span>{b.reason||"Sem motivo informado"} · desde {since(b.createdAt)}</span></div>
   <button type="button" className="text-button" disabled={action.busy} onClick={()=>action.run({action:"unblockPhone",phone:b.phone},`${formatPhone(b.phone)} foi desbloqueado.`)} aria-label={`Desbloquear ${formatPhone(b.phone)}`}>Desbloquear</button>
  </li>)}</ul>}
 </div>;
}

function AgendaTab(ctx:Ctx){
  return <AgendaTimeline bookings={ctx.data.bookings||[]} onData={ctx.onData}/>
 }

function BarbeirosTab(ctx:Ctx){
  const action=useAction(ctx);
  const [newName,setNewName]=useState("");
  const [editId,setEditId]=useState<string|null>(null);
  const [editName,setEditName]=useState("");
  const barbers=ctx.data.barbers||[];
  async function add(e:React.FormEvent){
   e.preventDefault();
   if(await action.run({action:"addBarber",name:newName},"Barbeiro cadastrado.")){setNewName("")}
  }
  async function saveEdit(e:React.FormEvent){
   e.preventDefault();
   if(action.busy||!editId||editName.trim().length<2)return;
   if(await action.run({action:"editBarber",id:editId,name:editName.trim()},"Barbeiro atualizado.")){setEditId(null);setEditName("")}
  }
  return <div className="admin-form">
   <Heading title="Barbeiros" text="Gerencie os profissionais que atendem na barbearia. Barbeiros inativos não aparecem para os clientes no agendamento."/>
   <form className="block-form" onSubmit={add}>
    <div className="admin-field"><label htmlFor="barber-name">Nome do barbeiro</label><Input id="barber-name" placeholder="Ex.: Carlos" required minLength={2} maxLength={60} value={newName} onChange={e=>setNewName(e.target.value)}/></div>
    <div className="wide"><Button type="submit" className="primary" disabled={action.busy}>{action.busy?"Salvando⬦":"Adicionar barbeiro"}<Plus size={18}/></Button></div>
   </form>
   <Feedback action={action}/>
   <h3 className="admin-subtitle">Barbeiros cadastrados ({barbers.length})</h3>
   {barbers.length===0?<p className="admin-empty">Nenhum barbeiro cadastrado.</p>:<ul className="block-list">{barbers.map(b=><li key={b.id}>
    <div style={{opacity:b.active?1:.5}}>
     <strong>{b.name}</strong>
     <span>{b.active?"Ativo":"Inativo"}{b.id==="qualquer"?" · Padrão":""}</span>
    </div>
    <div className="service-actions">
     {b.id!=="qualquer"&&<button type="button" className="text-button" disabled={action.busy} onClick={()=>{setEditId(b.id);setEditName(b.name)}} aria-label={`Editar ${b.name}`}>Editar</button>}
     {b.id!=="qualquer"&&<button type="button" className="text-button" disabled={action.busy} onClick={()=>action.run({action:"toggleBarber",id:b.id},b.active?"Barbeiro inativado.":"Barbeiro ativado.")} aria-label={b.active?`Inativar ${b.name}`:`Ativar ${b.name}`}>{b.active?<><UserX size={14}/>Inativar</>:<><UserCheck size={14}/>Ativar</>}</button>}
     {b.id!=="qualquer"&&<button type="button" className="icon-button" disabled={action.busy} onClick={()=>action.run({action:"deleteBarber",id:b.id},"Barbeiro removido.")} aria-label={`Remover ${b.name}`}><Trash2 size={16}/></button>}
    </div>
   </li>)}</ul>}
   <Dialog open={!!editId} onOpenChange={(o)=>{if(!o&&!action.busy){setEditId(null);setEditName("")}}}>
    <DialogContent showCloseButton={!action.busy}>
    <form onSubmit={saveEdit} className="grid gap-4">
     <DialogHeader><DialogTitle>Editar barbeiro</DialogTitle><DialogDescription>Atualize o nome do profissional e salve as alterações.</DialogDescription></DialogHeader>
     <div className="admin-field" style={{marginTop:16}}>
      <label htmlFor="edit-barber-name">Nome</label>
      <Input required autoFocus id="edit-barber-name" value={editName} onChange={e=>setEditName(e.target.value)} minLength={2} maxLength={60} disabled={action.busy}/>
     </div>
     {action.error&&<div className="error" role="alert">{action.error}</div>}
     <DialogFooter>
      <DialogClose asChild><Button type="button" variant="outline" disabled={action.busy}>Cancelar</Button></DialogClose>
      <Button type="submit" className="primary" disabled={action.busy||editName.trim().length<2}>{action.busy?"Salvando⬦":"Salvar"}</Button>
     </DialogFooter>
    </form>
    </DialogContent>
   </Dialog>
  </div>;
 }

 function SettingsTab(ctx:Ctx){
 const bookingAction=useAction(ctx),passwordAction=useAction(ctx);
 const [bookingWindowDays,setBookingWindowDays]=useState(String(ctx.data.bookingWindowDays));
 const [minAdvanceMinutes,setMinAdvanceMinutes]=useState(String(ctx.data.minAdvanceMinutes));
 const [current,setCurrent]=useState(""),[next,setNext]=useState(""),[confirm,setConfirm]=useState("");
 async function saveBookingSettings(e:React.FormEvent){
  e.preventDefault();
  const days=Number(bookingWindowDays);
  if(!Number.isInteger(days)||days<1||days>365)return bookingAction.fail("Informe entre 1 e 365 dias para a agenda aberta.");
  const data=await bookingAction.run({action:"bookingSettings",bookingWindowDays:days,minAdvanceMinutes:Number(minAdvanceMinutes)},"Configurações da agenda atualizadas.");
  if(data){setBookingWindowDays(String(data.bookingWindowDays));setMinAdvanceMinutes(String(data.minAdvanceMinutes))}
 }
 async function savePassword(e:React.FormEvent){
  e.preventDefault();
  if(next.length<8)return passwordAction.fail("A nova senha precisa ter pelo menos 8 caracteres.");
  if(next!==confirm)return passwordAction.fail("A confirmação não confere com a nova senha.");
  if(await passwordAction.run({action:"password",current,next},"Senha alterada. Outras sessões abertas foram encerradas.")){setCurrent("");setNext("");setConfirm("")}
 }
 return <div className="admin-form">
  <Heading title="Configurações" text="Defina a antecedência dos agendamentos e gerencie a senha de acesso ao painel."/>
  <form className="admin-form" onSubmit={saveBookingSettings}>
   <h3 className="admin-subtitle">Regras da agenda</h3>
   <label htmlFor="booking-window-days">Quantidade de dias com a agenda aberta</label><Input id="booking-window-days" type="number" inputMode="numeric" min={1} max={365} required value={bookingWindowDays} onChange={e=>setBookingWindowDays(e.target.value)} disabled={bookingAction.busy}/>
   <label htmlFor="min-advance-minutes">Tempo mínimo antes do agendamento</label>
   <Select value={minAdvanceMinutes} onValueChange={setMinAdvanceMinutes} disabled={bookingAction.busy}><SelectTrigger id="min-advance-minutes" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{[5,10,15,20,25,30,35,40,45,50,55,60].map(value=><SelectItem key={value} value={String(value)}>{value} minutos</SelectItem>)}</SelectContent></Select>
   <p className="admin-hint">Exemplo: com 30 minutos, às 10:50 o primeiro horário possível será 11:20.</p>
   <Feedback action={bookingAction}/><SaveFooter busy={bookingAction.busy} label="Salvar configurações"/>
  </form>
  <form className="admin-form" onSubmit={savePassword}>
   <h3 className="admin-subtitle">Alterar senha</h3><p className="admin-hint">Conectado como {ctx.data.username}. Use uma senha com pelo menos 8 caracteres.</p>
   <label htmlFor="current-password">Senha atual</label><Input id="current-password" type="password" autoComplete="current-password" required value={current} onChange={e=>setCurrent(e.target.value)} disabled={passwordAction.busy}/>
   <label htmlFor="new-password">Nova senha</label><Input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={next} onChange={e=>setNext(e.target.value)} disabled={passwordAction.busy}/>
   <label htmlFor="confirm-password">Confirmar nova senha</label><Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={passwordAction.busy}/>
   <Feedback action={passwordAction}/><SaveFooter busy={passwordAction.busy} label="Alterar senha"/>
  </form>
 </div>;
}

function Login({onSuccess}:{onSuccess:()=>void}){
 const [username,setUsername]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");
  try{await send({action:"login",username,password});setPassword("");onSuccess()}catch(err){setError((err as Error).message)}finally{setBusy(false)}
 }
 return <div className="admin-login"><section className="booking-panel"><div className="panel-body">
  <p className="eyebrow">ÁREA RESTRITA</p><h2 className="admin-title">Entrar no painel</h2><p className="admin-lead">Acesse com seu usuário e senha de administrador.</p>
  <form className="admin-form" onSubmit={submit}>
   <label htmlFor="username">Usuário</label><Input id="username" autoComplete="username" required disabled={busy} value={username} onChange={e=>setUsername(e.target.value)}/>
   <label htmlFor="password">Senha</label><Input id="password" type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/>
   {error&&<div className="error admin-login-error" role="alert">{error}</div>}
   <Button type="submit" className="primary admin-submit" disabled={busy}>{busy?"Entrando⬦":"Entrar"}<ArrowRight size={18}/></Button>
  </form>
 </div></section></div>;
}

export default function Admin(){
 const [data,setData]=useState<Dashboard|null>(null),[status,setStatus]=useState<"loading"|"login"|"ready"|"error">("loading"),[tab,setTab]=useState<Tab>("agenda");
 async function load(){
  try{const r=await fetch("/api/admin",{cache:"no-store"});if(r.status===401){setData(null);setStatus("login");return}const d=await r.json() as Dashboard&{error?:string};if(!r.ok)throw Error(d.error);setData(d);setStatus("ready")}
  catch{setStatus("error")}
 }
 useEffect(()=>{load()},[]);
 const expire=()=>{setData(null);setStatus("login")};
 async function logout(){await send({action:"logout"}).catch(()=>{});expire()}
 const ctx:Ctx|null=data&&{data,onData:setData,onExpired:expire};
 return <div className="site"><header className="header"><a href="/admin" className="brand"><img src="/logo.png" alt="Barbearia Sharp Razors"/><span>SHARP RAZORS<small>PAINEL</small></span></a><nav><a href="/" target="_blank" rel="noreferrer">Ver site</a>{status==="ready"&&<button type="button" className="nav-button" onClick={logout}><LogOut size={17}/> Sair</button>}</nav></header>
 <main>
  {status==="loading"&&<p className="loading-note">Carregando painel&</p>}
  {status==="error"&&<div className="error" role="alert">Não foi possível carregar o painel.<button onClick={()=>{setStatus("loading");load()}}>Tentar novamente</button></div>}
  {status==="login"&&<Login onSuccess={()=>{setTab("agenda");load()}}/>}
  {status==="ready"&&ctx&&<><div className="intro"><p className="eyebrow">PAINEL ADMINISTRATIVO</p><h1>GERENCIAR BARBEARIA<span>.</span></h1></div>
  <div className="workspace admin-workspace"><section className="booking-panel"><div className="panel-body">
   {tab==="contato"&&<ContactTab {...ctx}/>}{tab==="horarios"&&<HoursTab {...ctx}/>}{tab==="servicos"&&<ServicesTab {...ctx}/>}{tab==="barbeiros"&&<BarbeirosTab {...ctx}/>}{tab==="ausencias"&&<BlocksTab {...ctx}/>}{tab==="bloqueios"&&<BlockedPhonesTab {...ctx}/>}{tab==="configuracoes"&&<SettingsTab {...ctx}/>}{tab==="agenda"&&<AgendaTab {...ctx}/>}{tab==="clientes"&&<CustomersTab {...ctx}/>}
  </div></section>
  <aside><div className="admin-tabs">{tabs.map(({id,label,Icon})=><button key={id} type="button" className={tab===id?"current":""} aria-pressed={tab===id} onClick={()=>setTab(id)}><Icon size={17}/>{label}<ChevronRight size={15}/></button>)}</div><p className="admin-user">Conectado como <strong>{ctx.data.username}</strong>. As alterações aparecem imediatamente no site.</p></aside></div></>}
 </main>
 <footer><span>· {new Date().getFullYear()} Sharp Razors</span><span>Painel administrativo</span><span>BARBEARIA & ESTILO</span></footer></div>;
}
