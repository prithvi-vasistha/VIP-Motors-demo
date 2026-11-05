import type { VehiclePrice } from "./types";

export function formatQuote(amount: number, currency = "INR") {
  if (currency === "INR" && amount >= 100000) {
    const crore = amount >= 10000000;
    const value = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount / (crore ? 10000000 : 100000));
    return `₹${value} ${crore ? "crore" : "lakh"}`;
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function priceLabel(price: VehiclePrice) {
  if (price.kind === "unknown") return "Price not supplied";
  if (price.kind === "on-request") return "Price on request";
  return formatQuote(price.amount, price.currency);
}

export const budgetOptions = [2500000, 5000000, 7500000, 10000000, 15000000, 20000000, 50000000];
