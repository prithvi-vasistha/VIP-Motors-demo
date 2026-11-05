"use client";
import { QueryView } from "./query-view";
import { ServicePlanner } from "@/components/service-planner";
import { inventory } from "@/lib/inventory";
import type { SearchParams } from "@/lib/filters";
import { dealership } from "@/lib/dealership";

function WarrantyView({ params }: { params: SearchParams }) {
  const cars = inventory.map(v => ({ slug: v.slug, name: `${v.make} ${v.model}`, year: v.year, mileage: v.mileage, price: v.price.kind === "numeric" ? v.price.amount : 0 }));
  const initial = cars.find(c => c.slug === params.vehicle) ?? cars.find(c => c.slug === "mercedes-c220d-2023") ?? cars[0];
  return <main id="main" className="container services-page warranty-page">
    <header className="services-heading"><div><p className="section-kicker">Extended warranty</p><h1>Confidence for<br/>the miles ahead.</h1></div><div><p>A considered car deserves considered cover. Choose your vehicle and the period you have in mind, and we’ll help you explore the available warranty options.</p><a className="text-link" href="#warranty-planner">Build your warranty brief</a></div></header>
    <section id="warranty-planner" aria-labelledby="warranty-plan-title"><div className="service-section-heading"><h2 id="warranty-plan-title">Start with your car.</h2><p>A few details help the team find a suitable starting point for your cover.</p></div><ServicePlanner key={initial?.slug} cars={cars} initialVehicle={initial?.slug ?? ""} kind="warranty"/></section>
    <div className="warranty-review-topics"><section><h2>What’s covered.</h2><p>Ask about the engine, transmission, electrical systems and other components included in the available plan. Confirm the covered-parts list and any claim limits.</p></section><section><h2>What to check.</h2><p>Review wear-and-tear exclusions, consumables, deductibles, service requirements and the repair process before choosing your cover.</p></section><section><h2>A personal review.</h2><p>The car’s history matters. Keep its service records and any existing warranty details ready for your conversation with the team.</p></section></div>
    <section className="service-faq" aria-labelledby="warranty-faq-title"><div><p className="section-kicker">Your questions</p><h2 id="warranty-faq-title">Know your cover.</h2><a className="text-link" href={dealership.telephone}>Call {dealership.phone}</a></div><div><details><summary>Is a plan automatically available for every car?</summary><p>Availability is confirmed after reviewing the car’s age, mileage, condition and service history. The preferences above help prepare that review and do not confirm eligibility.</p></details><details><summary>Is extended warranty the same as insurance?</summary><p>No. They cover different risks. Ask the team to explain what each proposed policy covers, the exclusions and how a claim is handled.</p></details><details><summary>Can I request a different cover period?</summary><p>Yes. Choose the closest preference above and add your preferred term to the enquiry. The team will confirm the periods available for your chosen car.</p></details></div></section>
  </main>;
}

export function WarrantyPageView() { return <QueryView>{params => <WarrantyView params={params}/>}</QueryView>; }
