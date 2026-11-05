"use client";
import Link from "next/link";
import { ArrowIcon } from "./icons";
import { QueryView } from "./query-view";
export function BackToResults() {
  return <QueryView>{params => { const from = typeof params.from === "string" && /^\/inventory(?:\?[^#]*)?$/.test(params.from) ? params.from : "/inventory"; return <Link href={from} className="back-link"><ArrowIcon className="icon-reversed"/>Back to your results</Link>; }}</QueryView>;
}
