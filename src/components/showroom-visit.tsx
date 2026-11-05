import { InstagramLink } from "./social-links";
import { ShowroomAddress } from "./showroom-address";
import Image from "next/image";
import { publicAsset } from "@/lib/site-path";
import Link from "next/link";
import { dealership } from "@/lib/dealership";
import { ArrowIcon } from "./icons";

export function ShowroomVisit() {
  return <section id="showroom" className="showroom-visit" aria-labelledby="showroom-title">
    <div className="container showroom-visit-grid">
      <a className="showroom-visit-photo" href={dealership.directions} target="_blank" rel="noopener noreferrer" aria-label="Get directions to the VIP Motors showroom">
        <Image src={publicAsset("/showroom/exterior.webp")} alt="The VIP Motors showroom entrance on Magadi Main Road, with the red and silver VIP Motors sign above the glass frontage" width={1360} height={1020} sizes="(max-width: 700px) calc(100vw - 40px), 55vw"/>
        <span className="showroom-photo-link" aria-hidden="true"><ArrowIcon/></span>
      </a>
      <div className="showroom-visit-copy">
        <p className="section-kicker">Visit the showroom</p>
        <h2 id="showroom-title">Come and see the cars in person.</h2>
        <p className="showroom-invitation">Take a closer look, settle into the driver’s seat and find the car that feels right for you.</p>
        <ShowroomAddress/>
        <div className="showroom-visit-details"><a href={dealership.telephone}>{dealership.phone}</a><span>{dealership.hours}</span></div>
        <div className="showroom-visit-actions"><a href={dealership.directions} target="_blank" rel="noopener noreferrer" className="button button-dark">Get directions <ArrowIcon/></a><Link className="text-link" href="/contact">Contact the team <ArrowIcon/></Link></div>
        <InstagramLink className="showroom-instagram"/>
      </div>
    </div>
  </section>;
}
