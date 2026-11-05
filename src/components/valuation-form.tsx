"use client";
import { sitePath } from "@/lib/site-path";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowIcon } from "./icons";
import { RedDotGenerationPreview } from "./red-dot-generation-preview";
import { BrandLogo } from "./brand-logo";
import { VehiclePhotoUpload, type QuotePhoto } from "./vehicle-photo-upload";
import { formatQuote } from "@/lib/pricing";
import { estimateValuation, validateValuation, valuationOptions, valuationParams, valuationEnquiry, findAnchor, blankValuation as initialBlank, type ValuationInput, type ValuationAnchor, type ValuationErrors } from "@/lib/valuation";

export function ValuationForm({ anchors, initial, currentYear }: { anchors: ValuationAnchor[]; initial: ValuationInput; currentYear: number }) {
  const [input, setInput] = useState(initial);
  const [errors, setErrors] = useState<ValuationErrors>({});
  const [result, setResult] = useState(() => estimateValuation(initial, anchors, currentYear));
  const [copied, setCopied] = useState("");
  const [phase, setPhase] = useState<"idle" | "generating" | "ready" | "error">(() => estimateValuation(initial, anchors, currentYear) ? "ready" : "idle");
  const [stage, setStage] = useState(0);
  const [photos, setPhotos] = useState<QuotePhoto[]>([]);
  const [photoReset, setPhotoReset] = useState(0);
  const timers = useRef<number[]>([]);
  const pendingHeading = useRef<HTMLHeadingElement>(null);
  const generating = phase === "generating";
  const stages = ["Reading your vehicle details", "Applying saved price references", "Preparing your indicative quote"];
  const startsEmpty = !Object.values(initial).some(Boolean);
  useEffect(() => { if (startsEmpty) window.scrollTo({ top: 0, behavior: "instant" }); }, [startsEmpty]);
  useEffect(() => () => timers.current.forEach(timer => window.clearTimeout(timer)), []);
  function clearTimers() { timers.current.forEach(timer => window.clearTimeout(timer)); timers.current = []; }
  function revealResult(pending: boolean) {
    requestAnimationFrame(() => {
      (pending ? pendingHeading : resultHeading).current?.focus({ preventScroll: true });
      document.getElementById("valuation-result")?.scrollIntoView({ behavior: "instant", block: "start" });
    });
  }
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const prefix = useId();
  const makes = [...new Set(anchors.map(car => car.make))].sort();
  const models = [...new Set(anchors.filter(car => car.make.toLowerCase() === input.make.toLowerCase()).map(car => car.model))].sort();
  const reference = findAnchor(input, anchors);
  const hasInput = Object.values(input).some(Boolean);

  function update(key: keyof ValuationInput, value: string) {
    setInput(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    clearTimers(); setPhase("idle"); setResult(null); setCopied("");
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validateValuation(input, anchors, currentYear);
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) { (event.currentTarget.elements.namedItem(first) as HTMLElement)?.focus(); return; }
    clearTimers(); setResult(null); setCopied(""); setStage(0); setPhase("generating");
    window.history.replaceState(null, "", sitePath(`/quote?${valuationParams(input)}`));
    revealResult(true);
    // The local estimator uses the saved reference data; generation remains cancellable.
    // All computation is local. No photo recognition or live AI request occurs.
    timers.current = [
      window.setTimeout(() => setStage(1), 1300),
      window.setTimeout(() => setStage(2), 2800),
      window.setTimeout(() => {
        try {
          const nextResult = estimateValuation(input, anchors, currentYear);
          if (!nextResult) { setPhase("error"); return; }
          setResult(nextResult); setPhase("ready"); revealResult(false);
        } catch { setPhase("error"); }
      }, 4300),
    ];
  }
  function reset() {
    clearTimers(); setInput(initialBlank); setErrors({}); setResult(null); setPhase("idle"); setCopied("");
    setPhotos([]); setPhotoReset(previous => previous + 1); window.history.replaceState(null, "", sitePath("/quote"));
    formRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    (formRef.current?.elements.namedItem("make") as HTMLElement)?.focus({ preventScroll: true });
  }
  function cancelGeneration() {
    clearTimers(); setPhase("idle");
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
      (formRef.current?.elements.namedItem("make") as HTMLElement)?.focus({ preventScroll: true });
    });
  }
  function field(key: keyof ValuationInput, label: ReactNode, control: ReactNode, hint?: string) {
    return <div className={`field valuation-field ${errors[key] ? "has-error" : ""}`}><label htmlFor={`${prefix}-${key}`}>{label}</label>{control}{hint ? <p className="valuation-field-hint" id={`${prefix}-${key}-hint`}>{hint}</p> : null}{errors[key] ? <p className="field-error" id={`${prefix}-${key}-error`}>{errors[key]}</p> : null}</div>;
  }
  function attributes(key: keyof ValuationInput) {
    return { id: `${prefix}-${key}`, name: key, value: input[key], "aria-invalid": !!errors[key], "aria-describedby": errors[key] ? `${prefix}-${key}-error` : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => update(key, event.target.value) };
  }
  function select(key: keyof ValuationInput, label: string, options: { value: string; label: string }[]) {
    return field(key, label, <select {...attributes(key)}><option value="">Select an option</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>);
  }
  const text = result ? `${valuationEnquiry(input, result, formatQuote)}\n\nPhotographs: ${photos.length}. Held privately in your browser and not included in this document.` : "";
  function downloadQuote() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url;
    link.download = `VIP-Motors-quote-${input.make}-${input.model}.txt`.replace(/[^a-zA-Z0-9.\-]/g, "-");
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setCopied("Quote downloaded.");
  }
  return <div className="valuation-layout">
    <form ref={formRef} className="valuation-form" noValidate onSubmit={submit}>
      <fieldset disabled={generating}><legend><span>01</span> The essentials</legend><p className="valuation-section-note">Start with the details on your registration certificate.</p><div className="valuation-fields">
        {field("make", "Make", <><input {...attributes("make")} type="text" maxLength={60} list={`${prefix}-makes`} placeholder="e.g. Toyota" autoComplete="off"/><datalist id={`${prefix}-makes`}>{makes.map(make => <option key={make} value={make}/>)}</datalist></>)}
        {field("model", "Model", <><input {...attributes("model")} type="text" maxLength={80} list={`${prefix}-models`} placeholder="e.g. Fortuner" autoComplete="off"/><datalist id={`${prefix}-models`}>{models.map(model => <option key={model} value={model}/>)}</datalist></>)}
        {field("variant", <>Variant <span className="required-note">(optional)</span></>, <input {...attributes("variant")} type="text" maxLength={80} placeholder="e.g. Legender" autoComplete="off"/>)}
        {field("year", "Registration year", <input {...attributes("year")} type="number" inputMode="numeric" min={1990} max={currentYear} placeholder="e.g. 2023"/>)}
        {field("mileage", "Kilometres driven", <div className="valuation-input-unit"><input {...attributes("mileage")} type="number" inputMode="numeric" min={0} max={1000000} placeholder="e.g. 35000"/><span>km</span></div>)}
        {select("owners", "Number of owners", [1, 2, 3, 4, 5].map(number => ({ value: String(number), label: `${number}${number === 1 ? "st owner" : number === 2 ? "nd owner" : number === 3 ? "rd owner" : "th owner"} (including you)` })))}
        {select("fuel", "Fuel type", valuationOptions.fuel.map(value => ({ value, label: value })))}
        {select("transmission", "Transmission", valuationOptions.transmission.map(value => ({ value, label: value })))}
      </div></fieldset>
      <fieldset disabled={generating}><legend><span>02</span> A closer look</legend><p className="valuation-section-note">A little context helps us build a more useful range.</p><div className="valuation-fields">
        {select("condition", "Overall condition", valuationOptions.condition)}
        {select("accident", "Accident history", valuationOptions.accident)}
        {select("service", "Service history", valuationOptions.service)}
        {field("originalPrice", `Original on-road price (₹)${reference ? " · optional" : ""}`, <input {...attributes("originalPrice")} type="number" inputMode="numeric" min={100000} max={1000000000} placeholder="e.g. 5500000"/>, reference ? "Optional: helps cap the estimate." : "Required only when your model is outside the saved references. Enter the full rupee amount.")}
      </div></fieldset>
      <fieldset disabled={generating} className="quote-photo-fieldset"><legend><span>03</span> A few photos</legend><p className="valuation-section-note">Add a front or three-quarter view, then any details you’d like to share.</p><VehiclePhotoUpload key={photoReset} onChange={setPhotos} disabled={generating}/></fieldset>
      <div className="valuation-submit"><p>No phone number. No sign-up.<br/>Just a starting point for the conversation.</p><button className="button button-dark" type="submit" disabled={generating}>{generating ? "Generating your quote…" : "Get my quote"}<ArrowIcon/></button></div>
      <p className="valuation-form-note">All fields are required unless marked optional. Keep this page’s link to return to your estimate. Photos stay private to this browser session.</p>
      <p className="sr-only" role="status">{Object.values(errors).filter(Boolean).length ? "Please correct the highlighted fields. Your details have been kept." : ""}</p>
    </form>
    <aside id="valuation-result" className={`valuation-result ${result ? "is-ready" : ""} ${generating || phase === "error" ? "is-processing" : ""}`} aria-label="Your indicative quote">
      {(generating || (result && photos[0])) ? <RedDotGenerationPreview active={generating} imageSrc={photos[0]?.url} imageAlt="Your attached car photo" className="quote-particle-output" backgroundColor="var(--surface)" label="Preparing your vehicle quote…"/> : null}
      {generating ? <div className="quote-processing"><h2 ref={pendingHeading} tabIndex={-1}>Preparing your quote.</h2><p>Considering your car’s details, condition and pricing references to prepare a considered estimate.</p><ol>{stages.map((label, index) => <li key={label} data-state={stage > index ? "done" : stage === index ? "active" : "waiting"}><span>{stage > index ? "✓" : String(index + 1).padStart(2, "0")}</span>{label}</li>)}</ol><small>Your estimate will appear here shortly.</small><button type="button" className="text-button" onClick={cancelGeneration}>Cancel and edit details</button></div> : phase === "error" ? <div className="quote-processing" role="alert"><span className="quote-demo-badge">Quote unavailable</span><h2>Let’s try that again.</h2><p>We couldn’t prepare the estimate. Your details and photos are still here.</p><button type="button" className="button button-dark" onClick={() => { setPhase("idle"); formRef.current?.requestSubmit(); }}>Try again <ArrowIcon/></button></div> : result ? <>
        <div className="valuation-result-top"><span className="section-kicker">Your quote is ready</span><span className="estimate-ready"><span/>Ready</span></div>
        <h2 ref={resultHeading} tabIndex={-1}>{input.make} {input.model}</h2><p className="valuation-result-meta">{input.year} · {input.fuel} · {Number(input.mileage).toLocaleString("en-IN")} km</p>

        <div className="valuation-range quote-estimate"><span>Indicative selling quote</span><strong>{formatQuote(result.estimate)}</strong><p>Estimated range <b>{formatQuote(result.low)} – {formatQuote(result.high)}</b></p><small>Indicative valuation · Subject to inspection</small></div>
        <p className="valuation-range-note">A conservative starting point based on your car’s details. Inspection and a current market review are needed before a final offer.</p>
        <dl className="valuation-summary"><div><dt>Reference</dt><dd>{result.anchor?.source ? "Market reference" : result.anchor ? "Catalogue reference" : "Original price supplied"}</dd></div><div><dt>Ownership</dt><dd>{input.owners} owner{input.owners === "1" ? "" : "s"}</dd></div><div><dt>Condition</dt><dd>{valuationOptions.condition.find(item => item.value === input.condition)?.label.split(" ·")[0]}</dd></div></dl>
        <details className="valuation-method"><summary>How this estimate was prepared <span>+</span></summary><div><p>The range considers your model, year, mileage, ownership, condition and service history.</p>{result.anchor?.source ? <p>Reference asking price: {formatQuote(result.anchor.price)}. <a href={result.anchor.source.url} target="_blank" rel="noopener noreferrer">View pricing reference ↗</a>. Asking prices may differ from final selling prices.</p> : <p>{result.anchor ? "Based on a catalogue reference adjusted for your vehicle’s details." : "Based on your original on-road price, adjusted for age and the details you supplied."}</p>}<p>A final offer requires a vehicle inspection and current market review. Photos are held privately and do not affect this estimate.</p></div></details>
        <button type="button" className="button button-dark valuation-contact" onClick={downloadQuote}>Download my quote <ArrowIcon/></button>
        <div className="valuation-result-actions"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied("Quote copied."); } catch { setCopied("Copy is unavailable. Use Download my quote to save your estimate."); } }}>Copy quote</button><button type="button" onClick={() => { formRef.current?.scrollIntoView({ behavior: "instant", block: "start" }); (formRef.current?.elements.namedItem("make") as HTMLElement)?.focus({ preventScroll: true }); }}>Edit details</button></div><p className="valuation-copy-status" role="status">{copied}</p><button type="button" className="quote-another" onClick={reset}>Get a quote for another car <ArrowIcon/></button>
      </> : <div className="valuation-empty"><BrandLogo decorative/><span className="section-kicker">A little detail. A clearer picture.</span><h2>Your car.<br/><em>Its next possibility.</em></h2><p>{hasInput ? "Complete your details and generate an estimate to see your indicative range here." : "Add your car’s details to discover an indicative selling range, without leaving this page."}</p><div className="valuation-empty-rule"/><ol><li><span>01</span> Tell us about your car</li><li><span>02</span> See your indicative quote</li><li><span>03</span> Save or copy your quote</li></ol><small>An indicative valuation, subject to inspection.</small></div>}
    </aside>
  </div>;
}
