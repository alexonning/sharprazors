"use client";
import {useEffect,useState,useCallback,useMemo} from "react";
import {Check,ChevronsUpDown,Calendar,Plus,ChevronLeft,ChevronRight,Phone,Clock,User,Scissors,DollarSign,Timer,CheckCircle2,XCircle,AlertCircle,PlayCircle,StopCircle,RefreshCw,MessageCircle,History,MapPin} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Popover,PopoverTrigger,PopoverContent} from "@/components/ui/popover";
import {Command,CommandInput,CommandList,CommandEmpty,CommandGroup,CommandItem} from "@/components/ui/command";
import {agendaTitle,agendaHistory,isPastAppointment} from "@/lib/agenda";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from "@/components/ui/sheet";
import {ScrollArea} from "@/components/ui/scroll-area";
import {time,price,type Service} from "@/lib/booking";

type Booking={id:string,date:string,start:number,end:number,service:string,name:string,phone:string,status:string,barber:string};
type CustomerDetail={phone:string,name:string,createdAt:string|null,totalVisits:number,totalSpent:number,lastService:string|null,lastVisit:string|null,history:any[]};
type StatusKey="agendado"|"confirmado"|"em_atendimento"|"finalizado"|"cancelado"|"nao_compareceu";
const STATUS_CONFIG:Record<StatusKey,{label:string;color:string,bg:string,icon:any}>={
  agendado:{label:"Agendado",color:"#6366f1",bg:"#eef2ff",icon:Clock},
  confirmado:{label:"Confirmado",color:"#059669",bg:"#ecfdf5",icon:CheckCircle2},
  em_atendimento:{label:"Em atendimento",color:"#d97706",bg:"#fffbeb",icon:PlayCircle},
  finalizado:{label:"Finalizado",color:"#6b7280",bg:"#f3f4f6",icon:StopCircle},
  cancelado:{label:"Cancelado",color:"#dc2626",bg:"#fef2f2",icon:XCircle},
  nao_compareceu:{label:"Não compareceu",color:"#9333ea",bg:"#faf5ff",icon:AlertCircle}
};
function getStatus(s:string):StatusKey{return STATUS_CONFIG[s as StatusKey]?s as StatusKey:"agendado"}
function getInitials(name:string){return name.split(" ").map(w=>w[0]).filter(Boolean).slice(0,2).join("").toUpperCase()}
function getNowMinutes(){const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());return Number(parts.find(p=>p.type==="hour")?.value)*60+Number(parts.find(p=>p.type==="minute")?.value)}
function minutesUntil(target:number){const diff=target-getNowMinutes();if(diff<0)return null;const h=Math.floor(diff/60);const m=diff%60;if(h===0)return`${m} min`;return`${h}h${m>0?` ${m}min`:''}`}
function longDateBR(dateStr:string){return new Date(dateStr+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
function relativeDate(dateStr:string){
  const t=todayStr();if(dateStr===t)return "Hoje";
  const d=new Date(dateStr+"T12:00:00");const now=new Date();now.setHours(12,0,0,0);
  const diff=Math.round((d.getTime()-now.getTime())/86400000);
  if(diff===-1)return "Ontem";if(diff===1)return "Amanhã";
  return d.toLocaleDateString("pt-BR",{day:"numeric",month:"short"});
}
function todayStr(){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}

export function AgendaTimeline({bookings,services,onData}:{bookings:Booking[],services:Service[],onData:(d:any)=>void}){
  const[now,setNow]=useState(getNowMinutes());
  const[today,setToday]=useState(todayStr);
  const[expandedHistory,setExpandedHistory]=useState(false);
  const[filterOpen,setFilterOpen]=useState(false);
  const[selectedDate,setSelectedDate]=useState(todayStr());
  const[activeFilter,setActiveFilter]=useState<string|null>(null);
  const[detailBooking,setDetailBooking]=useState<Booking|null>(null);
  const[customerDetail,setCustomerDetail]=useState<CustomerDetail|null>(null);
  const[loadingDetail,setLoadingDetail]=useState(false);
  const[updatingStatus,setUpdatingStatus]=useState<string|null>(null);

  useEffect(()=>{const id=setInterval(()=>{setNow(getNowMinutes());setToday(todayStr())},60000);return()=>clearInterval(id)},[]);

  const todayBookings=useMemo(()=>{
    return bookings.filter(b=>b.date===selectedDate).sort((a,b)=>a.start-b.start);
  },[bookings,selectedDate]);

  const customerNames=useMemo(()=>{
    const names=new Set(todayBookings.map(b=>b.name));
    return[...names].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  },[todayBookings]);

  const filteredBookings=useMemo(()=>{
    if(!activeFilter)return todayBookings;
    return todayBookings.filter(b=>b.name===activeFilter);
  },[todayBookings,activeFilter]);

  const {visible:visibleBookings,hiddenCount}=agendaHistory(filteredBookings,today,now,expandedHistory);
  const nowMarkerIndex=visibleBookings.findIndex(b=>b.start>now);
  const showNowMarker=selectedDate===today;
  const nowMarker=<div className="tl-now-marker"><div className="tl-now-line"/><div className="tl-now-badge"><span className="tl-now-dot"/>AGORA • {time(now)}</div><div className="tl-now-line"/></div>;

  const nextBooking=useMemo(()=>{
    return filteredBookings.find(b=>(selectedDate>today||(selectedDate===today&&b.start>now))&&b.status!=="finalizado"&&b.status!=="cancelado"&&b.status!=="nao_compareceu");
  },[filteredBookings,selectedDate,today,now]);

  const currentBooking=useMemo(()=>{
    return filteredBookings.find(b=>selectedDate===today&&b.start<=now&&b.end>now&&b.status!=="finalizado"&&b.status!=="cancelado"&&b.status!=="nao_compareceu");
  },[filteredBookings,selectedDate,today,now]);

  const loadCustomer=useCallback(async(phone:string)=>{
    setLoadingDetail(true);
    try{
      const r=await fetch(`/api/admin/customer?phone=${encodeURIComponent(phone)}`);
      if(r.ok)setCustomerDetail(await r.json());
    }catch{}finally{setLoadingDetail(false)}
  },[]);

  const updateStatus=useCallback(async(id:string,status:string)=>{
    setUpdatingStatus(id);
    try{
      const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"updateBookingStatus",id,status})});
      if(r.ok){
        const d=await r.json();
        if(d&&d.bookings)onData(d);
        setDetailBooking(prev=>prev&&prev.id===id?{...prev,status}:prev);
      }
    }catch{}finally{setUpdatingStatus(null)}
  },[onData]);

  useEffect(()=>{
    if(detailBooking)loadCustomer(detailBooking.phone);
  },[detailBooking,loadCustomer]);

  const changeDate=(date:string)=>{setSelectedDate(date);setActiveFilter(null);setExpandedHistory(false);setFilterOpen(false)};
  const chooseCustomer=(name:string|null)=>{setActiveFilter(name);setExpandedHistory(false);setFilterOpen(false)};
  const navigateDate=(offset:number)=>{
    const d=new Date(selectedDate+"T12:00:00");
    d.setDate(d.getDate()+offset);
    changeDate(d.toISOString().slice(0,10));
  };

  const openWhatsApp=(phone:string)=>{
    const num=phone.replace(/\D/g,"");
    window.open(`https://wa.me/${num}`,"_blank");
  };

  return(
    <div className="tl-root">
      <div className="tl-header">
        <div className="tl-header-top">
          <div className="tl-title-block">
            <h2 className="tl-title">{agendaTitle(selectedDate,today)}</h2>
            <p className="tl-date">{longDateBR(selectedDate)}</p>
          </div>
          <div className="tl-nav">
            <Button variant="outline" size="sm" className="tl-nav-btn" onClick={()=>changeDate(today)} disabled={selectedDate===today}>Hoje</Button>
            <Button variant="ghost" size="sm" className="tl-nav-btn" onClick={()=>navigateDate(-1)}><ChevronLeft size={16}/></Button>
            <Button variant="ghost" size="sm" className="tl-nav-btn" onClick={()=>navigateDate(1)}><ChevronRight size={16}/></Button>
          </div>
        </div>
        {customerNames.length>0&&<div className="tl-customer-filter">
          <label id="agenda-customer-label">Filtrar por cliente</label>
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between" aria-labelledby="agenda-customer-label agenda-customer-value">
                <span id="agenda-customer-value" className="truncate">{activeFilter||"Todos os clientes"}</span><ChevronsUpDown size={16}/>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Digite o nome do cliente..." aria-label="Buscar cliente por nome"/>
                <CommandList>
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="all-customers" keywords={["Todos os clientes"]} onSelect={()=>chooseCustomer(null)}>Todos os clientes{!activeFilter&&<Check className="ml-auto"/>}</CommandItem>
                    {customerNames.map(name=><CommandItem key={name} value={"customer:"+name} keywords={[name]} onSelect={()=>chooseCustomer(name)}>{name}{activeFilter===name&&<Check className="ml-auto"/>}</CommandItem>)}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>}
      </div>

      {nextBooking&&(
        <div className="tl-next">
          <div className="tl-next-label">Próximo atendimento</div>
          <div className="tl-next-content">
            <div className="tl-next-time">{time(nextBooking.start)}</div>
            <div className="tl-next-info">
              <div className="tl-next-name">{nextBooking.name}</div>
              <div className="tl-next-service">{nextBooking.service} • {(services.find(s=>s.id===nextBooking.service)?.duration)||30} min</div>
              <div className="tl-next-barber">Barbeiro: {nextBooking.barber==="qualquer"?"Qualquer disponível":nextBooking.barber}</div>
            </div>
            {selectedDate===today&&minutesUntil(nextBooking.start)&&<div className="tl-next-countdown">Faltam {minutesUntil(nextBooking.start)}</div>}
          </div>
        </div>
      )}

      {filteredBookings.length===0?(
        <div className="tl-empty">
          <Calendar size={40} strokeWidth={1.2}/>
          <p>Nenhum agendamento para este dia.</p>
        </div>
      ):(
        <div className="tl-timeline">
          {hiddenCount>0&&<Button variant="outline" className="mb-4 w-full" aria-expanded={expandedHistory} aria-controls="agenda-appointments" onClick={()=>setExpandedHistory(value=>!value)}>{expandedHistory?"Ver menos":`Ver mais (${hiddenCount} anteriores)`}</Button>}
          <div id="agenda-appointments">
          {visibleBookings.map((booking,i)=>{
            const status=getStatus(booking.status);
            const cfg=STATUS_CONFIG[status];
            const isPast=isPastAppointment(booking,today,now);
            const isCurrent=currentBooking?.id===booking.id;
            const isFuture=booking.date>today||(booking.date===today&&booking.start>now);
            const svc=services.find(s=>s.id===booking.service);
            const duration=svc?.duration||(booking.end-booking.start);
            return(
              <div key={booking.id} className="tl-item-wrapper">
                {showNowMarker&&i===nowMarkerIndex&&nowMarker}
                <div className={"tl-item"+(isPast?" past":"")+(isCurrent?" current":"")+(isFuture?" future":"")}>
                  <div className="tl-time-col">
                    <span className="tl-time">{time(booking.start)}</span>
                    <span className="tl-time-end">{time(booking.end)}</span>
                  </div>
                  <div className="tl-marker-col">
                    <div className={"tl-marker "+status} style={{borderColor:cfg.color,backgroundColor:isCurrent?cfg.color:cfg.bg}}/>
                    {i<visibleBookings.length-1&&<div className="tl-line"/>}
                  </div>
                  <div className={"tl-card"+(isCurrent?" current":"")+(isPast?" past":"")} onClick={()=>setDetailBooking(booking)}>
                    <div className="tl-card-header">
                      <div className="tl-card-avatar" style={{backgroundColor:cfg.bg,color:cfg.color}}>
                        {getInitials(booking.name)}
                      </div>
                      <div className="tl-card-main">
                        <div className="tl-card-name">{booking.name}</div>
                        <div className="tl-card-service">
                          <Scissors size={13}/>
                          <span>{booking.service||"Serviço"}</span>
                          <span className="tl-card-dot">•</span>
                          <Timer size={13}/>
                          <span>{duration} min</span>
                        </div>
                        <div className="tl-card-barber">
                          <User size={12}/>
                          <span>{booking.barber==="qualquer"?"Qualquer disponível":booking.barber}</span>
                        </div>
                      </div>
                      <Badge className={"tl-badge "+status} style={{backgroundColor:cfg.bg,color:cfg.color,borderColor:cfg.color+"33"}}>{cfg.label}</Badge>
                    </div>
                    <div className="tl-card-footer">
                      <span className="tl-card-price">{price(svc?.priceCents??null)}</span>
                      <span className="tl-card-phone"><Phone size={12}/>{booking.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {showNowMarker&&nowMarkerIndex===-1&&nowMarker}
          </div>
        </div>
      )}

      <Sheet open={!!detailBooking} onOpenChange={(o)=>{if(!o){setDetailBooking(null);setCustomerDetail(null)}}}>
        <SheetContent className="tl-drawer" side="right">
          {detailBooking&&<>
            <SheetHeader>
              <SheetTitle className="tl-drawer-title">{detailBooking.name}</SheetTitle>
              <SheetDescription>{detailBooking.service} • {time(detailBooking.start)} – {time(detailBooking.end)}</SheetDescription>
            </SheetHeader>
            <ScrollArea className="tl-drawer-scroll">
              <div className="tl-drawer-body">
                <div className="tl-drawer-status">
                  <Badge className={"tl-badge "+getStatus(detailBooking.status)} style={{backgroundColor:STATUS_CONFIG[getStatus(detailBooking.status)].bg,color:STATUS_CONFIG[getStatus(detailBooking.status)].color,borderColor:STATUS_CONFIG[getStatus(detailBooking.status)].color+"33"}}>
                    {(()=>{const I=STATUS_CONFIG[getStatus(detailBooking.status)].icon;return<I size={13}/>})()}
                    {STATUS_CONFIG[getStatus(detailBooking.status)].label}
                  </Badge>
                  {detailBooking.date===today&&minutesUntil(detailBooking.start)&&<span className="tl-drawer-countdown">Faltam {minutesUntil(detailBooking.start)}</span>}
                </div>

                <div className="tl-drawer-section">
                  <h4>Detalhes do atendimento</h4>
                  <div className="tl-drawer-grid">
                    <div className="tl-drawer-field"><span className="tl-drawer-label">Data</span><span>{relativeDate(detailBooking.date)}</span></div>
                    <div className="tl-drawer-field"><span className="tl-drawer-label">Horário</span><span>{time(detailBooking.start)} – {time(detailBooking.end)}</span></div>
                    <div className="tl-drawer-field"><span className="tl-drawer-label">Serviço</span><span>{detailBooking.service}</span></div>
                    <div className="tl-drawer-field"><span className="tl-drawer-label">Barbeiro</span><span>{detailBooking.barber==="qualquer"?"Qualquer disponível":detailBooking.barber}</span></div>
                    <div className="tl-drawer-field"><span className="tl-drawer-label">Duração</span><span>{(services.find(s=>s.id===detailBooking.service)?.duration)||(detailBooking.end-detailBooking.start)} min</span></div>
                    <div className="tl-drawer-field"><span className="tl-drawer-label">Valor</span><span>{price(services.find(s=>s.id===detailBooking.service)?.priceCents??null)}</span></div>
                    <div className="tl-drawer-field"><span className="tl-drawer-label">Telefone</span><span>{detailBooking.phone}</span></div>
                  </div>
                </div>

                <Separator/>

                {customerDetail&&(
                  <div className="tl-drawer-section">
                    <h4>Cliente</h4>
                    <div className="tl-drawer-grid">
                      <div className="tl-drawer-field"><span className="tl-drawer-label">Nome</span><span>{customerDetail.name}</span></div>
                      <div className="tl-drawer-field"><span className="tl-drawer-label">Visitas</span><span>{customerDetail.totalVisits}</span></div>
                      {customerDetail.lastVisit&&<div className="tl-drawer-field"><span className="tl-drawer-label">Último atendimento</span><span>{relativeDate(customerDetail.lastVisit)}</span></div>}
                      {customerDetail.history.length>0&&(
                        <div className="tl-drawer-field full">
                          <span className="tl-drawer-label">Serviços realizados</span>
                          <div className="tl-drawer-services">
                            {[...new Set(customerDetail.history.map((h:any)=>h.service))].map(s=><Badge key={s} variant="outline" className="tl-drawer-service-badge">{s}</Badge>)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {loadingDetail&&!customerDetail&&<p className="tl-drawer-loading">Carregando dados do cliente...</p>}

                <Separator/>

                <div className="tl-drawer-section">
                  <h4>Alterar status</h4>
                  <div className="tl-status-grid">
                    {(Object.entries(STATUS_CONFIG) as [StatusKey,typeof STATUS_CONFIG.agendado][]).map(([key,cfg])=>{
                      const I=cfg.icon;
                      const active=detailBooking.status===key;
                      const busy=updatingStatus===detailBooking.id;
                      return(
                        <button key={key} className={"tl-status-btn"+(active?" active":"")} disabled={busy||active} onClick={()=>updateStatus(detailBooking.id,key)} style={active?{borderColor:cfg.color,backgroundColor:cfg.bg}:undefined}>
                          <I size={15} style={{color:cfg.color}}/>
                          <span>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="tl-drawer-actions">
                  <Button variant="outline" className="tl-action-btn" onClick={()=>openWhatsApp(detailBooking.phone)}><MessageCircle size={16}/>WhatsApp</Button>
                  {getStatus(detailBooking.status)==="confirmado"&&<Button className="tl-action-btn primary" onClick={()=>updateStatus(detailBooking.id,"em_atendimento")} disabled={updatingStatus===detailBooking.id}><PlayCircle size={16}/>Iniciar</Button>}
                  {getStatus(detailBooking.status)==="em_atendimento"&&<Button className="tl-action-btn primary" onClick={()=>updateStatus(detailBooking.id,"finalizado")} disabled={updatingStatus===detailBooking.id}><StopCircle size={16}/>Finalizar</Button>}
                </div>
              </div>
            </ScrollArea>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
