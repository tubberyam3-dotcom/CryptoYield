import assert from "node:assert/strict";
import { test } from "node:test";
import { portfolioPurchaseQuote, portfolioReturns, formatReturnPercent } from "../shared/portfolioCalculations";
import type { Portfolio } from "../shared/schema";

const portfolio = {
  isActive: true, unitPrice: "100", minInvestment: "250",
  maxUnitsPerUser: 1000, totalUnitsAvailable: 2000, unitsSold: 0,
  interestRate: "0.01", dailyInterestRate: "0", interestPeriod: "daily",
  meterReduction: "0", termDuration: 30,
} as Portfolio;

test("user and admin amount quotes correctly parse formatted amounts and whole units", () => {
  assert.deepEqual(portfolioPurchaseQuote(portfolio, "22,500"), { amount: 22500, units: 225 });
  assert.deepEqual(portfolioPurchaseQuote(portfolio, "22,500.00"), portfolioPurchaseQuote(portfolio, "22500"));
  assert.deepEqual(portfolioPurchaseQuote(portfolio, "350"), { amount: 300, units: 3 });
  assert.deepEqual(portfolioPurchaseQuote(portfolio, undefined, 3), { amount: 300, units: 3 });
  assert.throws(() => portfolioPurchaseQuote(portfolio, "250"), /Minimum purchase is \$300/);
});

test("purchases reject malformed, negative, nonfinite and empty input", () => {
  for (const value of ["", "NaN", "Infinity", "-100", "0", "1,2", "300abc", null]) {
    assert.throws(() => portfolioPurchaseQuote(portfolio, value));
  }
  for (const units of [0, -1, 1.5, NaN]) assert.throws(() => portfolioPurchaseQuote(portfolio, "300", units));
  assert.throws(() => portfolioPurchaseQuote({ ...portfolio, isActive: false }, "300"), /not available/);
  assert.throws(() => portfolioPurchaseQuote({ ...portfolio, totalUnitsAvailable: 0 }, "300"), /Only 0/);
  assert.throws(() => portfolioPurchaseQuote({ ...portfolio, maxUnitsPerUser: 0 }, "300"), /Maximum 0/);
});

test("interest figures use configured period, meter reduction and simple annualization", () => {
  for (const [period, days] of [["hourly", 1 / 24], ["daily", 1], ["weekly", 7], ["monthly", 30]] as const) {
    const result = portfolioReturns({ ...portfolio, interestPeriod: period, meterReduction: "25" });
    assert.ok(Math.abs(result.dailyRate - 0.0075 / days) < 1e-12);
    assert.ok(Math.abs(result.annualPercent - 0.0075 / days * 36500) < 1e-9);
    assert.equal(result.durationDays, days * 30);
  }
  assert.equal(portfolioReturns(portfolio).annualPercent, 365);
  assert.equal(portfolioReturns({ ...portfolio, interestRate: "0", dailyInterestRate: "0.02" }).annualPercent, 0);
  assert.equal(portfolioReturns({ ...portfolio, interestRate: null, dailyInterestRate: "0.01" }).annualPercent, 365);
  assert.equal(formatReturnPercent(0.0001), "0.0001");
});
