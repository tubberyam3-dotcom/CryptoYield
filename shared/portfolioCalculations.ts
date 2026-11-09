import type { Portfolio } from "./schema";

type InterestConfig = Pick<Portfolio, "interestRate" | "dailyInterestRate" | "interestPeriod" | "meterReduction" | "termDuration">;
const periodDays: Record<string, number> = { hourly: 1 / 24, daily: 1, weekly: 7, monthly: 30 };

export function portfolioReturns(portfolio: InterestConfig) {
  // Zero is an intentional configured rate; only missing values use the legacy field.
  const rate = Number(portfolio.interestRate ?? portfolio.dailyInterestRate ?? 0);
  const days = periodDays[portfolio.interestPeriod || "daily"] ?? 1;
  const reduction = Math.min(100, Math.max(0, Number(portfolio.meterReduction ?? 0)));
  const effectiveRate = rate * (1 - reduction / 100);
  const dailyRate = effectiveRate / days;
  const durationDays = days * (portfolio.termDuration ?? 30);
  return { effectiveRate, dailyRate, annualPercent: dailyRate * 365 * 100, durationDays };
}

export function formatReturnPercent(percent: number) {
  return percent.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

// Admin forms use percentage points; the API and accrual engine retain fractions.
export function portfolioPercentToRate(percentInput: string): string {
  const percent = Number(percentInput);
  if (!percentInput.trim() || !Number.isFinite(percent) || percent < 0 || percent > 9999.9999) {
    throw new Error("Enter an interest percentage between 0 and 9999.9999.");
  }
  if (Math.abs(percent * 10000 - Math.round(percent * 10000)) > 1e-6) {
    throw new Error("Use no more than four decimal places for the interest percentage.");
  }
  return String(Number((percent / 100).toFixed(6)));
}

export function portfolioRateToPercent(rate: string): string {
  return String(Number((Number(rate) * 100).toFixed(4)));
}

export class PortfolioPurchaseError extends Error {}

export function parseInvestmentAmount(value: unknown): number {
  const text = String(value ?? "").trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,8})?$/.test(text)) {
    throw new PortfolioPurchaseError("Enter a valid investment amount.");
  }
  const amount = Number(text.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) throw new PortfolioPurchaseError("Investment amount must be greater than zero.");
  return amount;
}

export function portfolioPurchaseQuote(portfolio: Portfolio, amountInput: unknown, unitsInput?: unknown) {
  if (!portfolio.isActive) throw new PortfolioPurchaseError("This portfolio is not available for investment.");
  const unitPrice = Number(portfolio.unitPrice ?? 100);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new PortfolioPurchaseError("This portfolio has an invalid unit price.");
  const requestedAmount = unitsInput == null ? parseInvestmentAmount(amountInput) : null;
  const units = unitsInput == null ? Math.floor(requestedAmount! / unitPrice + 1e-10) : Number(unitsInput);
  if (!Number.isSafeInteger(units) || units <= 0) {
    throw new PortfolioPurchaseError(`Purchase at least one unit at $${unitPrice.toLocaleString("en-US")}.`);
  }
  const amount = Number((units * unitPrice).toFixed(8));
  if (amount < Number(portfolio.minInvestment)) {
    const minimum = Math.ceil(Number(portfolio.minInvestment) / unitPrice) * unitPrice;
    throw new PortfolioPurchaseError(`Minimum purchase is $${minimum.toLocaleString("en-US")} in whole units.`);
  }
  if (units > (portfolio.maxUnitsPerUser ?? 100)) throw new PortfolioPurchaseError(`Maximum ${portfolio.maxUnitsPerUser ?? 100} units allowed per account.`);
  const remaining = (portfolio.totalUnitsAvailable ?? 1000) - (portfolio.unitsSold ?? 0);
  if (units > remaining) throw new PortfolioPurchaseError(`Only ${remaining} units available for this portfolio.`);
  return { units, amount };
}
