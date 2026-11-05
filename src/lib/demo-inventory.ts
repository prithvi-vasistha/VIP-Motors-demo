import type { Vehicle } from "./types";
import catalogue from "./reference-catalogue.json";

// Supplied repository: licensed model photos and illustrative specifications.
// No asking prices, condition claims or availability are imported as verified stock.
export const demoInventory = catalogue as Vehicle[];
