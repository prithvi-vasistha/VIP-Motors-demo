"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./brand-logo";
import { RedDotGenerationLoader } from "./red-dot-generation-loader";
export function HomeIntro() {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    const end = () => { layer.dataset.finished = "true"; document.documentElement.dataset.vipIntro = "done"; };
    const settled = (event: AnimationEvent) => { if (event.animationName === "site-intro-exit") end(); };
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => { if (reduced.matches) end(); };
    layer.addEventListener("animationend", settled);
    // The CSS sequence also completes before hydration on a slow connection.
    if (pathname !== "/" || reduced.matches || document.documentElement.dataset.vipIntro !== "play" || layer.getAnimations().every(animation => animation.playState === "finished")) end();
    document.addEventListener("keydown", end, { once: true, capture: true });
    document.addEventListener("pointerdown", end, { once: true, capture: true });
    reduced.addEventListener("change", preference);
    return () => { document.removeEventListener("keydown", end, { capture: true }); document.removeEventListener("pointerdown", end, { capture: true }); reduced.removeEventListener("change", preference); layer.removeEventListener("animationend", settled); };
  }, [pathname]);
  return <div ref={ref} className="site-intro" aria-hidden="true"><div className="site-intro-particles"><RedDotGenerationLoader label="" density={.7} speed={2} backgroundColor="transparent"/></div><div className="site-intro-identity"><div className="site-intro-mark"><BrandLogo decorative/></div><span className="site-intro-rule"/><span className="site-intro-caption">The Private Gallery</span></div></div>;
}
