"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { CloseIcon } from "./icons";

export type QuotePhoto = { id: number; url: string; name: string };
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 8 * 1024 * 1024;

export function VehiclePhotoUpload({ onChange, disabled = false }: { onChange: (photos: QuotePhoto[]) => void; disabled?: boolean }) {
  const [photos, setPhotos] = useState<QuotePhoto[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const urls = useRef(new Set<string>());
  const alive = useRef(true);
  const nextId = useRef(0);
  const id = useId();
  useEffect(() => {
    alive.current = true;
    const ownedUrls = urls.current;
    return () => { alive.current = false; ownedUrls.forEach(url => URL.revokeObjectURL(url)); ownedUrls.clear(); };
  }, []);

  async function addFiles(files: File[]) {
    if (disabled || busy || !files.length) return;
    setError("");
    if (files.length + photos.length > 4) { setError(`You can attach up to 4 photos. Choose ${4 - photos.length} more or remove an existing photo.`); return; }
    setBusy(true);
    const accepted: QuotePhoto[] = [];
    const failures: string[] = [];
    for (const file of files) {
      if (!allowedTypes.has(file.type)) { failures.push(`${file.name}: choose a JPG, PNG or WebP image.`); continue; }
      if (file.size > maxBytes) { failures.push(`${file.name}: choose an image under 8 MB.`); continue; }
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      try {
        const picture = new window.Image(); picture.src = url;
        await picture.decode();
        if (!picture.naturalWidth || picture.naturalWidth * picture.naturalHeight > 50000000) throw new Error("dimensions");
        if (!alive.current) { URL.revokeObjectURL(url); urls.current.delete(url); return; }
        accepted.push({ id: nextId.current++, url, name: file.name });
      } catch {
        URL.revokeObjectURL(url); urls.current.delete(url);
        failures.push(`${file.name}: this image couldn’t be opened. Try another photo, under 50 megapixels.`);
      }
    }
    if (!alive.current) return;
    const next = [...photos, ...accepted];
    setPhotos(next); setError(failures.join(" ")); setBusy(false);
    if (accepted.length) onChange(next);
  }
  function remove(photo: QuotePhoto) {
    URL.revokeObjectURL(photo.url); urls.current.delete(photo.url);
    const next = photos.filter(item => item.id !== photo.id);
    setPhotos(next); setError(""); onChange(next);
  }
  function drop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); void addFiles(Array.from(event.dataTransfer.files)); }
  function choose(event: ChangeEvent<HTMLInputElement>) { void addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }

  return <div className="quote-photo-upload">
    <div className={`quote-photo-drop ${dragging ? "is-dragging" : ""}`} onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 11h6l2-4h8l2 4h6v16H4z"/><circle cx="16" cy="18" r="5"/><path d="M24 14h1"/></svg>
      <div><label className="quote-upload-label" htmlFor={id}>{busy ? "Opening your photos…" : "Add photos of your car"}</label><p>Exterior, interior or details. Up to 4 photos.</p><small>JPG, PNG or WebP · 8 MB each · Optional</small></div>
      <label className="quote-upload-button" htmlFor={id}><span>{busy ? "Opening…" : "+ Choose photos"}</span><input id={id} name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled || busy || photos.length >= 4} onChange={choose} aria-describedby={`${id}-note${error ? ` ${id}-error` : ""}`}/></label>
    </div>
    {photos.length ? <ul className="quote-photo-grid" aria-label="Attached car photos">{photos.map((photo, index) => <li key={photo.id}><div><Image src={photo.url} alt={`Your uploaded car photo ${index + 1}`} fill unoptimized sizes="160px" style={{ objectFit: "cover" }}/><button type="button" disabled={disabled} aria-label={`Remove ${photo.name}`} onClick={() => remove(photo)}><CloseIcon/></button></div><p title={photo.name}>{photo.name}</p></li>)}</ul> : null}
    {error ? <p id={`${id}-error`} className="field-error" role="alert">{error}</p> : null}
    <p id={`${id}-note`} className="quote-photo-note">Photos stay private to this browser session and are not included in saved quotes or shared links.</p>
    <p className="sr-only" role="status">{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} attached locally.` : "No photos attached."}</p>
  </div>;
}
