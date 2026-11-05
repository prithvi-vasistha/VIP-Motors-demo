import { WishlistButton } from "./wishlist";
import Link from "next/link";
import type { Vehicle } from "@/lib/types";
import { number, priceLabel } from "@/lib/inventory";
import { ImagePlate } from "./image-plate";
import { ArrowIcon } from "./icons";
export function VehicleCard({ vehicle, from = "/inventory", featured = false }: { vehicle: Vehicle; from?: string; featured?: boolean }) {
  return <article className={`vehicle-card ${featured ? "lead-card" : ""}`}>
    <WishlistButton slug={vehicle.slug} name={`${vehicle.make} ${vehicle.model}`}/>
    <Link className="vehicle-link" href={`/inventory/${vehicle.slug}?from=${encodeURIComponent(from)}`}>
      <ImagePlate image={vehicle.images[0]} sizes={featured ? "(max-width: 700px) 100vw, 66vw" : undefined}/>
      <div className="vehicle-card-content">
      <div className="card-meta"><span>{vehicle.availability ?? "The collection"}</span><span>{vehicle.body}</span></div>
      <div className="card-title"><h3>{vehicle.make} {vehicle.model}</h3><ArrowIcon/></div>
      <p className="card-variant">{vehicle.variant}</p>
      <div className="card-specs">{vehicle.year ? <span>{vehicle.year}</span> : null}{vehicle.mileage !== undefined ? <span>{number(vehicle.mileage)} km</span> : null}{vehicle.fuel ? <span>{vehicle.fuel}</span> : null}</div>
      {vehicle.price.kind !== "unknown" ? <p className="card-price"><span>{vehicle.demo ? "Indicative price" : "Asking price"}</span><strong>{priceLabel(vehicle.price)}</strong></p> : null}
      </div>
    </Link>
  </article>;
}
