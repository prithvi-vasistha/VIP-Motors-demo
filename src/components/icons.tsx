import type { SVGProps } from "react";
type Props = SVGProps<SVGSVGElement>;
export function ArrowIcon(props: Props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}><path d="M4 12h15m-6-6 6 6-6 6" /></svg>; }
export function DoubleArrowIcon(props: Props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="m4 6 6 6-6 6m9-12 6 6-6 6"/></svg>; }
export function CloseIcon(props: Props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}><path d="m6 6 12 12M6 18 18 6" /></svg>; }
export function FilterIcon(props: Props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}><path d="M4 7h16M4 17h16M8 4v6m8 4v6" /></svg>; }
export function SearchIcon(props: Props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5" /></svg>; }
