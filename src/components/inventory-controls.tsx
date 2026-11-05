"use client";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import type { InventoryFilters } from "@/lib/types";
import { inventoryUrl, sortOptions, emptyFilters } from "@/lib/filters";
import { budgetOptions, formatQuote } from "@/lib/pricing";
type Options = Record<"make" | "body" | "fuel" | "year", string[]>;
import { ArrowIcon, CloseIcon, FilterIcon, SearchIcon } from "./icons";

function FilterForm({ filters, onApply, options, drawer = false }: { filters: InventoryFilters; options: Options; onApply: (filters: InventoryFilters) => void; drawer?: boolean }) {
  const id = useId();
  return <form className={`filter-form ${drawer ? "drawer-filter-form" : ""}`} onSubmit={event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onApply({ ...filters, q: String(data.get("q") ?? "").trim(), make: String(data.get("make") ?? ""), body: String(data.get("body") ?? ""), fuel: String(data.get("fuel") ?? ""), year: String(data.get("year") ?? ""), maxPrice: String(data.get("maxPrice") ?? "") });
  }}>
    <div className="search-field"><label htmlFor={`${id}-q`}>Search the collection</label><div><SearchIcon/><input id={`${id}-q`} name="q" type="search" autoComplete="off" maxLength={100} defaultValue={filters.q} placeholder="Search make or model…"/></div></div>
    <div className="filter-selects">{(["make", "body", "fuel", "year"] as const).map(key => <div className="field" key={key}><label htmlFor={`${id}-${key}`}>{key === "body" ? "Body style" : key[0].toUpperCase() + key.slice(1)}</label><select id={`${id}-${key}`} name={key} defaultValue={filters[key]}><option value="">{key === "make" ? "All makes" : key === "body" ? "All body styles" : key === "fuel" ? "All fuels" : "All years"}</option>{options[key].map(value => <option key={value} value={value}>{value}</option>)}</select></div>)}</div>
    <div className="field budget-field"><label htmlFor={`${id}-budget`}>Maximum price</label><select id={`${id}-budget`} name="maxPrice" defaultValue={filters.maxPrice}><option value="">Any budget</option>{filters.maxPrice && !budgetOptions.includes(Number(filters.maxPrice)) ? <option value={filters.maxPrice}>Up to {formatQuote(Number(filters.maxPrice))}</option> : null}{budgetOptions.map(amount => <option key={amount} value={amount}>Up to {formatQuote(amount)}</option>)}</select></div>
    <div className="filter-actions"><button type="submit" className="button button-dark">{drawer ? "Show vehicles" : "Apply filters"}<ArrowIcon/></button><button type="button" className="text-button" onClick={() => onApply({ ...emptyFilters })}>Reset filters</button></div>
  </form>;
}

export function InventoryControls({ filters, count, options }: { filters: InventoryFilters; count: number; options: Options }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const apply = (next: InventoryFilters) => { setOpen(false); startTransition(() => router.push(inventoryUrl(next), { scroll: false })); };
  const activeCount = [filters.q, filters.make, filters.body, filters.fuel, filters.year, filters.maxPrice].filter(Boolean).length;
  return <div className="inventory-controls" aria-busy={pending}>
    <div className="desktop-filters" key={inventoryUrl(filters)}><FilterForm options={options} filters={filters} onApply={apply}/></div>
    <div className="result-toolbar"><p className="result-count" aria-live="polite">{pending ? "Updating collection…" : `${count} ${count === 1 ? "vehicle" : "vehicles"}`}</p>
      <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger className="mobile-filter-button"><FilterIcon/>Filters{activeCount ? ` (${activeCount})` : ""}</Dialog.Trigger><Dialog.Portal><Dialog.Backdrop className="dialog-backdrop"/><Dialog.Popup className="filter-drawer drawer"><div className="panel-heading"><Dialog.Title>Refine the collection</Dialog.Title><Dialog.Close className="icon-button" aria-label="Close filters"><CloseIcon/></Dialog.Close></div><Dialog.Description className="muted">Find a vehicle that fits what you have in mind.</Dialog.Description><FilterForm key={`${open}-${inventoryUrl(filters)}`} options={options} filters={filters} onApply={apply} drawer/></Dialog.Popup></Dialog.Portal></Dialog.Root>
      <div className="sort-field"><label htmlFor="inventory-sort">Sort by</label><select id="inventory-sort" name="sort" value={filters.sort} onChange={e => apply({ ...filters, sort: e.target.value })}>{sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
    </div>
  </div>;
}
