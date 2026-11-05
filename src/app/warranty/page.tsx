import type { Metadata } from "next";
import { WarrantyPageView } from "@/components/warranty-page-view";
export const metadata: Metadata = { title: "Extended warranty" };
export default function Page() { return <WarrantyPageView/>; }
