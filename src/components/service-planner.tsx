"use client";
import Link from "next/link";
import { useState } from "react";
import type { FinanceCar } from "@/lib/finance";
import { insuranceEnquiry, insurancePreferences, warrantyEnquiry, type InsurancePreference } from "@/lib/service-plans";
import { ArrowIcon } from "./icons";

export function ServicePlanner({ cars, initialVehicle, kind }: { cars: FinanceCar[]; initialVehicle: string; kind: "insurance" | "warranty" }) {
  const [slug, setSlug] = useState(initialVehicle);
  const [cover, setCover] = useState<InsurancePreference>("comprehensive");
  const [zeroDep, setZeroDep] = useState(false);
  const [months, setMonths] = useState<12 | 24>(12);
  const [annualKm, setAnnualKm] = useState(10000);
  const car = cars.find(c => c.slug === slug);
  const insurance = kind === "insurance";
  const selectedCover = insurancePreferences.find(p => p.id === cover)!;
  const message = insurance ? insuranceEnquiry(car, cover, zeroDep) : warrantyEnquiry(car, months, annualKm);
  const href = `/contact?${new URLSearchParams({ topic: insurance ? "insurance" : "extended-warranty", message })}`;
  const formatKm = (km: number) => `${new Intl.NumberFormat("en-IN").format(km)} km`;
  return <div className={`service-planner ${insurance ? "insurance-planner" : "warranty-planner"}`}>
    <div className="service-planner-fields">
      <div className="field"><label htmlFor={`${kind}-vehicle`}>Choose a vehicle</label><select id={`${kind}-vehicle`} value={slug} onChange={e => setSlug(e.target.value)}>{cars.map(car => <option key={car.slug} value={car.slug}>{car.name}{car.year ? ` · ${car.year}` : ""}</option>)}</select></div>
      {insurance ? <><fieldset className="service-choice-set"><legend>What would you like to explore?</legend>{insurancePreferences.map(p => <label className="service-radio" key={p.id}><input type="radio" name="insurance-cover" value={p.id} checked={cover === p.id} onChange={() => setCover(p.id)}/><span><strong>{p.name}</strong><small>{p.description}</small></span></label>)}</fieldset><label className="service-checkbox"><input type="checkbox" checked={zeroDep} onChange={e => setZeroDep(e.target.checked)}/><span>Ask about zero-depreciation cover</span></label></> : <div className="finance-fields"><div className="field"><label htmlFor="warranty-term">Preferred cover period</label><select id="warranty-term" value={months} onChange={e => setMonths(Number(e.target.value) as 12 | 24)}><option value={12}>12 months</option><option value={24}>24 months</option></select></div><div className="field"><label htmlFor="warranty-driving">Expected annual driving</label><select id="warranty-driving" value={annualKm} onChange={e => setAnnualKm(Number(e.target.value))}>{[5000, 10000, 15000, 20000, 30000].map(km => <option key={km} value={km}>{formatKm(km)}</option>)}</select></div></div>}
    </div>
    <aside className="service-brief" aria-labelledby={`${kind}-brief-title`}><p className="section-kicker">Your {insurance ? "insurance" : "warranty"} brief</p><h3 id={`${kind}-brief-title`}>{car?.name ?? "Your chosen car"}</h3><p className="service-brief-meta">{[car?.year, car?.mileage !== undefined ? formatKm(car.mileage) : undefined].filter(Boolean).join(" · ")}</p>
      <dl>{insurance ? <><div><dt>Cover to discuss</dt><dd>{selectedCover.name}</dd></div><div><dt>Zero-depreciation add-on</dt><dd>{zeroDep ? "Check availability" : "Not requested"}</dd></div></> : <><div><dt>Preferred cover period</dt><dd>{months} months</dd></div><div><dt>Expected annual driving</dt><dd>{formatKm(annualKm)}</dd></div>{car?.mileage !== undefined ? <div><dt>Projected mileage after {months} months</dt><dd>{formatKm(car.mileage + annualKm * months / 12)}</dd></div> : null}</>}</dl>
      <Link className="button button-dark" href={href}>{insurance ? "Get an insurance quote" : "Discuss warranty options"} <ArrowIcon/></Link>
      <p className="service-note">{insurance ? "The team will confirm the premium after reviewing the car, your policy history and cover requirements." : "Available cover, term and price are confirmed after checking the car’s age, mileage, service history and condition."}</p>
    </aside>
  </div>;
}
