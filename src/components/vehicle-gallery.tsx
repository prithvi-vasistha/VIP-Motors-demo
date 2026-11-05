"use client";
import Image from "next/image";
import { publicAsset } from "@/lib/site-path";
import { useState } from "react";
import type { VehicleImage } from "@/lib/types";
import { ImagePlate } from "./image-plate";
import { ArrowIcon } from "./icons";
export function VehicleGallery({ images, name }: { images: VehicleImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const change = (next: number) => setIndex((next + images.length) % images.length);
  return <section className={`vehicle-gallery ${keyboard ? "keyboard-gallery" : ""}`} aria-label={`${name} image gallery`} onKeyDown={event => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); setKeyboard(true); change(index + (event.key === "ArrowRight" ? 1 : -1)); }
  }} onPointerDown={() => setKeyboard(false)}>
    <div className="gallery-stage">{images.map((image, i) => <div key={image.src} className="gallery-layer" aria-hidden={i !== index} data-active={i === index}><ImagePlate image={image} sizes="(max-width: 700px) 100vw, 90vw"/></div>)}</div>
    <div className="gallery-bottom"><div className="gallery-position" aria-live="polite"><span>{String(index + 1).padStart(2, "0")}</span><span className="gallery-position-line"/><span>{String(images.length).padStart(2, "0")}</span><span className="gallery-view-label">{images[index].label}</span></div>{images.length > 1 ? <div className="gallery-controls"><button className="icon-button" aria-label="Previous image" onClick={() => change(index - 1)}><ArrowIcon className="icon-reversed"/></button><button className="icon-button" aria-label="Next image" onClick={() => change(index + 1)}><ArrowIcon/></button></div> : <span className="muted">Single image plate</span>}</div>
    {images.length > 1 ? <div className="gallery-thumbnails" aria-label="Choose a view">{images.map((image, i) => <button key={image.src} aria-label={`View ${image.label.toLowerCase()} image`} aria-pressed={index === i} onClick={() => change(i)}><Image src={publicAsset(image.src)} alt="" width={image.width} height={image.height} sizes="110px"/><span>{image.label}</span></button>)}</div> : null}
  </section>;
}
