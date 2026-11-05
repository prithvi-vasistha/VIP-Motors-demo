import { RedDotGenerationLoader } from "./red-dot-generation-loader";

/** One art-directed ambient treatment. It never covers content or accepts input. */
export function HeroParticleBackground() {
  return <div className="hero-ambient" aria-hidden="true"><RedDotGenerationLoader active character="dot" backgroundColor="var(--paper)" density={0.62} speed={0.48} label=""/></div>;
}
