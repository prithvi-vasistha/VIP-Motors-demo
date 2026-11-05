import Image from "next/image";
import { publicAsset } from "@/lib/site-path";

/** The approved PNG is the single source for the dealership's visual identity. */
export function BrandLogo({ className = "", decorative = false }: { className?: string; decorative?: boolean }) {
  return <span className={`brand-logo ${className}`}><Image src={publicAsset("/brand/vip-motors.png")} alt={decorative ? "" : "VIP Motors"} width={1254} height={1254} sizes="(max-width: 700px) 80px, 100px" unoptimized/></span>;
}
