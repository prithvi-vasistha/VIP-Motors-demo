"use client";
import { QueryView } from "./query-view";
import Link from "next/link";
import { FinanceCalculator } from "@/components/finance-calculator";
import { ServicePlanner } from "@/components/service-planner";
import { defaultFinance } from "@/lib/finance";
import { inventory } from "@/lib/inventory";
import type { SearchParams } from "@/lib/filters";
import { dealership } from "@/lib/dealership";

function FinanceView({ params }: { params: SearchParams }) {
  const cars = inventory.flatMap(v => v.price.kind === "numeric" && v.price.currency === "INR" ? [{ slug: v.slug, name: `${v.make} ${v.model}`, year: v.year, mileage: v.mileage, price: v.price.amount }] : []);
  const initial = defaultFinance(cars, params);
  return <main id="main" className="container services-page finance-page">
    <header className="services-heading"><div><p className="section-kicker">Finance and insurance</p><h1>A plan for<br/>your next drive.</h1></div><div><p>Start with the car. Shape the repayments around you. Then speak with our team about finance and cover for the road ahead.</p><nav className="service-jump-links" aria-label="Finance and insurance sections"><a href="#finance-calculator">Calculate EMI</a><a href="#insurance">Explore insurance</a></nav></div></header>
    <FinanceCalculator cars={cars} initial={initial}/>
    <section id="insurance" className="insurance-section" aria-labelledby="insurance-title"><div className="service-section-heading service-section-split"><div><p className="section-kicker">Insurance, considered</p><h2 id="insurance-title">Cover that suits the car.</h2></div><p>Choose what you’d like to explore. We’ll help you review the insured value, deductibles, available add-ons and the final premium before you decide.</p></div><ServicePlanner cars={cars} initialVehicle={initial.vehicle} kind="insurance"/></section>
    <section className="service-faq" aria-labelledby="finance-faq-title"><div><p className="section-kicker">A little clarity</p><h2 id="finance-faq-title">Before you decide.</h2><a className="text-link" href={dealership.telephone}>Speak to the team</a></div><div>
      <details><summary>What documents will I need for finance?</summary><p>Lenders commonly ask for identity and address proof, income documents, recent bank statements and vehicle details. The team will confirm the checklist for your application. You don’t need to upload financial documents to use this calculator.</p></details>
      <details><summary>Does this estimate include all charges?</summary><p>The EMI covers the loan principal and interest. Processing fees, insurance, registration, valuation and other charges are additional. Ask for the complete lender quotation before proceeding.</p></details>
      <details><summary>Can I finance an older car?</summary><p>The available loan amount and term depend on the car’s age at the end of the loan, its valuation and the lender’s criteria. Our team can review your preferred vehicle and repayment period.</p></details>
      <details><summary>Can I review insurance and warranty together?</summary><p>Yes. Tell the team which car you’re considering and the cover you want to discuss. Insurance and extended warranty cover different risks and have separate terms.</p><Link className="text-link" href="/warranty">Explore extended warranty</Link></details>
    </div></section>
  </main>;
}

export function FinancePageView() { return <QueryView>{params => <FinanceView params={params}/>}</QueryView>; }
