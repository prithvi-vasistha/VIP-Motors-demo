import type { Metadata } from "next";
import { ComparePageView } from "@/components/compare-page-view";
export const metadata: Metadata = { title: "Compare cars" };
export default function Page() { return <ComparePageView/>; }
