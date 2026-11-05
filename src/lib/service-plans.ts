import type { FinanceCar } from "./finance";
export const insurancePreferences = [
  { id: "comprehensive", name: "Comprehensive cover", description: "Discuss own-damage protection for your car alongside third-party liability cover." },
  { id: "third-party", name: "Third-party cover", description: "Discuss cover for liability towards other people and their property." },
  { id: "renewal", name: "Review my existing cover", description: "Review a renewal, an ownership transfer or an existing policy with the team." },
] as const;
export type InsurancePreference = typeof insurancePreferences[number]["id"];
export function insuranceEnquiry(car: FinanceCar | undefined, preference: InsurancePreference, zeroDep: boolean) {
  const choice = insurancePreferences.find(p => p.id === preference) ?? insurancePreferences[0];
  return `I’d like an insurance quote for ${car?.name ?? "my car"}${car?.year ? ` (${car.year})` : ""}.\nVehicle reference: ${car?.slug ?? "To be confirmed"}\nCover preference: ${choice.name}\nZero-depreciation add-on: ${zeroDep ? "Please check availability and price" : "Not requested"}\n\nPlease confirm the insured declared value, premium, deductible, exclusions and available add-ons.`;
}
export function warrantyEnquiry(car: FinanceCar | undefined, months: 12 | 24, annualKm: number) {
  return `I’d like to discuss extended warranty for ${car?.name ?? "my car"}${car?.year ? ` (${car.year})` : ""}.\nVehicle reference: ${car?.slug ?? "To be confirmed"}${car?.mileage !== undefined ? `\nCurrent mileage: ${new Intl.NumberFormat("en-IN").format(car.mileage)} km` : ""}\nPreferred cover period: ${months} months\nExpected annual driving: ${new Intl.NumberFormat("en-IN").format(annualKm)} km\n\nPlease confirm eligibility, inspection requirements, covered components, claim limits, exclusions and price.`;
}
