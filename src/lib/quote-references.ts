import type { ValuationAnchor, ValuationInput } from "./valuation";

/** Advertised listing snapshots, checked 5 Nov 2026. Asking prices are not sold prices. */
export const quoteReferences: ValuationAnchor[] = [
  { make: "Toyota", model: "Fortuner", variant: "4X2 Diesel AT", year: 2023, mileage: 60500, price: 3350000, fuel: "Diesel", transmission: "Automatic", source: { name: "CarDekho", url: "https://www.cardekho.com/used-toyota-fortuner+cars+in+ahmedabad", checkedAt: "2026-11-05", location: "Nirnaynagar, Ahmedabad" } },
  { make: "Mercedes-Benz", model: "C-Class", variant: "C 200 BSVI", year: 2022, mileage: 21700, price: 3975000, fuel: "Petrol", transmission: "Automatic", source: { name: "CarDekho", url: "https://www.cardekho.com/used-mercedes-benz-c-class+cars+in+ahmedabad", checkedAt: "2026-11-05", location: "Navrangpura, Ahmedabad" } },
  { make: "Mahindra", model: "XUV700", variant: "AX7 7Str AT", year: 2023, mileage: 52000, price: 1728000, fuel: "Petrol", transmission: "Automatic", source: { name: "CarDekho", url: "https://www.cardekho.com/used-mahindra-xuv700+cars+in+delhi-ncr", checkedAt: "2026-11-05", location: "Saraswati Vihar, New Delhi" } },
];
export type QuoteExample = { label: string; input: ValuationInput };
export const quoteExamples: QuoteExample[] = quoteReferences.map(reference => ({
  label: `${reference.model} · ${reference.year}`,
  input: { make: reference.make, model: reference.model, variant: reference.variant ?? "", year: String(reference.year), mileage: String(reference.mileage), fuel: reference.fuel ?? "", transmission: reference.transmission ?? "", owners: "1", condition: "good", accident: "none", service: "full", originalPrice: "" },
}));
