import Link from "next/link";
export default function NotFound() { return <main id="main" className="container empty-state"><p className="section-kicker">Page not found</p><h1>This page isn’t in the collection.</h1><p>Return to the inventory to find your next vehicle.</p><Link className="button button-dark" href="/inventory">Explore inventory</Link></main>; }
