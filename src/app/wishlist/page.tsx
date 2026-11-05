import type { Metadata } from "next";
import { WishlistCollection } from "@/components/wishlist";
export const metadata: Metadata = { title: "Wishlist" };
export default function WishlistPage() { return <WishlistCollection/>; }
