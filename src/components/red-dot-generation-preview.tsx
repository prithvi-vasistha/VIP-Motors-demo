"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { RedDotGenerationLoader } from "./red-dot-generation-loader";

type Props = {
  active: boolean;
  imageSrc?: string;
  imageAlt: string;
  className?: string;
  backgroundColor?: string;
  label?: string;
  error?: string;
  density?: number;
  speed?: number;
  character?: "dot" | "cross";
};

/** Holds one fixed output plate through loading, image decode, crossfade and error. No backend. */
export function RedDotGenerationPreview({ active, imageSrc, imageAlt, className = "", backgroundColor = "#09090B", label = "Generating image…", error, density, speed, character = "cross" }: Props) {
  const [decoded, setDecoded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (active || !imageSrc || error) return;
    let current = true, settling = false;
    const image = new window.Image();
    image.decoding = "async";
    const fail = () => { if (current) setFailed(imageSrc); };
    const finish = async () => {
      if (settling) return;
      settling = true;
      try {
        if (image.decode) await image.decode();
        if (!image.naturalWidth) throw new Error("Image is unavailable");
        if (current) setDecoded(imageSrc);
      } catch { fail(); }
    };
    image.onload = () => { void finish(); };
    image.onerror = fail;
    image.src = imageSrc;
    if (image.complete && image.naturalWidth) void finish();
    return () => { current = false; image.onload = null; image.onerror = null; image.src = ""; };
  }, [active, imageSrc, error]);
  const failure = error || (!active && imageSrc && failed === imageSrc && decoded !== imageSrc ? "This photograph couldn’t be opened. Choose another image." : "");
  const ready = !active && !!imageSrc && decoded === imageSrc && !failure;
  const loading = !failure && (active || (!!imageSrc && !ready));

  return <><div role="group" className={`generation-preview ${className}`} data-ready={ready} data-loading={loading} aria-label="Vehicle photograph" aria-busy={loading} style={{ backgroundColor }}>
    {!failure && <RedDotGenerationLoader active={loading} className="generation-preview-particles" backgroundColor={backgroundColor} density={density} speed={speed} character={character} label=""/>}
    {ready && <Image className="generation-preview-image" src={imageSrc!} alt={imageAlt} fill unoptimized sizes="100vw" style={{ objectFit: "contain" }}/>}
    {failure && <div className="generation-preview-error" role="alert"><strong>Photograph unavailable</strong><p>{failure}</p></div>}
  </div><span className="sr-only" role="status" aria-live="polite">{label ? loading ? label : ready ? "Photograph ready." : "" : ""}</span></>;
}
