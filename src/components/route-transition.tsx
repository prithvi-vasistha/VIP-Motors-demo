"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const stage = useRef<HTMLDivElement>(null);
  const keyboard = useRef(false);
  useEffect(() => {
    const key = () => { keyboard.current = true; };
    const pointer = () => { keyboard.current = false; };
    document.addEventListener("keydown", key, true);
    document.addEventListener("pointerdown", pointer, true);
    return () => { document.removeEventListener("keydown", key, true); document.removeEventListener("pointerdown", pointer, true); };
  }, []);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (keyboard.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = stage.current?.animate([{ opacity: 0.72, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 240, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
    return () => animation?.cancel();
  }, [pathname]);
  return <div ref={stage} className="route-stage">{children}</div>;
}
