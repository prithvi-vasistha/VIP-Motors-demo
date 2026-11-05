"use client";
import { QueryView } from "./query-view";
import Link from "next/link";
import { formatQuote } from "@/lib/pricing";
import { filterOptions, filterInventory, inventoryUrl, readFilters, type SearchParams } from "@/lib/inventory";
import { InventoryControls } from "@/components/inventory-controls";
import { VehicleCard } from "@/components/vehicle-card";
function InventoryView({ params }: { params: SearchParams }) {
  const filters = readFilters(params);
  const vehicles = filterInventory(filters);
  const active = Object.entries(filters).filter(([key, value]) => key !== "sort" && value);
  const from = inventoryUrl(filters);
  return <main id="main" className="container inventory-page"><div className="page-heading"><div><p className="section-kicker">The Private Gallery</p><h1>The inventory.</h1></div><p>Take your time.<br/>Find what moves you.</p></div><p className="preview-explanation">Explore the collection by make, model and budget. Enquire for current availability and final pricing.</p>
    <InventoryControls options={filterOptions} filters={filters} count={vehicles.length}/>
    {active.length ? <div className="active-filters" aria-label="Applied filters">{active.map(([key, value]) => <Link key={key} href={inventoryUrl({ ...filters, [key]: "" })} scroll={false} aria-label={`Remove ${key} filter: ${value}`}>{key === "q" ? `Search: ${value}` : key === "maxPrice" ? `Up to ${formatQuote(Number(value))}` : value}<span aria-hidden="true">×</span></Link>)}<Link className="clear-filters" href="/inventory" scroll={false}>Clear all</Link></div> : null}
    {vehicles.length ? <div className="inventory-grid">{vehicles.map(v => <VehicleCard key={v.id} vehicle={v} from={from}/>)}</div> : <section className="empty-state"><p className="section-kicker">Room to reconsider</p><h2>No vehicles match just yet.</h2><p>Try another make or remove a filter to see more of the collection.</p><Link className="button button-dark" href="/inventory">Reset filters</Link></section>}
    <div className="inventory-end"><span className="shoulder-rule"/><p>You’ve seen the collection.</p><Link href="/contact" className="text-link">Prepare a general enquiry</Link></div>
  </main>;
}

export function InventoryPageView() { return <QueryView>{params => <InventoryView params={params}/>}</QueryView>; }
