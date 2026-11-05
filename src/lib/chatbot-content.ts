import type { ConciergeVehicle } from "./types";
import { formatQuote } from "./pricing";

export type QuickAnswer = { id: string; question: string; answer: string; note?: string; links: { label: string; href: string }[] };
export const quickAnswers: QuickAnswer[] = [
  { id: "budget-50-lakh", question: "My budget is ₹50 lakh. What can I buy?", answer: "Explore the collection within your budget.", links: [] },
  { id: "explore-suvs", question: "Which SUVs can I explore?", answer: "Here are a few SUVs from the collection.", links: [] },
  { id: "arrange-viewing", question: "How can I arrange a viewing?", answer: "Open a vehicle and choose “Enquire about this vehicle”. Add your preferred day and time, then prepare and copy your enquiry. If you’re still deciding, prepare a general enquiry.", note: "Copy your enquiry and share it with VIP Motors to confirm a viewing.", links: [{ label: "Prepare an enquiry", href: "/contact" }] },
];
export const suggestionLabels: Record<string, string> = { "budget-50-lakh": "Cars under ₹50 lakh?", "explore-suvs": "Explore SUVs", "arrange-viewing": "Arrange a viewing" };
const normalize = (value: string) => value.trim().toLocaleLowerCase("en").replace(/[?!.]/g, "").replace(/\s+/g, " ");

/** Handles explicit rupee/lakh/crore budgets; never guesses a unit for a bare number. */
export function parseBudget(message: string): number | undefined {
  if (/-\s*\d/.test(message)) return;
  const units = message.match(/(\d[\d,]*(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|lakes|l|k)\b/i);
  const rupees = message.match(/(?:₹|\brs\.?\s*|\binr\s*)(\d[\d,]*(?:\.\d+)?)/i);
  const raw = units ?? rupees;
  if (!raw) return;
  let value = Number(raw[1].replace(/,/g, ""));
  if (units) value *= /^(cr|crore)/i.test(units[2]) ? 10000000 : /^k$/i.test(units[2]) ? 1000 : 100000;
  value = Math.round(value);
  return Number.isSafeInteger(value) && value > 0 && value <= 1000000000 ? value : undefined;
}

export function matchQuestion(message: string): { topicId?: string; maxPrice?: number } {
  const budget = parseBudget(message);
  if (budget !== undefined) return { topicId: "budget-50-lakh", maxPrice: budget };
  const topic = quickAnswers.find(item => [item.question, suggestionLabels[item.id]].some(text => normalize(text) === normalize(message)));
  if (topic) return { topicId: topic.id, maxPrice: topic.id === "budget-50-lakh" ? 5000000 : undefined };
  if (/^(show|find|explore)( me)?( some| the)? suvs[?!.]?$/i.test(message.trim())) return { topicId: "explore-suvs" };
  if (/(book|arrange|schedule).*(viewing|visit|test.?drive)/i.test(message)) return { topicId: "arrange-viewing" };
  return {};
}

export function conciergeReply(topicId: string | undefined, maxPrice: number | undefined, vehicles: ConciergeVehicle[]) {
  if (topicId === "budget-50-lakh") {
    const budget = maxPrice ?? 5000000;
    const matches = vehicles.filter(car => car.currency === "INR" && car.price <= budget).sort((a, b) => b.price - a.price);
    return {
      text: matches.length ? `${matches.length} vehicles are within ${formatQuote(budget)}. Here are a few to start with.` : `There are no vehicles within ${formatQuote(budget)}. Try a higher budget or explore the collection.`,
      results: matches.slice(0, 3),
      note: "Prices are indicative. Confirm current availability and the final price with VIP Motors.",
      links: [{ label: matches.length ? `View all ${matches.length} within budget` : "Explore the collection", href: matches.length ? `/inventory?maxPrice=${budget}` : "/inventory" }],
    };
  }
  if (topicId === "explore-suvs") {
    return { text: "Explore these SUVs from the collection.", results: vehicles.filter(car => car.body === "SUV").slice(0, 3), note: "Confirm current availability and arrange a closer look with VIP Motors.", links: [{ label: "Explore all SUVs", href: "/inventory?body=SUV" }] };
  }
  const topic = quickAnswers.find(item => item.id === topicId);
  return { text: topic?.answer ?? "Unable to connect to the server. Please try again later.", results: [] as ConciergeVehicle[], note: topic?.note, links: topic?.links ?? [] };
}
