export type FinanceCar = { slug: string; name: string; price: number; year?: number; mileage?: number };
export type FinanceDraft = { vehicle: string; price: string; deposit: string; rate: string; months: string };
export type FinanceErrors = Partial<Record<keyof FinanceDraft, string>>;
export const financeTerms = [12, 24, 36, 48, 60, 72, 84];
export const financeBenchmark = {
  rate: 12.9,
  source: "https://www.icici.bank.in/personal-banking/loans/car-loan/service-charges",
  label: "ICICI Bank’s published used-car loan data, quarter ended June 2026",
  checked: "5 November 2026",
};
export const rupees = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

export function defaultFinance(cars: FinanceCar[], params: Record<string, string | string[] | undefined> = {}): FinanceDraft {
  const car = cars.find(car => car.slug === params.vehicle) ?? cars.find(car => car.slug === "mercedes-c220d-2023") ?? cars[0];
  const price = car?.price ?? 4500000;
  const one = (key: string, fallback: string) => {
    if (typeof params[key] !== "string") return fallback;
    const value = params[key].slice(0, 30).trim();
    return /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) && Number.isFinite(Number(value)) ? value : "";
  };
  const candidate = { vehicle: car?.slug ?? "", price: one("price", String(price)), deposit: one("deposit", String(Math.round(price * .2))), rate: one("rate", String(financeBenchmark.rate)), months: one("months", "60") };
  return candidate;
}

export function validateFinance(draft: FinanceDraft): FinanceErrors {
  const errors: FinanceErrors = {};
  const price = Number(draft.price), deposit = Number(draft.deposit), rate = Number(draft.rate), months = Number(draft.months);
  if (!draft.price.trim() || !Number.isFinite(price) || price < 100000 || price > 100000000 || !Number.isInteger(price)) errors.price = "Enter a vehicle price from ₹1 lakh to ₹10 crore, in whole rupees.";
  if (!draft.deposit.trim() || !Number.isFinite(deposit) || deposit < 0 || deposit > price || !Number.isInteger(deposit)) errors.deposit = "Enter a down payment between ₹0 and the vehicle price.";
  if (!draft.rate.trim() || !Number.isFinite(rate) || rate < 0 || rate > 30) errors.rate = "Enter an annual rate between 0% and 30%.";
  if (!financeTerms.includes(months)) errors.months = "Choose a term from 1 to 7 years.";
  return errors;
}

export function calculateFinance(draft: FinanceDraft) {
  if (Object.keys(validateFinance(draft)).length) return null;
  const price = Number(draft.price), deposit = Number(draft.deposit), rate = Number(draft.rate), months = Number(draft.months);
  const principal = price - deposit, monthlyRate = rate / 1200;
  const emi = principal === 0 ? 0 : monthlyRate === 0 ? principal / months : principal * monthlyRate / -Math.expm1(-months * Math.log1p(monthlyRate));
  const totalRepayment = monthlyRate === 0 ? principal : emi * months;
  const totalInterest = monthlyRate === 0 ? 0 : Math.max(0, totalRepayment - principal);
  const schedule: { year: number; principal: number; interest: number; balance: number }[] = [];
  let balance = principal;
  for (let month = 1; month <= months; month++) {
    const interest = balance * monthlyRate;
    const paidPrincipal = Math.min(balance, Math.max(0, emi - interest));
    balance = Math.max(0, balance - paidPrincipal);
    if ((month - 1) % 12 === 0) schedule.push({ year: Math.ceil(month / 12), principal: 0, interest: 0, balance });
    const row = schedule[schedule.length - 1];
    row.principal += paidPrincipal; row.interest += interest; row.balance = balance < .01 ? 0 : balance;
  }
  return { price, deposit, rate, months, principal, emi, totalInterest, totalRepayment, totalCost: deposit + totalRepayment, schedule };
}

export function financeUrl(draft: FinanceDraft) {
  const params = new URLSearchParams(draft);
  return `/finance?${params}`;
}

export function financeEnquiry(draft: FinanceDraft, cars: FinanceCar[]) {
  const result = calculateFinance(draft);
  if (!result) return "";
  const car = cars.find(car => car.slug === draft.vehicle);
  return `I’d like to discuss finance for ${car?.name ?? "a car"}${car?.year ? ` (${car.year})` : ""}.\nVehicle reference: ${car?.slug ?? "To be confirmed"}\nVehicle price: ${rupees(result.price)}\nDown payment: ${rupees(result.deposit)}\nLoan amount: ${rupees(result.principal)}\nTerm: ${result.months} months\nAnnual interest assumption: ${result.rate}%\nEstimated monthly EMI: ${rupees(result.emi)}\nEstimated total interest: ${rupees(result.totalInterest)}\n\nPlease confirm available rates, eligibility and all charges.`;
}
