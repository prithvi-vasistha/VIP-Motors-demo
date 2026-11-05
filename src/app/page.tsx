import Link from "next/link";
import { inventory } from "@/lib/inventory";
import { VehicleCard } from "@/components/vehicle-card";
import { HeroCarousel } from "@/components/hero-carousel";
import { heroSlides } from "@/lib/hero-collection";
import { HeroParticleBackground } from "@/components/hero-particle-background";
import { ArrowIcon, DoubleArrowIcon } from "@/components/icons";

export default function Home() {
  const selected = inventory.slice(0, 3);
  return <main id="main" className="home-page"><HeroParticleBackground/>
    <HeroCarousel slides={heroSlides}/>
    <section className="selected-section container" aria-labelledby="selected-title"><div className="shoulder-rule"/><div className="section-heading"><div><p className="section-kicker">A closer look</p><h2 id="selected-title">Selected Vehicles</h2></div><Link className="text-link" href="/inventory">View All {inventory.length} Vehicles <ArrowIcon/></Link></div>
      <div className={`selected-grid ${selected.length < 3 ? "selected-grid-few" : ""}`}>{selected.length >= 3 ? <><VehicleCard vehicle={selected[0]} featured/><div className="selected-aside">{selected.slice(1).map(vehicle => <VehicleCard key={vehicle.id} vehicle={vehicle}/>)}</div></> : selected.length ? selected.map(vehicle => <VehicleCard key={vehicle.id} vehicle={vehicle}/>) : <p className="muted">The collection is being prepared. Visit the inventory for updates.</p>}</div>
      <div className="selected-more"><Link className="button button-outline" href="/inventory">View More <DoubleArrowIcon/></Link></div>
    </section>
    <section className="sell-section container" aria-labelledby="sell-title"><div className="sell-copy"><p className="section-kicker">Sell your car</p><h2 id="sell-title">A fair quote.<br/>A clear next step.</h2><p>Thinking of selling? Share a few details about your car and explore an indicative valuation. A clearer starting point for your next move.</p><Link className="button button-dark" href="/quote">Get a fair quote <ArrowIcon/></Link></div><div className="sell-panel"><span className="sell-panel-line"/><h3>A little detail.<br/>A clearer picture.</h3><p>Your make, model and the miles behind you.<br/>An indicative range for what comes next.</p><Link className="text-link" href="/quote">Get an instant estimate <ArrowIcon/></Link></div></section>
  </main>;
}
