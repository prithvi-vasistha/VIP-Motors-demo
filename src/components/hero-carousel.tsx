"use client";

import { WhatsAppQuoteButton } from "./social-links";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { HeroSlide } from "@/lib/types";
import { ArrowIcon } from "./icons";
import { ImagePlate } from "./image-plate";

const ROTATION_MS = 5000;
const noopSubscribe = () => () => {};
const clientReady = () => true;
const serverNotReady = () => false;
const serverVisible = () => true;
const readReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const subscribeReducedMotion = (notify: () => void) => { const media = matchMedia("(prefers-reduced-motion: reduce)"); media.addEventListener("change", notify); return () => media.removeEventListener("change", notify); };
const readVisibility = () => !document.hidden;
const subscribeVisibility = (notify: () => void) => { document.addEventListener("visibilitychange", notify); return () => document.removeEventListener("visibilitychange", notify); };
const readIntroReady = () => document.documentElement.dataset.vipIntro !== "play";
const subscribeIntro = (notify: () => void) => { const observer = new MutationObserver(notify); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-vip-intro"] }); return () => observer.disconnect(); };

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  if (!slides.length) return <section className="container empty-state"><h1>The collection.</h1><Link className="button button-dark" href="/inventory">Explore Inventory <ArrowIcon/></Link></section>;
  return <Carousel slides={slides}/>;
}

function Carousel({ slides }: { slides: HeroSlide[] }) {
  const root = useRef<HTMLElement>(null);
  const progress = useRef<Animation | null>(null);
  const revision = useRef(0);
  const desiredIndex = useRef(0);
  const mounted = useRef(true);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(true);
  const [instant, setInstant] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const hydrated = useSyncExternalStore(noopSubscribe, clientReady, serverNotReady);
  const reduced = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, serverNotReady);
  const visible = useSyncExternalStore(subscribeVisibility, readVisibility, serverVisible);
  const introReady = useSyncExternalStore(subscribeIntro, readIntroReady, serverNotReady);
  const playing = hydrated && introReady && visible && inView && !reduced && !paused && !hovered && slides.length > 1;
  const slide = slides[index];

  useEffect(() => {
    mounted.current = true;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .2 });
    if (root.current) observer.observe(root.current);
    return () => { mounted.current = false; observer.disconnect(); };
  }, []);

  const activate = useCallback(async (next: number, manual: boolean, keyboard = false) => {
    const target = (next + slides.length) % slides.length;
    const request = ++revision.current;
    desiredIndex.current = target;
    if (manual) setPaused(true);
    const image = root.current?.querySelector<HTMLImageElement>(`[data-slide-index="${target}"] img`);
    if (image) {
      image.loading = "eager";
      try { await image.decode(); } catch { /* ImagePlate supplies the designed image fallback. */ }
    }
    if (!mounted.current || request !== revision.current) return;
    setInstant(keyboard);
    setIndex(target);
    setAnnouncement(manual ? `${slides[target].name}. Vehicle ${target + 1} of ${slides.length}.` : "");
  }, [slides]);

  // One compositor clock both fills the indicator and advances the slide.
  // Pausing retains elapsed time; decoding can hold a full bar until the photo is ready.
  useEffect(() => {
    if (!hydrated) return;
    const fill = root.current?.querySelector<HTMLElement>(`[data-progress-index="${index}"]`);
    if (!fill) return;
    const animation = fill.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: ROTATION_MS, easing: "linear", fill: "forwards" });
    animation.pause();
    progress.current = animation;
    animation.onfinish = () => { void activate(index + 1, false); };
    return () => { animation.onfinish = null; animation.cancel(); progress.current = null; };
  }, [index, hydrated, activate]);

  useEffect(() => {
    const animation = progress.current;
    if (!animation) return;
    if (playing) animation.play(); else animation.pause();
  }, [playing, index, hydrated]);

  // Warm only the upcoming image; the first plate is the sole preloaded hero asset.
  useEffect(() => {
    if (!hydrated) return;
    const next = (index + 1) % slides.length;
    const image = root.current?.querySelector<HTMLImageElement>(`[data-slide-index="${next}"] img`);
    if (image) { image.loading = "eager"; void image.decode().catch(() => {}); }
  }, [index, hydrated, slides.length]);

  function move(direction: number, keyboard: boolean) { void activate(desiredIndex.current + direction, true, keyboard); }

  return <section ref={root} className="home-hero hero-carousel container" aria-roledescription="carousel" aria-label="Featured Vehicles" data-playing={playing} data-active-slide={index} data-instant={instant} onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(true); }} onPointerLeave={() => setHovered(false)} onFocusCapture={event => { if (!(event.target as HTMLElement).closest("[data-rotation-control]") || (event.target as HTMLElement).matches(":focus-visible")) setPaused(true); }}>
    <div className="hero-copy"><p className="section-kicker">The Private Gallery</p><div className="hero-heading-slot"><h1 key={slide.slug} className={`hero-carousel-title ${slide.compact ? "hero-title-compact" : ""}`} aria-label={slide.name}><span>{slide.heading[0]}</span>{" "}<span>{slide.heading[1]}.</span></h1></div><p key={`${slide.slug}-description`} className="hero-description">{slide.description}</p><div className="hero-actions"><Link className="button button-dark" href="/inventory">Explore Inventory <ArrowIcon/></Link><WhatsAppQuoteButton/></div><p className="hero-footnote">Discover the collection. Find your next drive.</p></div>
    <div className="hero-visual">
      <Link className="hero-carousel-stage" href={`/inventory/${slide.slug}`} prefetch={false} aria-label={`View ${slide.name}`}>
        {slides.map((item, position) => <div key={item.slug} className="hero-slide-image" data-slide-index={position} data-active={position === index} aria-hidden={position !== index}><ImagePlate hero={position === 0} image={item.image} className="hero-plate" sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1100px) 55vw, 61vw"/></div>)}
      </Link>
      <div className="hero-carousel-footer"><Link className="hero-carousel-caption" href={`/inventory/${slide.slug}`} prefetch={false}>{slide.name} <ArrowIcon/></Link><div className="hero-carousel-controls" role="group" aria-label="Carousel Controls" onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1, true); } }}>
        <div className="hero-carousel-selectors" role="group" aria-label="Choose Featured Vehicle">{slides.map((item, position) => <button type="button" key={item.slug} aria-label={`Show ${item.name}`} aria-pressed={position === index} disabled={!hydrated} onClick={event => { void activate(position, true, event.detail === 0); }}><span aria-hidden="true"><i data-progress-index={position}/></span></button>)}</div>
        <span className="hero-carousel-position" aria-label={`Vehicle ${index + 1} of ${slides.length}`}>{String(index + 1).padStart(2, "0")} <span aria-hidden="true">/</span> {String(slides.length).padStart(2, "0")}</span>
        <button type="button" className="icon-button" aria-label="Previous Featured Vehicle" disabled={!hydrated || slides.length < 2} onClick={event => move(-1, event.detail === 0)}><ArrowIcon className="icon-reversed"/></button>
        <button type="button" className="icon-button hero-carousel-rotation" data-rotation-control aria-label={paused || reduced ? "Play Carousel" : "Pause Carousel"} title={reduced ? "Automatic rotation is off for reduced motion" : undefined} disabled={!hydrated || reduced || slides.length < 2} onClick={() => { setPaused(value => !value); setHovered(false); }}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{paused || reduced ? <path d="m7 4 9 6-9 6V4Z"/> : <path d="M7 4v12M13 4v12"/>}</svg></button>
        <button type="button" className="icon-button" aria-label="Next Featured Vehicle" disabled={!hydrated || slides.length < 2} onClick={event => move(1, event.detail === 0)}><ArrowIcon/></button>
      </div></div>
    </div>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </section>;
}
