import { demoInventory } from "./demo-inventory";
import type { InventoryFilters, Vehicle } from "./types";

// Switch previewMode only after adding approved records and dealer assets.
export const previewMode = true;
export const verifiedInventory: Vehicle[] = [];
export const inventory = previewMode ? demoInventory : verifiedInventory;
export const filterOptions = {
  make: [...new Set(inventory.map(v => v.make))].sort(),
  body: [...new Set(inventory.map(v => v.body))].sort(),
  fuel: [...new Set(inventory.flatMap(v => v.fuel ? [v.fuel] : []))].sort(),
  year: [...new Set(inventory.flatMap(v => v.year ? [String(v.year)] : []))].sort().reverse(),
};
export function filterInventory(filters: InventoryFilters) {
  const query = filters.q.trim().toLocaleLowerCase();
  const result = inventory.filter(v => (!query || `${v.make} ${v.model} ${v.variant}`.toLocaleLowerCase().includes(query)) && (!filters.make || v.make === filters.make) && (!filters.body || v.body === filters.body) && (!filters.fuel || v.fuel === filters.fuel) && (!filters.year || String(v.year) === filters.year) && (!filters.maxPrice || (v.price.kind === "numeric" && v.price.currency === "INR" && v.price.amount <= Number(filters.maxPrice))));
  if (filters.sort === "price-asc") result.sort((a, b) => (a.price.kind === "numeric" ? a.price.amount : Infinity) - (b.price.kind === "numeric" ? b.price.amount : Infinity));
  if (filters.sort === "price-desc") result.sort((a, b) => (b.price.kind === "numeric" ? b.price.amount : 0) - (a.price.kind === "numeric" ? a.price.amount : 0));
  if (filters.sort === "year-desc") result.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  if (filters.sort === "mileage-asc") result.sort((a, b) => (a.mileage ?? Infinity) - (b.mileage ?? Infinity));
  if (filters.sort === "name-asc") result.sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`));
  return result;
}
export { priceLabel } from "./pricing";
export const number = (value: number) => new Intl.NumberFormat("en").format(value);

export { readFilters, inventoryUrl, emptyFilters, sortOptions } from "./filters";
export type { SearchParams } from "./filters";
