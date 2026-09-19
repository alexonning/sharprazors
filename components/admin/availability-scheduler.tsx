"use client";

import {useState} from "react";
import {Copy,Plus,X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {Popover,PopoverContent,PopoverTrigger} from "@/components/ui/popover";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "@/components/ui/select";
import {time,weekdays,type DayHours,type Period} from "@/lib/booking";

const days=[1,2,3,4,5,6,0];
const options=Array.from({length:289},(_,i)=>i*5);

function CopyDay({day,onCopy,disabled}:{day:number;onCopy:(targets:number[])=>void;disabled:boolean}){
  const [open,setOpen]=useState(false);
  const [targets,setTargets]=useState<number[]>([]);
  return <Popover open={open} onOpenChange={next=>{setOpen(next);setTargets([])}}>
    <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`Copiar horários de ${weekdays[day]}`}><Copy size={16}/></Button></PopoverTrigger>
    <PopoverContent align="end" className="scheduler-copy">
      <strong>Copiar horários para</strong>
      {days.filter(d=>d!==day).map(d=><label key={d}><input type="checkbox" checked={targets.includes(d)} onChange={e=>setTargets(current=>e.target.checked?[...current,d]:current.filter(t=>t!==d))}/>{weekdays[d]}</label>)}
      <Button type="button" disabled={!targets.length||disabled} onClick={()=>{onCopy(targets);setOpen(false)}}>Aplicar horários</Button>
    </PopoverContent>
  </Popover>;
}

/** Weekly editor inspired by beUI Availability Scheduler, adapted to the stored schedule. */
export function AvailabilityScheduler({value,onChange,disabled=false}:{value:DayHours[];onChange:(hours:DayHours[])=>void;disabled?:boolean}){
  const [openPanel,setOpenPanel]=useState<string|null>(null);
  const update=(day:number,next:DayHours)=>onChange(value.map((d,i)=>i===day?next:d));
  return <div className="availability-scheduler">{days.map(day=>{
    const state=value[day];
    const setPeriods=(periods:Period[])=>update(day,{...state,periods});
    const lastEnd=state.periods.at(-1)?.[1]??420;
    const nextStart=Math.max(lastEnd,Math.min(lastEnd+60,1435));
    const canAdd=state.periods.length<4&&lastEnd<1440;
    return <div key={day} className="scheduler-day" data-closed={state.closed}>
      <div className="scheduler-day-label"><Switch id={`available-${day}`} checked={!state.closed} disabled={disabled} onCheckedChange={enabled=>{setOpenPanel(null);update(day,{closed:!enabled,periods:enabled&&!state.periods.length?[[480,720]]:state.periods})}}/><label htmlFor={`available-${day}`}>{weekdays[day]}</label></div>
      <div className="scheduler-ranges">{state.closed?<span className="scheduler-unavailable">Sem atendimento</span>:state.periods.map((range,index)=><div className="scheduler-range" key={index}>
        {([0,1] as const).map(edge=>{
          const panel=`${day}-${index}-${edge}`;
          const choices=[...new Set([...options,range[edge]])].sort((a,b)=>a-b).filter(n=>edge===0?n<range[1]&&(index===0||n>=state.periods[index-1][1]):n>range[0]&&(index===state.periods.length-1||n<=state.periods[index+1][0]));
          return <div key={edge} className="scheduler-time">{edge===1&&<span aria-hidden="true">–</span>}<Select value={String(range[edge])} disabled={disabled} open={openPanel===panel} onOpenChange={open=>setOpenPanel(current=>open?panel:current===panel?null:current)} onValueChange={v=>setPeriods(state.periods.map((p,i)=>i===index?(edge===0?[Number(v),p[1]]:[p[0],Number(v)]):p))}>
            <SelectTrigger aria-label={`${weekdays[day]}: ${edge===0?"início":"fim"} do período ${index+1}`}><SelectValue/></SelectTrigger>
            <SelectContent>{choices.map(n=><SelectItem key={n} value={String(n)}>{time(n)}</SelectItem>)}</SelectContent>
          </Select></div>;
        })}
        <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`Remover período ${index+1} de ${weekdays[day]}`} onClick={()=>{setOpenPanel(null);const periods=state.periods.filter((_,i)=>i!==index);update(day,{closed:periods.length===0,periods})}}><X size={16}/></Button>
      </div>)}</div>
      <div className="scheduler-actions">{!state.closed&&<Button type="button" variant="ghost" size="icon" disabled={disabled||!canAdd} aria-label={`Adicionar período em ${weekdays[day]}`} onClick={()=>setPeriods([...state.periods,[nextStart,Math.min(nextStart+120,1440)]])}><Plus size={17}/></Button>}
        <CopyDay day={day} disabled={disabled} onCopy={targets=>{setOpenPanel(null);onChange(value.map((d,i)=>targets.includes(i)?structuredClone(state):d))}}/>
      </div>
    </div>;
  })}</div>;
}
