import type { Metadata } from "next";
import { FinancePageView } from "@/components/finance-page-view";
export const metadata: Metadata = { title: "Finance and insurance" };
export default function Page() { return <FinancePageView/>; }
