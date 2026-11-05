import type { Metadata } from "next";
import Image from "next/image";
import { publicAsset } from "@/lib/site-path";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { dealership } from "@/lib/dealership";

export const metadata: Metadata = { title: "About us" };
export default function About() {
  return <main id="main" className="container about-page">
    <div className="about-heading"><div><p className="section-kicker">VIP Motors, Bengaluru</p><h1>Luxury.<br/>With a personal touch.</h1></div><p>{dealership.description}</p></div>
    <Image className="about-showroom-photo" src={publicAsset("/showroom/interior.webp")} width={1360} height={511} sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1400px) 90vw, 1280px" alt="Mercedes-Benz, BMW and other luxury cars inside the VIP Motors showroom in Bengaluru"/>
    <div className="about-services">
      <section><h2>A car to call your own.</h2><p>Explore our collection of pre-owned luxury cars, each inspected and history-checked. See the details online, then experience your shortlist in person.</p><Link className="text-link" href="/inventory">Explore inventory <ArrowIcon/></Link></section>
      <section><h2>The details, arranged.</h2><p>Finance, insurance and warranty are arranged in-house. Our team can walk you through the options for your chosen car.</p><Link className="text-link" href="/finance">Explore finance and insurance <ArrowIcon/></Link></section>
      <section><h2>Your next chapter.</h2><p>Looking to sell or exchange? Share your car’s details for an indicative valuation, then talk with us about a fair quote.</p><Link className="text-link" href="/quote">Get a quote <ArrowIcon/></Link></section>
    </div>
  </main>;
}
