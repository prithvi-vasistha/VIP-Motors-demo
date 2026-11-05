"use client";
import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { SearchParams } from "@/lib/filters";
function QueryReader({ children }: { children: (params: SearchParams) => ReactNode }) {
  const search = useSearchParams();
  const params: SearchParams = {};
  search.forEach((value, key) => { const prior = params[key]; params[key] = prior === undefined ? value : Array.isArray(prior) ? [...prior, value] : [prior, value]; });
  return children(params);
}
/** Static fallback keeps the catalogue visible without a server request. */
export function QueryView({ children }: { children: (params: SearchParams) => ReactNode }) {
  return <Suspense fallback={children({})}><QueryReader>{children}</QueryReader></Suspense>;
}
