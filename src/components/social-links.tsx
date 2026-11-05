import Image from "next/image";
import { dealership } from "@/lib/dealership";
import { publicAsset } from "@/lib/site-path";

export function WhatsAppQuoteButton() {
  return <a className="button whatsapp-quote" href="https://www.whatsapp.com/" target="_blank" rel="noopener noreferrer"><Image src={publicAsset("/social/whatsapp.svg")} alt="" width={21} height={21} unoptimized/><span>Get Quote On WhatsApp</span></a>;
}

export function InstagramLink({ className = "" }: { className?: string }) {
  return <a className={`instagram-link ${className}`} href={dealership.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Instagram ${dealership.handle}`}><Image src={publicAsset("/social/instagram.png")} width={22} height={22} alt="" unoptimized/><span>{dealership.handle}</span></a>;
}
