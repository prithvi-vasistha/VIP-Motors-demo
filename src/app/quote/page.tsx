import type { Metadata } from "next";
import { QuotePagePageView } from "@/components/quote-page-view";
export const metadata: Metadata = { title: "Get a quote" };
export default function Page() { return <QuotePagePageView/>; }
