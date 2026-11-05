"use client";

import Link from "next/link";
import Image from "next/image";
import { publicAsset } from "@/lib/site-path";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { quickAnswers, suggestionLabels, matchQuestion, conciergeReply } from "@/lib/chatbot-content";
import { formatQuote } from "@/lib/pricing";
import type { ConciergeVehicle } from "@/lib/types";
import { ArrowIcon, CloseIcon } from "./icons";
import { BrandLogo } from "./brand-logo";

function ChatIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H4.5v-5.2A8 8 0 1 1 20 11.5Z"/><path d="M8 10h8M8 14h5"/></svg>;
}
function PromptIcon({ index }: { index: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">{index === 0 ? <><path d="M5 7h14v12H5zM8 7V5h8v2M5 11h14"/><path d="M10 15h4"/></> : index === 1 ? <><path d="m4 12 2-6h12l2 6v6H4zM4 12h16M7 18v2m10-2v2"/><path d="M7 15h2m6 0h2"/></> : <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-12 4h3m2 0h3"/></>}</svg>;
}
type ChatTurn = { id: number; message: string; topicId?: string; maxPrice?: number; status: "processing" | "ready" };

export function Chatbot({ vehicles }: { vehicles: ConciergeVehicle[] }) {
  const pathname = usePathname();
  const inlineLauncher = pathname === "/quote" || pathname === "/contact" || pathname === "/finance" || pathname === "/warranty";
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const nextMessageId = useRef(0);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHistory = history.length > 0;
  const processing = history.some(turn => turn.status === "processing");

  useEffect(() => () => { if (pendingTimer.current !== null) clearTimeout(pendingTimer.current); }, []);

  useEffect(() => {
    const log = logRef.current;
    const turn = log?.querySelector(".chat-turn:last-child");
    if (log && turn) log.scrollTo({ top: log.scrollTop + turn.getBoundingClientRect().top - log.getBoundingClientRect().top - 8, behavior: "instant" });
    else log?.scrollTo({ top: 0, behavior: "instant" });
  }, [history, open]);

  function ask(message: string) {
    const value = message.trim();
    if (!value || pendingTimer.current !== null) return;
    const id = nextMessageId.current++;
    setHistory(previous => [...previous.slice(-9), { id, message: value, ...matchQuestion(value), status: "processing" }]);
    setDraft("");
    pendingTimer.current = setTimeout(() => {
      pendingTimer.current = null;
      setHistory(previous => previous.map(turn => turn.id === id ? { ...turn, status: "ready" } : turn));
    }, 1200);
  }
  function cancelPending() { if (pendingTimer.current !== null) clearTimeout(pendingTimer.current); pendingTimer.current = null; }
  function changeOpen(next: boolean) { setOpen(next); if (!next) { cancelPending(); setHistory(previous => previous.filter(turn => turn.status === "ready")); } }
  function restart() { cancelPending(); setHistory([]); setDraft(""); }
  function send(event: FormEvent<HTMLFormElement>) { event.preventDefault(); ask(draft); }

  return <Dialog.Root modal={false} open={open} onOpenChange={changeOpen}>
    <div className={inlineLauncher ? "concierge-inline container" : "concierge-floating"}>
    {inlineLauncher && <p>Need a little guidance?<span>Concierge is here to help you explore.</span></p>}
    <Dialog.Trigger className="chat-launcher" aria-label={open ? "Close Concierge" : "Open Concierge"}>
      {open ? <CloseIcon/> : <ChatIcon/>}<span>Concierge</span>{!open && <span className="launcher-plus" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg></span>}
    </Dialog.Trigger>
    </div>
    <Dialog.Portal>
      <Dialog.Popup className="chat-panel" aria-label="Concierge">
        <div className="chat-heading">
          <BrandLogo decorative className="chat-brand"/>
          <div><span className="chat-eyebrow">VIP MOTORS</span><Dialog.Title>Concierge</Dialog.Title></div>
          <button className="chat-restart icon-button" type="button" aria-label="Restart Concierge" disabled={!hasHistory} onClick={restart}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/></svg></button>
          <Dialog.Close className="icon-button" aria-label="Close Concierge"><CloseIcon/></Dialog.Close>
        </div>
        <span className="sr-only" role="status">{processing ? "Concierge is reviewing your request." : ""}</span>
        <div ref={logRef} className="chat-log" role="log" aria-label="Concierge Conversation" aria-live="polite" aria-relevant="additions" aria-busy={processing}>
          {!hasHistory && <div className="chat-greeting"><span className="chat-welcome-label"><span/>THE PRIVATE GALLERY</span><h3>Your next drive,<br/><em>closer.</em></h3><p>A shortlist for your budget.<br/>A little guidance for the journey.</p><div className="chat-welcome-prompts">{quickAnswers.map((topic, index) => <button type="button" key={topic.id} aria-label={topic.question} disabled={processing} onClick={() => ask(topic.question)}><span className="prompt-icon"><PromptIcon index={index}/></span><span>{suggestionLabels[topic.id]}</span><ArrowIcon/></button>)}</div><p className="chat-welcome-note">Choose a suggestion, or ask in your own words.</p></div>}
          {history.map(turn => {
            const reply = conciergeReply(turn.topicId, turn.maxPrice, vehicles);
            const from = turn.maxPrice ? `/inventory?maxPrice=${turn.maxPrice}` : turn.topicId === "explore-suvs" ? "/inventory?body=SUV" : "/inventory";
            return <div className="chat-turn" key={turn.id}>
              <div className="chat-question"><span>You</span><p>{turn.message}</p></div>
              {turn.status === "processing" ? <div className="concierge-processing"><div className="chat-answer-byline"><BrandLogo decorative/><span>Concierge</span><span className="answer-rule"/></div><p>{turn.topicId === "budget-50-lakh" || turn.topicId === "explore-suvs" ? "Finding a few options for you…" : "Reviewing your request…"}</p><span className="concierge-processing-line" aria-hidden="true"/></div> : <div className={`chat-answer ${turn.topicId ? "" : "chat-connection-error"}`}>
                <div className="chat-answer-byline"><BrandLogo decorative/><span>Concierge</span><span className="answer-rule"/></div>
                <h3>{reply.results.length ? "A few worth a closer look." : turn.topicId === "arrange-viewing" ? "Let’s make it personal." : turn.topicId ? "Let’s widen the search." : "Connection unavailable"}</h3><p>{reply.text}</p>
                {reply.results.length ? <><div className="chat-shortlist-label"><span>YOUR SHORTLIST</span><span>{reply.results.length} picks · swipe to explore</span></div><ul className="concierge-results">{reply.results.map(vehicle => <li key={vehicle.id}><Dialog.Close className="concierge-result" aria-label={`${vehicle.make} ${vehicle.model}, ${formatQuote(vehicle.price, vehicle.currency)} indicative price. View vehicle`} render={<Link href={`/inventory/${vehicle.slug}?from=${encodeURIComponent(from)}`}/>}><span className="concierge-result-image"><Image src={publicAsset(vehicle.image.src)} alt={vehicle.image.alt} fill sizes="260px" style={{ objectFit: "contain" }}/><span className="result-open"><ArrowIcon/></span></span><span className="concierge-result-copy"><span className="concierge-result-year">{vehicle.year} <span>·</span> {vehicle.body}</span><strong>{vehicle.make}<br/>{vehicle.model}</strong><span className="concierge-result-price">{formatQuote(vehicle.price, vehicle.currency)}<small>Indicative price</small></span></span></Dialog.Close></li>)}</ul></> : null}
                {reply.links.length ? <div className="chat-answer-links">{reply.links.map(link => <Dialog.Close key={link.href} render={<Link href={link.href}/>}>{link.label}<ArrowIcon/></Dialog.Close>)}</div> : null}
                {reply.note ? <p className="chat-answer-note">{reply.note}</p> : null}
              </div>}
            </div>;
          })}
        </div>
        {hasHistory && <div className="chat-suggestions"><div className="chat-suggestion-list">{quickAnswers.map(topic => <button type="button" className="chat-suggestion" key={topic.id} aria-label={topic.question} disabled={processing} onClick={() => ask(topic.question)}>{suggestionLabels[topic.id]}<ArrowIcon/></button>)}</div></div>}
        <form className="chat-composer" onSubmit={send}>
          <label className="sr-only" htmlFor="vip-chat-message">Your message</label>
          <input id="vip-chat-message" name="concierge-message" type="text" autoComplete="off" maxLength={1000} placeholder="Ask Concierge…" value={draft} onChange={event => setDraft(event.target.value)}/>
          <button type="submit" className="chat-send" aria-label="Send to Concierge" disabled={!draft.trim() || processing}><ArrowIcon/></button>
        </form>
        <p className="chat-disclaimer"><span aria-hidden="true"/> Concierge</p>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
