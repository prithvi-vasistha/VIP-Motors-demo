"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { inventory } from "@/lib/inventory";
import { VehicleCard } from "./vehicle-card";
import { ArrowIcon } from "./icons";

const KEY = "vip:wishlist:v1";
const EMPTY: string[] = [];
const allowed = new Set(inventory.map(car => car.slug));
let cachedRaw: string | null | undefined;
let cached: string[] = EMPTY;
let memoryOnly = false;
const listeners = new Set<() => void>();
const serverSnapshot = () => EMPTY;
function snapshot() {
  if (memoryOnly) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      const values: unknown = raw ? JSON.parse(raw) : [];
      cached = Array.isArray(values) ? [...new Set(values.filter((value): value is string => typeof value === "string" && allowed.has(value)))] : EMPTY;
    }
  } catch { cachedRaw = null; cached = EMPTY; }
  return cached;
}
function notify() { listeners.forEach(listener => listener()); }
function storageChanged(event: StorageEvent) { if (event.key === KEY || event.key === null) notify(); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", storageChanged);
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener("storage", storageChanged); };
}
function write(slugs: string[]) {
  cached = slugs;
  cachedRaw = JSON.stringify(slugs);
  try { localStorage.setItem(KEY, cachedRaw); } catch { memoryOnly = true; }
  notify();
}
function useWishlist() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }

function Heart({ filled = false }: { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20.3 5.7a5.1 5.1 0 0 0-7.2 0L12 6.8l-1.1-1.1a5.1 5.1 0 0 0-7.2 7.2L12 21l8.3-8.1a5.1 5.1 0 0 0 0-7.2Z"/></svg>;
}

export function WishlistNav() {
  const slugs = useWishlist();
  return <Link className="wishlist-nav" href="/wishlist" aria-label={`Wishlist, ${slugs.length} saved ${slugs.length === 1 ? "car" : "cars"}`}><Heart filled={slugs.length > 0}/><span className="wishlist-nav-label">Wishlist</span><span className="wishlist-count">{slugs.length}</span></Link>;
}

export function WishlistButton({ slug, name, expanded = false }: { slug: string; name: string; expanded?: boolean }) {
  const slugs = useWishlist();
  const selected = slugs.includes(slug);
  const [status, setStatus] = useState("");
  return <><button type="button" className={`wishlist-button ${expanded ? "wishlist-expanded" : ""}`} aria-pressed={selected} aria-label={`${selected ? "Remove" : "Save"} ${name} ${selected ? "from" : "to"} Wishlist`} onClick={() => { const current = snapshot(); const removing = current.includes(slug); write(removing ? current.filter(value => value !== slug) : [...current, slug]); setStatus(`${name} ${removing ? "removed from" : "added to"} your Wishlist.`); }}><Heart filled={selected}/>{expanded ? <span>{selected ? "Saved To Wishlist" : "Save To Wishlist"}</span> : null}</button><span className="sr-only" role="status">{status}</span></>;
}

export function WishlistCollection() {
  const slugs = useWishlist();
  const cars = slugs.flatMap(slug => { const car = inventory.find(car => car.slug === slug); return car ? [car] : []; });
  return <main id="main" className="container inventory-page wishlist-page"><div className="page-heading"><div><p className="section-kicker">Your personal collection</p><h1>The Wishlist.</h1></div><p>{cars.length ? `${cars.length} ${cars.length === 1 ? "car" : "cars"}, chosen by you.` : "For the cars you keep coming back to."}</p></div>{cars.length ? <><p className="wishlist-intro">Your favourites, in one place. Take a closer look or come and see them in person.</p><div className="inventory-grid">{cars.map(car => <VehicleCard key={car.slug} vehicle={car}/>)}</div><div className="wishlist-close"><p>Saved in this browser. Your collection will be here when you return.</p><Link className="text-link" href="/inventory">Keep Exploring <ArrowIcon/></Link></div></> : <section className="empty-state wishlist-empty"><Heart/><h2>Keep what moves you.</h2><p>Tap the heart on any car to build your own collection. Your Wishlist stays with you in this browser.</p><Link className="button button-dark" href="/inventory">Explore Inventory <ArrowIcon/></Link></section>}</main>;
}
