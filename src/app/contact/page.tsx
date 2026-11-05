import type { Metadata } from "next";
import { ContactPageView } from "@/components/contact-page-view";
export const metadata: Metadata = { title: "Contact & enquiries" };
export default function Page() { return <ContactPageView/>; }
