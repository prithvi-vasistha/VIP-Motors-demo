"use client";
import { WishlistNav } from "./wishlist";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { CloseIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { BrandLogo } from "./brand-logo";

export function Header() {
  const pathname = usePathname();
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand-home" href="/" aria-label="VIP Motors home"><BrandLogo decorative/></Link>
        <nav className="desktop-nav" aria-label="Main navigation"><Link aria-current={pathname.startsWith("/inventory") ? "page" : undefined} href="/inventory">The Inventory</Link><Link aria-current={pathname === "/quote" ? "page" : undefined} href="/quote">Sell Your Car</Link><Link aria-current={pathname === "/finance" ? "page" : undefined} href="/finance">Finance</Link><Link aria-current={pathname === "/contact" ? "page" : undefined} href="/contact">Contact</Link></nav>
        <WishlistNav/><ThemeToggle/>
        <Dialog.Root>
          <Dialog.Trigger className="mobile-menu-button">Menu <span aria-hidden="true">☰</span></Dialog.Trigger>
          <Dialog.Portal><Dialog.Backdrop className="dialog-backdrop"/><Dialog.Popup className="menu-panel drawer" aria-label="Navigation menu">
            <div className="panel-heading"><Dialog.Title><BrandLogo/></Dialog.Title><Dialog.Close className="icon-button" aria-label="Close menu"><CloseIcon/></Dialog.Close></div>
            <Dialog.Description className="muted">The Private Gallery</Dialog.Description>
            <nav aria-label="Mobile navigation"><Dialog.Close render={<Link href="/"/>}>Home</Dialog.Close><Dialog.Close render={<Link href="/inventory"/>}>The Inventory</Dialog.Close><Dialog.Close render={<Link href="/wishlist"/>}>Wishlist</Dialog.Close><Dialog.Close render={<Link href="/quote"/>}>Sell Your Car</Dialog.Close><Dialog.Close render={<Link href="/finance"/>}>Finance And Insurance</Dialog.Close><Dialog.Close render={<Link href="/warranty"/>}>Extended Warranty</Dialog.Close><Dialog.Close render={<Link href="/compare"/>}>Compare Cars</Dialog.Close><Dialog.Close render={<Link href="/about"/>}>About Us</Dialog.Close><Dialog.Close render={<Link href="/contact"/>}>Contact</Dialog.Close></nav>
            <p className="menu-note">Explore the collection. Find your next drive.</p>
          </Dialog.Popup></Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  </>;
}
