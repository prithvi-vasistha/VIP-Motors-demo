"use client";

import Link from "next/link";
import { sitePath } from "@/lib/site-path";
import { useState, type FormEvent } from "react";
import { ArrowIcon } from "./icons";
import { calculateFinance, defaultFinance, financeBenchmark, financeEnquiry, financeTerms, financeUrl, rupees, validateFinance, type FinanceCar, type FinanceDraft } from "@/lib/finance";

export function FinanceCalculator({ cars, initial }: { cars: FinanceCar[]; initial: FinanceDraft }) {
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState(() => Object.keys(validateFinance(initial)).length > 0);
  const [status, setStatus] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  const errors = validateFinance(draft);
  const result = calculateFinance(draft);
  const car = cars.find(car => car.slug === draft.vehicle);
  function change(key: keyof FinanceDraft, value: string) { setDraft(d => ({ ...d, [key]: value })); setTouched(true); setStatus(""); setCopyFallback(""); }
  function chooseCar(slug: string) {
    const selected = cars.find(c => c.slug === slug);
    if (selected) setDraft(d => ({ ...d, vehicle: slug, price: String(selected.price), deposit: String(Math.round(selected.price * .2)) }));
    setTouched(false); setStatus(""); setCopyFallback("");
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setTouched(true);
    const first = Object.keys(errors)[0];
    if (first) { (event.currentTarget.elements.namedItem(first) as HTMLElement)?.focus(); return; }
    window.history.replaceState(null, "", sitePath(financeUrl(draft)));
    setStatus("Plan updated. You can return to this estimate using this page’s link.");
  }
  const enquiry = `/contact?${new URLSearchParams({ topic: "finance-insurance", message: financeEnquiry(draft, cars) })}`;
  const fields = [
    { key: "price", label: "Vehicle price", suffix: "₹", min: 100000, max: 100000000, step: 10000 },
    { key: "deposit", label: "Down payment", suffix: "₹", min: 0, max: Number(draft.price) || 100000000, step: 10000 },
    { key: "rate", label: "Annual interest rate", suffix: "%", min: 0, max: 30, step: .1 },
  ] as const;
  return <section id="finance-calculator" className="finance-workspace" aria-labelledby="finance-calculator-title">
    <form className="finance-form" onSubmit={save} noValidate>
      <div className="service-section-heading"><h2 id="finance-calculator-title">Make it your plan.</h2><p>Choose a car and adjust the figures. Your estimate updates as you go.</p></div>
      <div className="field"><label htmlFor="finance-vehicle">Choose a vehicle</label><select id="finance-vehicle" name="vehicle" value={draft.vehicle} onChange={e => chooseCar(e.target.value)}>{cars.map(car => <option value={car.slug} key={car.slug}>{car.name}{car.year ? ` · ${car.year}` : ""}</option>)}</select><p className="service-field-hint">Collection prices are indicative. You can adjust the price below.</p></div>
      <div className="finance-fields">{fields.map(field => <div className="field" key={field.key}>
        <label htmlFor={`finance-${field.key}`}>{field.label}</label>
        <div className={`service-number-input ${field.key === "rate" ? "service-number-suffix" : ""}`}><span aria-hidden="true">{field.suffix}</span><input id={`finance-${field.key}`} name={field.key} type="number" inputMode={field.key === "rate" ? "decimal" : "numeric"} autoComplete="off" min={field.min} max={field.max} step={field.step} value={draft[field.key]} onChange={e => change(field.key, e.target.value)} aria-invalid={touched && !!errors[field.key]} aria-describedby={touched && errors[field.key] ? `finance-${field.key}-error` : undefined}/></div>
        {touched && errors[field.key] ? <p className="field-error" id={`finance-${field.key}-error`}>{errors[field.key]}</p> : null}
      </div>)}<div className="field"><label htmlFor="finance-months">Loan term</label><select id="finance-months" name="months" value={draft.months} onChange={e => change("months", e.target.value)} aria-invalid={!!errors.months} aria-describedby={errors.months ? "finance-months-error" : undefined}><option value="" disabled>Choose a term</option>{financeTerms.map(months => <option key={months} value={months}>{months / 12} {months === 12 ? "year" : "years"} · {months} months</option>)}</select>{errors.months ? <p className="field-error" id="finance-months-error">{errors.months}</p> : null}</div></div>
      <div className="finance-form-actions"><button className="button button-dark" type="submit">Save this plan <ArrowIcon/></button><button type="button" className="text-button" onClick={() => { const next = defaultFinance(cars); setDraft(next); setTouched(false); setStatus("Plan reset to the starting figures."); setCopyFallback(""); window.history.replaceState(null, "", sitePath("/finance")); }}>Reset</button></div>
      <p className="service-status" role="status">{status}</p>
      <details className="service-disclosure"><summary>How this estimate works</summary><p>EMI uses a fixed annual rate and a reducing monthly balance. The starting rate of {financeBenchmark.rate}% is an editable planning assumption, based on {financeBenchmark.label}. It is not an offer from VIP Motors or a lender.</p><p>Loan terms depend on the car’s age, valuation and the lender’s assessment. Processing fees, insurance, registration and other charges are excluded.</p><a href={financeBenchmark.source} target="_blank" rel="noopener noreferrer">View the lending benchmark</a></details>
    </form>
    <aside className="finance-summary" aria-labelledby="finance-result-title">
      <div className="finance-summary-context"><span>Your finance estimate</span><h3 id="finance-result-title">{car?.name ?? "Your next car"}</h3>{car?.year ? <p>{car.year} model</p> : null}</div>
      {result ? <>
        <div className="finance-emi"><span>Estimated monthly EMI</span><output aria-live="polite" aria-atomic="true">{rupees(result.emi)}<small>/ month</small></output><p>{result.months} instalments at {result.rate}% p.a.</p></div>
        <dl className="finance-breakdown"><div><dt>Down payment</dt><dd>{rupees(result.deposit)}</dd></div><div><dt>Loan amount</dt><dd>{rupees(result.principal)}</dd></div><div><dt>Total interest</dt><dd>{rupees(result.totalInterest)}</dd></div><div><dt>Total loan repayment</dt><dd>{rupees(result.totalRepayment)}</dd></div><div className="finance-total"><dt>Total including down payment</dt><dd>{rupees(result.totalCost)}</dd></div></dl>
        <div className="finance-composition" aria-hidden="true"><span style={{ transform: `scaleX(${result.totalRepayment ? result.principal / result.totalRepayment : 1})` }}/></div><div className="finance-legend"><span>Principal</span><span>Interest</span></div>
        {result.principal === 0 ? <p className="service-note">Your down payment covers the full vehicle price. No loan is needed for this plan.</p> : null}
        <Link className="button button-dark" href={enquiry}>{result.principal === 0 ? "Discuss this car" : "Discuss this plan"} <ArrowIcon/></Link>
        <button type="button" className="finance-copy text-button" onClick={async () => { const link = `${window.location.origin}${sitePath(financeUrl(draft))}`; try { await navigator.clipboard.writeText(link); setStatus("Plan link copied."); setCopyFallback(""); } catch { setCopyFallback(link); setStatus("Copy the plan link below."); } }}>Copy plan link</button>
        {copyFallback ? <label className="service-copy-fallback">Plan link<input readOnly value={copyFallback} onFocus={e => e.currentTarget.select()}/></label> : null}
        <p className="service-note">Final rate, loan eligibility and all charges are confirmed by the lender.</p>
      </> : <div className="finance-invalid"><h3>Let’s check the figures.</h3><p>Correct the highlighted inputs to see your repayment estimate.</p></div>}
    </aside>
    {result ? <div className="finance-schedule"><div className="service-section-heading"><h2>A clearer view of repayments.</h2><p>Your estimated principal, interest and remaining balance each year.</p></div><div className="service-table-scroll" role="region" aria-label="Yearly repayment schedule" tabIndex={0}><table><caption className="sr-only">Estimated annual loan repayments</caption><thead><tr><th scope="col">Year</th><th scope="col">Principal repaid</th><th scope="col">Interest paid</th><th scope="col">Closing balance</th></tr></thead><tbody>{result.schedule.map(row => <tr key={row.year}><th scope="row">Year {row.year}</th><td>{rupees(row.principal)}</td><td>{rupees(row.interest)}</td><td>{rupees(row.balance)}</td></tr>)}</tbody></table></div><p className="service-note">Figures are rounded to the nearest rupee. The final instalment may vary slightly with the lender’s rounding.</p></div> : null}
  </section>;
}
