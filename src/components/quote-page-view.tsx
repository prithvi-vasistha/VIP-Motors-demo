"use client";
import { QueryView } from "./query-view";
import { inventory } from "@/lib/inventory";
import { valuationFromParams } from "@/lib/valuation";
import type { SearchParams } from "@/lib/filters";
import { quoteReferences } from "@/lib/quote-references";
import { ValuationForm } from "@/components/valuation-form";
function QuotePageView({ params }: { params: SearchParams }) {
  const anchors = [...quoteReferences, ...inventory.flatMap(car => car.price.kind === "numeric" && car.price.currency === "INR" && car.year ? [{ make: car.make, model: car.model, variant: car.variant, year: car.year, price: car.price.amount, fuel: car.fuel, transmission: car.transmission }] : [])];
  return <main id="main" className="container valuation-page"><div className="valuation-heading"><div><p className="section-kicker">Get a quote</p><h1>Your car.<br/><em>Its next chapter.</em></h1></div><p>The details. A few photos.<br/>An indicative quote, right here.<br/>No calls or sign-up required.</p></div><ValuationForm anchors={anchors} initial={valuationFromParams(params)} currentYear={new Date().getUTCFullYear()}/></main>;
}

export function QuotePagePageView() { return <QueryView>{params => <QuotePageView params={params}/>}</QueryView>; }
