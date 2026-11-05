"use client";

import { useEffect, useRef, type CSSProperties } from "react";

export type RedDotGenerationLoaderProps = {
  active?: boolean;
  className?: string;
  /** A red hex colour. Non-red or invalid values fall back to #EF4444. */
  color?: string;
  backgroundColor?: string;
  /** Particle density multiplier: 1 ≈ one home position per 10×10 CSS px; clamped to 0.4–2. */
  density?: number;
  /** Wave clock multiplier: 1 is normal speed; clamped to 0.25–2. */
  speed?: number;
  label?: string;
  /** Small dots for ambience; fine multiplication crosses for active processing. */
  character?: "dot" | "cross";
};

type Engine = { setActive: (value: boolean) => void };
const TAU = Math.PI * 2;
const STRIDE = 7;
const MAX_PARTICLES = 6000;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const safeNumber = (value: number, fallback: number, min: number, max: number) => Number.isFinite(value) ? clamp(value, min, max) : fallback;
const smoothstep = (a: number, b: number, value: number) => { const t = clamp((value - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function paletteFromRed(color: string) {
  const hex = /^#([a-f\d]{6}|[a-f\d]{3})$/i.exec(color)?.[1];
  const expanded = hex?.length === 3 ? hex.split("").map(letter => letter + letter).join("") : hex;
  let red = expanded ? parseInt(expanded.slice(0, 2), 16) : 239;
  let green = expanded ? parseInt(expanded.slice(2, 4), 16) : 68;
  let blue = expanded ? parseInt(expanded.slice(4, 6), 16) : 68;
  // Keep every dot red: reject blue/purple/orange and near-white overrides.
  if (red < 100 || red < green * 1.55 || red < blue * 1.55 || blue < green * 0.65 || green < blue * 0.45) { red = 239; green = 68; blue = 68; }
  return ["#B91C1C", `rgb(${red},${green},${blue})`, "#F87171"];
}

/** Canvas-only decorative surface. The parent owns its dimensions and loading lifecycle. */
export function RedDotGenerationLoader({ active = true, className = "", color = "#EF4444", backgroundColor = "#09090B", density = 1, speed = 1, label = "Generating image…", character = "dot" }: RedDotGenerationLoaderProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const activeRef = useRef(active);
  const elapsed = useRef(0);
  const entered = useRef(false);
  const safeDensity = safeNumber(density, 1, 0.4, 2);
  const safeSpeed = safeNumber(speed, 1, 0.25, 2);

  useEffect(() => { activeRef.current = active; engine.current?.setActive(active); }, [active]);
  useEffect(() => {
    const surface = root.current;
    const plate = canvas.current;
    const context = plate?.getContext("2d", { alpha: true });
    if (!surface || !plate || !context) return;
    const colours = paletteFromRed(color);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = media.matches;
    let enabled = activeRef.current;
    let intersecting = false;
    let disposed = false;
    let frame = 0;
    let lastTime: number | null = null;
    let width = 0, height = 0, ratio = 1;
    let light = false;
    let particles = new Float32Array(0);
    let ends = [0, 0, 0];
    let count = 0;
    let painted = false;

    function buildField() {
      // Seeded appearance only; all centres remain locked to a square lattice.
      let seed = 0x71f02ca9;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      const spacing = Math.max(10 / Math.sqrt(safeDensity), Math.sqrt(width * height / (MAX_PARTICLES - 240)));
      const columns = Math.min(MAX_PARTICLES, Math.max(1, Math.floor(width / spacing)));
      const rows = Math.min(Math.floor(MAX_PARTICLES / columns), Math.max(1, Math.floor(height / spacing)));
      const originX = (width - (columns - 1) * spacing) / 2;
      const originY = (height - (rows - 1) * spacing) / 2;
      const groups: number[][] = [[], [], []];
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const x = originX + column * spacing;
          const y = originY + row * spacing;
          const u = x / width, v = y / height;
          const tone = random();
          const group = tone < 0.24 ? 0 : tone < 0.83 ? 1 : 2;
          const edge = smoothstep(0, Math.min(27, width * 0.08, height * 0.08), Math.min(x, width - x, y, height - y));
          groups[group].push(x, y, (u + 1 - v) / 2, (u + v) / 2, 0.8 + random() * 0.35, 0.78 + random() * 0.22, edge);
        }
      }
      count = groups.reduce((total, group) => total + group.length / STRIDE, 0);
      particles = new Float32Array(count * STRIDE);
      let offset = 0;
      ends = groups.map(group => { particles.set(group, offset); offset += group.length; return offset; });
      surface!.dataset.particleCount = String(count);
    }

    function readBackground() {
      const rgb = getComputedStyle(surface!).backgroundColor.match(/[\d.]+/g)?.map(Number);
      light = !!rgb && (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722) > 145;
    }

    function draw() {
      if (disposed || !enabled || document.hidden || !intersecting || !width || !height) return;
      const t = elapsed.current;
      if (reduced || t > 3.9) entered.current = true;
      context!.clearRect(0, 0, width, height);
      let start = 0;
      for (let tone = 0; tone < 3; tone++) {
        context!.fillStyle = colours[tone];
        context!.strokeStyle = colours[tone];
        context!.lineCap = "round";
        context!.lineWidth = 0.72;
        for (let i = start; i < ends[tone]; i += STRIDE) {
          const x = particles[i], y = particles[i + 1], diagonal = particles[i + 2], cross = particles[i + 3];
          // Increasing diagonal coordinates run from bottom-left to top-right.
          // Only appearance changes: rows and columns remain aligned at every frame.
          const first = 0.5 + 0.5 * Math.cos(TAU * (diagonal * 0.82 - t / 4.8) + Math.sin(cross * 5.1 - t * 0.19) * 0.42);
          const second = 0.5 + 0.5 * Math.cos(TAU * (diagonal * 0.57 - t / 6.6) + cross * 2.1 + 1.7);
          const u = x / width, v = y / height;
          const dx = u - (0.5 + 0.18 * Math.sin(t * 0.24));
          const dy = v - (0.5 - 0.15 * Math.cos(t * 0.21));
          const depth = Math.exp(-(dx * dx * 11 + dy * dy * 13));
          const activity = clamp(first * first * 0.63 + second * second * 0.26 + depth * 0.18, 0, 1);
          const entry = entered.current ? 1 : smoothstep(-0.12, 0.22, t / 3.2 - diagonal);
          const alpha = (light ? 0.13 + activity * 0.67 : 0.07 + activity * 0.77) * particles[i + 5] * particles[i + 6] * (0.16 + 0.84 * entry);
          const radius = clamp((0.56 + activity * 1.02) * particles[i + 4], 0.55, 1.7);
          context!.globalAlpha = alpha;
          context!.beginPath();
          if (character === "cross") {
            const arm = radius * 1.3;
            context!.moveTo(x - arm, y - arm); context!.lineTo(x + arm, y + arm);
            context!.moveTo(x + arm, y - arm); context!.lineTo(x - arm, y + arm);
            context!.stroke();
          } else {
            context!.arc(x, y, radius, 0, TAU); context!.fill();
          }
        }
        start = ends[tone];
      }
      context!.globalAlpha = 1;
      if (!painted) { painted = true; surface!.dataset.ready = "true"; }
    }

    function stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; lastTime = null;
      surface!.dataset.rendering = "false";
    }
    function tick(timestamp: number) {
      frame = 0;
      if (disposed || !enabled || reduced || document.hidden || !intersecting || !width || !height) { stop(); return; }
      if (lastTime !== null) elapsed.current += (timestamp - lastTime) / 1000 * safeSpeed;
      lastTime = timestamp;
      draw();
      frame = requestAnimationFrame(tick);
    }
    function reconcile() {
      if (disposed) return;
      surface!.dataset.motion = reduced ? "static" : "animated";
      if (enabled && !document.hidden && intersecting && !reduced && width && height) {
        if (!frame) { lastTime = null; frame = requestAnimationFrame(tick); surface!.dataset.rendering = "true"; }
      } else {
        stop();
        if (enabled && reduced && intersecting && !document.hidden) draw();
      }
    }
    function resize() {
      if (disposed) return;
      const bounds = surface!.getBoundingClientRect();
      const nextRatio = clamp(window.devicePixelRatio || 1, 1, 2);
      if (width !== bounds.width || height !== bounds.height || ratio !== nextRatio) {
        width = bounds.width; height = bounds.height; ratio = nextRatio;
        plate!.width = Math.max(1, Math.round(width * ratio)); plate!.height = Math.max(1, Math.round(height * ratio));
        context!.setTransform(ratio, 0, 0, ratio, 0, 0);
        if (width && height) buildField();
        readBackground(); draw(); reconcile();
      }
    }
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(entries => {
      if (disposed) return;
      intersecting = entries[0]?.isIntersecting ?? false; reconcile();
    }, { threshold: 0 });
    const themeObserver = new MutationObserver(() => { if (!disposed) { readBackground(); if (enabled && intersecting && !document.hidden) draw(); } });
    const preferenceChanged = () => { reduced = media.matches; reconcile(); };
    const visibilityChanged = () => reconcile();
    const controller: Engine = { setActive(value) { enabled = value; reconcile(); } };
    engine.current = controller;
    resizeObserver.observe(surface); intersectionObserver.observe(surface);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    media.addEventListener("change", preferenceChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("resize", resize);
    resize();
    return () => {
      disposed = true; stop();
      resizeObserver.disconnect(); intersectionObserver.disconnect(); themeObserver.disconnect();
      media.removeEventListener("change", preferenceChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("resize", resize);
      if (engine.current === controller) engine.current = null;
    };
  }, [color, backgroundColor, safeDensity, safeSpeed, character]);

  return <div ref={root} className={`red-dot-loader ${className}`} data-active={active} data-character={character} style={{ backgroundColor } as CSSProperties}>
    <canvas ref={canvas} aria-hidden="true"/>
    <span className="sr-only" role="status" aria-live="polite">{active ? label : ""}</span>
  </div>;
}
