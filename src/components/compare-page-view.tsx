"use client";
import { QueryView } from "./query-view";
import { sitePath } from "@/lib/site-path";
import Link from "next/link";
import { ImagePlate } from "@/components/image-plate";
import { inventory, number, priceLabel } from "@/lib/inventory";
import type { SearchParams } from "@/lib/filters";
import type { Vehicle } from "@/lib/types";

const rows: { label: string; value: (vehicle: Vehicle) => string }[] = [
  { label: "Indicative price", value: v => priceLabel(v.price) },
  { label: "Year", value: v => v.year ? String(v.year) : "—" },
  { label: "Kilometres", value: v => v.mileage !== undefined ? `${number(v.mileage)} km` : "—" },
  { label: "Fuel", value: v => v.fuel ?? "—" },
  { label: "Transmission", value: v => v.transmission ?? "—" },
  { label: "Body", value: v => v.body },
  { label: "Variant", value: v => v.variant || "—" },
];

function CompareView({ params }: { params: SearchParams }) {
  const first = inventory.find(v => v.slug === params.first) ?? inventory[0];
  const requestedSecond = inventory.find(v => v.slug === params.second);
  const second = requestedSecond && requestedSecond.slug !== first?.slug ? requestedSecond : inventory.find(v => v.slug !== first?.slug);
  const selected = [first, second].filter((v): v is Vehicle => Boolean(v));
  return <main id="main" className="container compare-page">
    <div className="compare-heading"><p className="section-kicker">A closer comparison</p><h1>Side by side.</h1><p>Compare the details that matter, then see your favourites in person.</p></div>
    {selected.length === 2 ? <>
      <form className="compare-controls" action={sitePath("/compare/")} method="get">
        {selected.map((v, i) => <div className="field" key={i}><label htmlFor={`compare-${i}`}>{i === 0 ? "First car" : "Second car"}</label><select id={`compare-${i}`} name={i === 0 ? "first" : "second"} key={v.slug} defaultValue={v.slug}>{inventory.map(car => <option key={car.slug} value={car.slug}>{car.make} {car.model}{car.year ? ` · ${car.year}` : ""}</option>)}</select></div>)}
        <button className="button button-dark" type="submit">Compare cars</button>
      </form>
      {params.first === params.second && params.first ? <p className="compare-notice" role="status">Choose two different cars. We’ve shown another vehicle alongside your first choice.</p> : null}
      <div className="compare-scroll" role="region" aria-label="Vehicle comparison" tabIndex={0}>
        <table className="compare-table"><caption className="sr-only">Compare {selected.map(v => `${v.make} ${v.model}`).join(" and ")}</caption><thead><tr><td/><>{selected.map(v => <th scope="col" key={v.id}><Link href={`/inventory/${v.slug}`}><ImagePlate image={v.images[0]} sizes="(max-width: 700px) 260px, 40vw"/><span>{v.make} {v.model}</span><small>View vehicle</small></Link></th>)}</></tr></thead><tbody>{rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th>{selected.map(v => <td key={v.id}>{row.value(v)}</td>)}</tr>)}</tbody></table>
      </div>
      <p className="fine-print compare-footnote">Prices and availability are subject to confirmation. Contact our team for full vehicle details.</p>
    </> : <p className="compare-notice">More cars will be available to compare soon. <Link className="text-link" href="/inventory">Explore inventory</Link></p>}
  </main>;
}

export function ComparePageView() { return <QueryView>{params => <CompareView params={params}/>}</QueryView>; }
