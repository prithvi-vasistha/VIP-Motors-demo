"use client";
import { useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowIcon, CloseIcon } from "./icons";

type Draft = { name: string; email: string; phone: string; message: string };
type Errors = Partial<Record<keyof Draft, string>>;
const blank: Draft = { name: "", email: "", phone: "", message: "" };
export function Enquiry({ vehicleName, reference, inline = false, intent, initialMessage, subject }: { subject?: string; vehicleName?: string; reference?: string; inline?: boolean; intent?: "sell"; initialMessage?: string }) {
  const [draft, setDraft] = useState<Draft>(() => ({ ...blank, message: initialMessage ?? (intent === "sell" ? "I’d like a fair quote for my car.\nMake/model: \nYear: \nMileage: " : "") }));
  const [errors, setErrors] = useState<Errors>({});
  const [preview, setPreview] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const title = vehicleName ?? subject ?? (intent === "sell" ? "Sell my car" : "General enquiry");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Errors = {};
    if (draft.name.trim().length < 2) next.name = "Enter your name using at least 2 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) next.email = "Enter an email address such as name@example.com.";
    if (draft.phone && !/^[+\d\s().-]{7,25}$/.test(draft.phone)) next.phone = "Use 7–25 characters: digits, spaces, +, brackets or dashes.";
    if (draft.message.trim().length < 10) next.message = "Add a message with at least 10 characters.";
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) { (event.currentTarget.elements.namedItem(first) as HTMLElement)?.focus(); return; }
    setPreview(`VIP Motors — enquiry\n\n${vehicleName ? "Vehicle" : "Subject"}: ${title}${reference ? `\nReference: ${reference}` : ""}\nName: ${draft.name.trim()}\nEmail: ${draft.email.trim()}${draft.phone.trim() ? `\nPhone: ${draft.phone.trim()}` : ""}\n\n${draft.message.trim()}\n\nCopy and share this enquiry with VIP Motors.`);
    requestAnimationFrame(() => document.getElementById(inline ? "inline-preview-title" : "dialog-preview-title")?.focus());
  }
  const content = <>
    <div className="enquiry-context"><span>{vehicleName ? "Your chosen vehicle" : "Contact VIP Motors"}</span><strong>{title}</strong>{reference ? <small>Reference {reference}</small> : null}</div>
    {preview ? <div className="enquiry-preview"><h3 id={inline ? "inline-preview-title" : "dialog-preview-title"} tabIndex={-1}>Your enquiry is ready.</h3><p className="muted">Review your message, then copy and share it with VIP Motors.</p><label className="sr-only" htmlFor="enquiry-output">Enquiry text</label><textarea id="enquiry-output" className="enquiry-output" readOnly value={preview} rows={11}/><button type="button" className="button button-dark" onClick={async () => { try { await navigator.clipboard.writeText(preview); setCopyStatus("Enquiry copied. Ready to share with VIP Motors."); } catch { document.getElementById("enquiry-output")?.focus(); (document.getElementById("enquiry-output") as HTMLTextAreaElement)?.select(); setCopyStatus("Select the text above and use your device’s Copy command."); } }}>Copy enquiry <ArrowIcon/></button><button className="text-button edit-enquiry" type="button" onClick={() => { setPreview(""); setCopyStatus(""); }}>Edit enquiry</button><p className="copy-status" role="status">{copyStatus}</p></div> : <form className="enquiry-form" noValidate onSubmit={submit}>
      <div className="form-pair">{(["name", "email"] as const).map(key => <div className="field" key={key}><label htmlFor={`${inline ? "inline" : "dialog"}-${key}`}>{key === "name" ? "Your name" : "Email address"} <span className="required-note">(required)</span></label><input id={`${inline ? "inline" : "dialog"}-${key}`} name={key} type={key === "email" ? "email" : "text"} autoComplete={key} spellCheck={key !== "email"} maxLength={key === "name" ? 100 : 254} value={draft[key]} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${inline ? "inline" : "dialog"}-${key}-error` : undefined} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}/>{errors[key] ? <p className="field-error" id={`${inline ? "inline" : "dialog"}-${key}-error`}>{errors[key]}</p> : null}</div>)}</div>
      <div className="field"><label htmlFor={`${inline ? "inline" : "dialog"}-phone`}>Phone number <span className="required-note">(optional)</span></label><input id={`${inline ? "inline" : "dialog"}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={25} value={draft.phone} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}/>{errors.phone ? <p id="phone-error" className="field-error">{errors.phone}</p> : null}</div>
      <div className="field"><label htmlFor={`${inline ? "inline" : "dialog"}-message`}>Your message <span className="required-note">(required)</span></label><textarea id={`${inline ? "inline" : "dialog"}-message`} name="message" autoComplete="off" rows={4} maxLength={2000} value={draft.message} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} placeholder="Tell us what you’d like to know…" onChange={e => setDraft(d => ({ ...d, message: e.target.value }))}/>{errors.message ? <p id="message-error" className="field-error">{errors.message}</p> : null}</div>
      <p className="form-note">Your details stay private in this browser session. Prepare your message, then copy it to share with VIP Motors.</p><button type="submit" className="button button-dark">Prepare enquiry <ArrowIcon/></button><p className="sr-only" aria-live="polite">{Object.keys(errors).length ? "Please correct the highlighted fields. Your draft has been kept." : ""}</p>
    </form>}
  </>;
  if (inline) return <div className="inline-enquiry">{content}</div>;
  return <Dialog.Root><Dialog.Trigger className="button button-dark enquiry-trigger">Enquire about this vehicle <ArrowIcon/></Dialog.Trigger><Dialog.Portal><Dialog.Backdrop className="dialog-backdrop"/><Dialog.Popup className="enquiry-dialog"><div className="panel-heading"><Dialog.Title>Make an enquiry</Dialog.Title><Dialog.Close className="icon-button" aria-label="Close enquiry"><CloseIcon/></Dialog.Close></div><Dialog.Description className="muted enquiry-intro">A conversation starts here. Prepare and review your message.</Dialog.Description>{content}</Dialog.Popup></Dialog.Portal></Dialog.Root>;
}
