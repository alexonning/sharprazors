"use client";

import {
  Combobox, ComboboxChips, ComboboxChip, ComboboxChipsInput,
  ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList,
  ComboboxTrigger, ComboboxValue, useComboboxAnchor,
} from "@/components/ui/combobox";

type MultiSelectProps = {
  id: string;
  items: string[];
  value: string[];
  onValueChange: (values: string[]) => void;
  placeholder?: string;
};

// Multiple values, inline removable tokens and a searchable option list.
export function MultiSelect({id,items,value,onValueChange,placeholder="Selecione..."}:MultiSelectProps) {
  const anchor=useComboboxAnchor();
  return <Combobox multiple items={items} value={value} onValueChange={onValueChange}>
    <ComboboxChips ref={anchor} className="w-full rounded-xl">
      <ComboboxValue>{(values:string[])=>values.map(name=>
        <ComboboxChip key={name} aria-label={name}>{name}</ComboboxChip>
      )}</ComboboxValue>
      <ComboboxChipsInput id={id} placeholder={value.length?"Buscar mais clientes...":placeholder}/>
      <ComboboxTrigger aria-label="Abrir lista de clientes"/>
    </ComboboxChips>
    <ComboboxContent anchor={anchor} className="rounded-xl">
      <ComboboxEmpty>Nenhum cliente encontrado.</ComboboxEmpty>
      <ComboboxList aria-label="Clientes">
        {(name:string)=><ComboboxItem key={name} value={name}>{name}</ComboboxItem>}
      </ComboboxList>
    </ComboboxContent>
  </Combobox>;
}
