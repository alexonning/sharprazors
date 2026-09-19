"use client";

import {useState} from "react";
import {format} from "date-fns";
import {ptBR} from "date-fns/locale";
import {CalendarDays} from "lucide-react";
import {Calendar} from "@/components/ui/calendar";
import {Button} from "@/components/ui/button";
import {Popover,PopoverContent,PopoverTrigger} from "@/components/ui/popover";

export function DateCalendar({value,onChange,min,max,id,label="Selecionar data",inline=false}:{
  value:string;onChange:(date:string)=>void;min?:string;max?:string;id?:string;label?:string;inline?:boolean;
}) {
  const [open,setOpen]=useState(false);
  const selected=new Date(`${value}T12:00:00`);
  const lower=min?new Date(`${min}T00:00:00`):undefined;
  const upper=max?new Date(`${max}T23:59:59`):undefined;
  const calendar=<Calendar mode="single" required locale={ptBR} selected={selected}
    defaultMonth={selected} captionLayout="dropdown"
    startMonth={lower??new Date(selected.getFullYear()-10,0)}
    endMonth={upper??new Date(selected.getFullYear()+10,11)}
    disabled={day=>Boolean((lower&&day<lower)||(upper&&day>upper))}
    onSelect={day=>{if(day){onChange(format(day,"yyyy-MM-dd"));setOpen(false)}}}
    formatters={{formatMonthDropdown:day=>format(day,"MMMM",{locale:ptBR})}}
    className="rounded-lg border"/>;
  if(inline)return <div id={id} role="group" aria-label={label} className="date-calendar">{calendar}</div>;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button id={id} type="button" variant="outline" aria-label={`${label}: ${format(selected,"dd/MM/yyyy")}`}><CalendarDays size={16}/>{format(selected,"dd/MM/yyyy")}</Button></PopoverTrigger>
    <PopoverContent align="end" className="w-auto p-0">{calendar}</PopoverContent>
  </Popover>;
}
