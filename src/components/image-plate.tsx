"use client";
import Image from "next/image";
import { publicAsset } from "@/lib/site-path";
import { useState } from "react";
import type { VehicleImage } from "@/lib/types";
export function ImagePlate({ image, hero = false, className = "", caption, sizes = "(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" }: { image: VehicleImage; hero?: boolean; className?: string; caption?: string; sizes?: string }) {
  const [failed, setFailed] = useState(false);
  const photo = image.kind === "photo";
  return <div className={`image-plate ${photo ? "is-photo" : ""} ${className}`}>
    {!failed ? <Image src={publicAsset(image.src)} alt={image.alt} fill sizes={sizes} preload={hero} style={{ objectFit: image.fit ?? "cover", objectPosition: image.focalPoint }} onError={() => setFailed(true)}/> : <span className="image-fallback" role="img" aria-label={image.alt}/>}
    {!photo || failed ? <span className="plate-center" aria-hidden="true">{failed ? "Photograph unavailable" : hero ? "Vehicle photography" : `${image.label} photograph`}</span> : null}
    {!photo || failed ? <span className="plate-caption">{failed ? "Explore the vehicle details below" : caption ?? "Approved photography to follow"}</span> : null}
  </div>;
}
