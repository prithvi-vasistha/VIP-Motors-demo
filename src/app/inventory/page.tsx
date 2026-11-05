import type { Metadata } from "next";
import { InventoryPageView } from "@/components/inventory-page-view";
export const metadata: Metadata = { title: "The inventory" };
export default function Page() { return <InventoryPageView/>; }
