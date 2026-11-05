import { InstagramLink } from "./social-links";
import { ShowroomAddress } from "./showroom-address";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { dealership } from "@/lib/dealership";

const makes = ["Mercedes-Benz", "BMW", "Audi", "Land Rover", "Porsche", "Toyota"];
const destinations = [
  ["Sell Or Exchange", "/quote"],
  ["Finance And Insurance", "/finance"],
  ["Extended Warranty", "/warranty"],
  ["About Us", "/about"],
  ["Visit The Showroom", "/#showroom"],
  ["Compare Cars", "/compare"],
  ["Wishlist", "/wishlist"],
] as const;

export function Footer() {
  return <footer className="site-footer">
    <div className="container footer-main">
      <div className="footer-identity">
        <Link className="footer-brand" href="/" aria-label="VIP Motors home"><BrandLogo decorative/></Link>
        <p>{dealership.description}</p>
        <p className="footer-promise">Luxury <span aria-hidden="true">|</span> Experience <span aria-hidden="true">|</span> Exclusivity</p>
      </div>
      <nav className="footer-column" aria-label="Buy by brand"><h2>Buy</h2><ul>{makes.map(make => <li key={make}><Link href={`/inventory?${new URLSearchParams({ make })}`}>{make}</Link></li>)}<li><Link href="/inventory">All Stock</Link></li></ul></nav>
      <nav className="footer-column" aria-label="VIP Motors"><h2>VIP Motors</h2><ul>{destinations.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul></nav>
      <div className="footer-column footer-showroom"><h2>Showroom</h2>
        <ShowroomAddress/>
        <ul><li><a href={dealership.telephone}>{dealership.phone}</a></li><li><a href={`mailto:${dealership.email}`}>{dealership.email}</a></li><li><InstagramLink/></li></ul>
        <p className="footer-hours">{dealership.hours}</p>
      </div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} VIP Motors</span><p>Prices and availability are subject to confirmation. <Link href="/legal">Legal</Link></p></div>
  </footer>;
}
