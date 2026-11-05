import { publicAsset, basePath } from "@/lib/site-path";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/header";
import { HomeIntro } from "@/components/home-intro";
import { Footer } from "@/components/footer";
import { ShowroomVisit } from "@/components/showroom-visit";
import { Chatbot } from "@/components/chatbot";
import { inventory } from "@/lib/inventory";
import { RouteTransition } from "@/components/route-transition";
import "./globals.css";
import "./services.css";
import "./hero-carousel.css";

const display = localFont({ src: "../../public/fonts/instrument-serif.ttf", variable: "--font-display", display: "swap", weight: "400" });
const sans = localFont({ src: [{ path: "../../public/fonts/dm-sans-400.ttf", weight: "400" }, { path: "../../public/fonts/dm-sans-500.ttf", weight: "500" }, { path: "../../public/fonts/dm-sans-600.ttf", weight: "600" }, { path: "../../public/fonts/dm-sans.ttf", weight: "700" }], variable: "--font-sans", display: "swap" });
export const metadata: Metadata = { title: { default: "VIP Motors | The Private Gallery", template: "%s | VIP Motors" }, description: "Explore the VIP Motors collection, find your next vehicle and get an indicative quote for your car.", icons: { icon: publicAsset("/brand/vip-motors.png"), apple: publicAsset("/brand/vip-motors.png") }, robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const conciergeVehicles = inventory.flatMap(vehicle => vehicle.price.kind === "numeric" ? [{ id: vehicle.id, slug: vehicle.slug, make: vehicle.make, model: vehicle.model, year: vehicle.year, body: vehicle.body, price: vehicle.price.amount, currency: vehicle.price.currency, image: { src: vehicle.images[0].src, alt: vehicle.images[0].alt, width: vehicle.images[0].width, height: vehicle.images[0].height } }] : []);
  return <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}><head><script dangerouslySetInnerHTML={{ __html: `try{var t=new URLSearchParams(location.search).get('theme');if(t!=='light'&&t!=='dark')t=localStorage.getItem('vip:v2:theme');document.documentElement.dataset.theme=t==='light'?'light':'dark';if(new URLSearchParams(location.search).has('theme')&&(t==='light'||t==='dark'))localStorage.setItem('vip:v2:theme',t);}catch(e){document.documentElement.dataset.theme='dark'}` }}/><script dangerouslySetInnerHTML={{ __html: `try{var r=document.documentElement;var play=(location.pathname===${JSON.stringify(basePath + '/')}||location.pathname===${JSON.stringify(basePath || '/')})&&!sessionStorage.getItem('vip:intro:v2:showcase')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;r.dataset.vipIntro=play?'play':'done';if(play){sessionStorage.setItem('vip:intro:v2:showcase','seen');document.addEventListener('keydown',function(){r.dataset.vipIntro='done'},{once:true,capture:true})}}catch(e){document.documentElement.dataset.vipIntro='done'}` }}/></head><body><HomeIntro/><Header/><RouteTransition>{children}</RouteTransition><Chatbot vehicles={conciergeVehicles}/><ShowroomVisit/><Footer/></body></html>;
}
