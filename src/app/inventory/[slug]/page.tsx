import { BackToResults } from "@/components/back-to-results";
import { WishlistButton } from "@/components/wishlist";
import { WhatsAppQuoteButton } from "@/components/social-links";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { inventory, number, priceLabel } from "@/lib/inventory";
import { VehicleGallery } from "@/components/vehicle-gallery";
import { Enquiry } from "@/components/enquiry";
import { ArrowIcon } from "@/components/icons";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const v = inventory.find(v => v.slug === slug); return { title: v ? `${v.make} ${v.model}` : "Vehicle not found" }; }
export function generateStaticParams() { return inventory.map(({ slug }) => ({ slug })); }
export const dynamicParams = false;
export default async function VehicleDetail({ params }: Props) {
  const { slug } = await params;
  const vehicle = inventory.find(v => v.slug === slug);
  if (!vehicle) notFound();
  const name = `${vehicle.make} ${vehicle.model}`;
  const specs = [["Year", vehicle.year], ["Mileage", vehicle.mileage !== undefined ? `${number(vehicle.mileage)} km` : undefined], ["Fuel", vehicle.fuel], ["Transmission", vehicle.transmission], ["Body style", vehicle.body]].filter(([,value]) => value !== undefined);
  return <main id="main" className="container vehicle-page"><BackToResults/><VehicleGallery key={vehicle.id} images={vehicle.images} name={name}/><div className="vehicle-detail-grid"><div><p className="section-kicker">{vehicle.availability ?? "The collection"}</p><h1>{name}</h1><WishlistButton slug={vehicle.slug} name={name} expanded/><p className="detail-variant">{vehicle.variant}</p><dl className="spec-list">{specs.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><section className="condition-section"><h2>About this vehicle</h2><p>{vehicle.description ?? "Explore this model and get in touch for more information."}</p>{vehicle.condition ? <p>{vehicle.condition}</p> : <p className="muted">Enquire for current vehicle photographs, condition details and availability.</p>}</section></div><aside className="detail-enquiry">{vehicle.demo && vehicle.price.kind === "numeric" ? <p className="quote-label">Indicative price</p> : null}{vehicle.price.kind !== "unknown" ? <p className="detail-price">{priceLabel(vehicle.price)}</p> : <h2 className="detail-price">Take a closer look.</h2>}{vehicle.availability ? <p className="muted">{vehicle.availability}</p> : null}<Enquiry vehicleName={name} reference={vehicle.id}/><WhatsAppQuoteButton/><div className="detail-service-links"><Link href={`/finance?vehicle=${vehicle.slug}`}>Explore finance <ArrowIcon/></Link><Link href={`/warranty?vehicle=${vehicle.slug}`}>Extended warranty <ArrowIcon/></Link><Link href={`/compare?first=${vehicle.slug}`}>Compare this car <ArrowIcon/></Link></div><p className="fine-print">Prepare your enquiry, then copy and share it with VIP Motors.</p></aside></div></main>;
}
