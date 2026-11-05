/** Local demonstration model. Catalogue asking prices are illustrative, not market data. */
export type ValuationAnchor = { make: string; model: string; variant?: string; year: number; price: number; fuel?: string; transmission?: string; mileage?: number; source?: { name: string; url: string; checkedAt: string; location: string } };
export type ValuationInput = { make: string; model: string; variant: string; year: string; mileage: string; fuel: string; transmission: string; owners: string; condition: string; accident: string; service: string; originalPrice: string };
export type ValuationErrors = Partial<Record<keyof ValuationInput, string>>;
export const valuationOptions = {
  fuel: ["Petrol", "Diesel", "Hybrid", "Electric", "CNG"],
  transmission: ["Automatic", "Manual"],
  condition: [{ value: "excellent", label: "Excellent · very little wear" }, { value: "good", label: "Good · normal wear" }, { value: "fair", label: "Fair · some work needed" }],
  accident: [{ value: "none", label: "No accident history" }, { value: "minor", label: "Minor repairs / cosmetic damage" }, { value: "major", label: "Major accident / structural repairs" }],
  service: [{ value: "full", label: "Complete service records" }, { value: "partial", label: "Partial service records" }, { value: "none", label: "No service records" }],
};
export const blankValuation: ValuationInput = { make: "", model: "", variant: "", year: "", mileage: "", fuel: "", transmission: "", owners: "", condition: "", accident: "", service: "", originalPrice: "" };
export function valuationFromParams(params: Record<string, string | string[] | undefined>): ValuationInput {
  return Object.fromEntries(Object.keys(blankValuation).map(key => [key, typeof params[key] === "string" ? params[key].slice(0, 100) : ""])) as ValuationInput;
}
export function valuationParams(input: ValuationInput) {
  return new URLSearchParams(Object.entries(input).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()])).toString();
}
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizedMake = (value: string) => normalize(value) === "mercedes" ? "mercedesbenz" : normalize(value);
export function findAnchor(input: ValuationInput, anchors: ValuationAnchor[]) {
  return anchors.filter(item => normalizedMake(item.make) === normalizedMake(input.make) && normalize(item.model) === normalize(input.model)).sort((a, b) => {
    const variantA = input.variant && normalize(a.variant ?? "") === normalize(input.variant) ? 0 : 1;
    const variantB = input.variant && normalize(b.variant ?? "") === normalize(input.variant) ? 0 : 1;
    const powertrainA = (a.fuel === input.fuel ? 0 : 1) + (a.transmission === input.transmission ? 0 : 1);
    const powertrainB = (b.fuel === input.fuel ? 0 : 1) + (b.transmission === input.transmission ? 0 : 1);
    return variantA - variantB || Math.abs(a.year - Number(input.year)) - Math.abs(b.year - Number(input.year)) || powertrainA - powertrainB || Number(!!b.source) - Number(!!a.source);
  })[0];
}
export function validateValuation(input: ValuationInput, anchors: ValuationAnchor[], currentYear: number): ValuationErrors {
  const errors: ValuationErrors = {};
  if (input.make.trim().length < 2) errors.make = "Choose or enter your car’s make.";
  if (input.model.trim().length < 1) errors.model = "Choose or enter your car’s model.";
  if (!/^\d{4}$/.test(input.year) || Number(input.year) < 1990 || Number(input.year) > currentYear) errors.year = `Enter a year from 1990 to ${currentYear}.`;
  if (!/^\d+$/.test(input.mileage) || Number(input.mileage) > 1000000) errors.mileage = "Enter kilometres from 0 to 1,000,000.";
  for (const key of ["fuel", "transmission"] as const) if (!valuationOptions[key].includes(input[key])) errors[key] = `Choose the ${key === "fuel" ? "fuel type" : "transmission"}.`;
  if (!/^[1-5]$/.test(input.owners)) errors.owners = "Choose the number of owners, including you.";
  for (const key of ["condition", "accident", "service"] as const) if (!valuationOptions[key].some(option => option.value === input[key])) errors[key] = "Choose an option to complete the estimate.";
  if (input.originalPrice && (!/^\d+$/.test(input.originalPrice) || Number(input.originalPrice) < 100000 || Number(input.originalPrice) > 1000000000)) errors.originalPrice = "Enter an original price between ₹1 lakh and ₹100 crore, in rupees.";
  if (!findAnchor(input, anchors) && !input.originalPrice) errors.originalPrice = "This model isn’t in the saved references. Add its original on-road price so we can estimate a range.";
  return errors;
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export function estimateValuation(input: ValuationInput, anchors: ValuationAnchor[], currentYear: number) {
  if (Object.keys(validateValuation(input, anchors, currentYear)).length) return null;
  const anchor = findAnchor(input, anchors);
  const age = currentYear - Number(input.year);
  const mileage = Number(input.mileage);
  const original = Number(input.originalPrice);
  // A reference listing is adjusted 12% per model year. A user-supplied original
  // price uses 15% first-year depreciation and 12% for subsequent years.
  let base = anchor ? anchor.price * Math.pow(1.12, Number(input.year) - anchor.year) : original * (age === 0 ? 0.9 : 0.85 * Math.pow(0.88, age - 1));
  if (original) base = Math.min(base, original * 0.95);
  // Move the snapshot mileage with model-year differences before comparing it.
  const baselineMileage = anchor?.mileage === undefined ? age * 10000 : Math.max(0, anchor.mileage + (anchor.year - Number(input.year)) * 10000);
  const mileageFactor = clamp(1 - (mileage - baselineMileage) / 250000, 0.68, 1.06);
  const ownerFactor = Math.pow(0.96, Number(input.owners) - 1);
  const conditionFactor = { excellent: 1.04, good: 1, fair: 0.88 }[input.condition as "excellent" | "good" | "fair"];
  const accidentFactor = { none: 1, minor: 0.94, major: 0.78 }[input.accident as "none" | "minor" | "major"];
  const serviceFactor = { full: 1, partial: 0.96, none: 0.9 }[input.service as "full" | "partial" | "none"];
  // A broader band is used when powertrain differs from the available reference.
  // We do not invent a market premium for a particular fuel or gearbox.
  const powertrainDiffers = !!anchor && ((anchor.fuel && anchor.fuel.toLowerCase() !== input.fuel.toLowerCase()) || (anchor.transmission && anchor.transmission.toLowerCase() !== input.transmission.toLowerCase()));
  const midpoint = Math.max(50000, base * 0.86 * mileageFactor * ownerFactor * conditionFactor * accidentFactor * serviceFactor);
  const spread = anchor?.source ? (powertrainDiffers ? 0.10 : 0.04) : anchor ? (powertrainDiffers ? 0.12 : 0.08) : 0.16;
  const low = Math.max(40000, Math.round(midpoint * (1 - spread) / 10000) * 10000);
  const high = Math.max(low + 10000, Math.round(midpoint * (1 + spread) / 10000) * 10000);
  const estimate = Math.min(high, Math.max(low, Math.round(midpoint / 10000) * 10000));
  return { low, high, estimate, anchor, age, mileageFactor, powertrainDiffers, basis: anchor ? `${anchor.year} ${anchor.make} ${anchor.model}${anchor.variant ? ` ${anchor.variant}` : ""} ${anchor.source ? `${anchor.source.name} advertised-price snapshot (${anchor.source.checkedAt})` : "catalogue reference"}` : "Your supplied original on-road price" };
}
export function valuationEnquiry(input: ValuationInput, result: NonNullable<ReturnType<typeof estimateValuation>>, format: (price: number) => string) {
  const label = (key: "condition" | "accident" | "service") => valuationOptions[key].find(option => option.value === input[key])?.label;
  return `VIP Motors — indicative quote\n\nCar: ${input.make} ${input.model}${input.variant ? ` ${input.variant}` : ""}\nYear: ${input.year}\nMileage: ${Number(input.mileage).toLocaleString("en-IN")} km\nFuel: ${input.fuel}\nTransmission: ${input.transmission}\nOwners: ${input.owners}\nCondition: ${label("condition")}\nAccident history: ${label("accident")}\nService history: ${label("service")}${input.originalPrice ? `\nOriginal on-road price: ${format(Number(input.originalPrice))}` : ""}\nIndicative quote: ${format(result.estimate)}\nEstimated range: ${format(result.low)} – ${format(result.high)}\nBasis: ${result.basis}\n\nIndicative valuation. A final offer is subject to vehicle inspection and confirmation.`;
}
