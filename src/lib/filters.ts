import type { InventoryFilters } from "./types";

export const sortOptions = [{ value: "selected", label: "Selected order" }, { value: "price-asc", label: "Price, low to high" }, { value: "price-desc", label: "Price, high to low" }, { value: "year-desc", label: "Newest year" }, { value: "mileage-asc", label: "Lowest mileage" }, { value: "name-asc", label: "Make, A–Z" }];
export const emptyFilters: InventoryFilters = { q: "", make: "", body: "", fuel: "", year: "", maxPrice: "", sort: "selected" };
export type SearchParams = Record<string, string | string[] | undefined>;
export function readFilters(params: SearchParams): InventoryFilters {
  const one = (key: string) => typeof params[key] === "string" ? (params[key] as string).slice(0, 100) : "";
  const max = Number(one("maxPrice"));
  return { q: one("q"), make: one("make"), body: one("body"), fuel: one("fuel"), year: one("year"), maxPrice: Number.isSafeInteger(max) && max > 0 && max <= 1000000000 ? String(max) : "", sort: sortOptions.some(s => s.value === one("sort")) ? one("sort") : "selected" };
}

export function inventoryUrl(filters: InventoryFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value && !(key === "sort" && value === "selected")) params.set(key, value);
  return `/inventory${params.size ? `?${params}` : ""}`;
}
