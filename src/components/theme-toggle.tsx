"use client";

import { useSyncExternalStore } from "react";

const eventName = "vip-theme-change";
function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
}
function snapshot() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "dark");
  const next = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("vip:v2:theme", next); } catch { /* The current-page switch still works without storage. */ }
    const url = new URL(window.location.href);
    if (url.searchParams.has("theme")) {
      url.searchParams.set("theme", next);
      window.history.replaceState(window.history.state, "", url.toString());
    }
    window.dispatchEvent(new Event(eventName));
  }

  return <><meta name="theme-color" content={theme === "dark" ? "#0c0d10" : "#f7f6f3"}/><button type="button" className="theme-toggle" onClick={toggle} aria-label={`Switch to ${next} theme`}>
    {theme === "dark" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 14.3A8.5 8.5 0 0 1 9.7 4a8.5 8.5 0 1 0 10.3 10.3Z"/></svg>}
    <span>{next === "light" ? "Light" : "Dark"}</span>
  </button></>;
}
