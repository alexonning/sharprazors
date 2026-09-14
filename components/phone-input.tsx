"use client";
import {useRef} from "react";
import {Input} from "@/components/ui/input";
import {formatPhone} from "@/lib/phone";
export function PhoneInput({id,value,onChange,disabled,describedBy}:{id:string,value:string,onChange:(value:string)=>void,disabled:boolean,describedBy?:string}){
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
return <Input ref={inputRef} id={id} autoComplete="tel" inputMode="tel" type="tel" placeholder="(46) 99999-9999" required disabled={disabled} value={value} onChange={e=>update(e.target.value,e.target.selectionStart??e.target.value.length)} onKeyDown={e=>{
 const el=e.currentTarget,start=el.selectionStart??0,end=el.selectionEnd??0;
 if(start!==end||!['Backspace','Delete'].includes(e.key))return;
 const backwards=e.key==='Backspace';let index=backwards?start-1:start;
 if(index<0||index>=value.length||/\d/.test(value[index]))return;
 e.preventDefault();
 while(index>=0&&index<value.length&&!/\d/.test(value[index]))index+=backwards?-1:1;
 if(index>=0&&index<value.length)update(value.slice(0,index)+value.slice(index+1),backwards?index:start);
 }} aria-describedby={describedBy}/>;
}
