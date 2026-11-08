import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { portfolioPurchaseQuote } from "../shared/portfolioCalculations";

test("portfolio purchases atomically debit personal/shared funds and reserve units", {
  skip: process.env.RUN_ACCOUNT_FUNDS_DB_TEST !== "1",
}, async t => {
  const { db, pool } = await import("./db");
  const { DatabaseStorage } = await import("./storage");
  const { users, portfolios, userPortfolios, jointAccounts, userJointAccounts } = await import("../shared/schema");
  const { eq, inArray } = await import("drizzle-orm");
  const storage = new DatabaseStorage();
  const rollback = new Error("ROLLBACK_PORTFOLIO_FIXTURES");
  try {
    await assert.rejects(db.transaction(async tx => {
      t.mock.method(db, "transaction", async callback => tx.transaction(callback));
      const ids = [randomUUID(), randomUUID(), randomUUID()];
      await tx.insert(users).values(ids.map(id => ({ id, balance: "1000" })));
      const [joint] = await tx.insert(jointAccounts).values({ name: "Temporary purchase test", createdBy: ids[1] }).returning();
      await tx.insert(userJointAccounts).values([
        { userId: ids[1], jointAccountId: joint.id, role: "primary" },
        { userId: ids[2], jointAccountId: joint.id, role: "partner" },
      ]);
      const [product] = await tx.insert(portfolios).values({
        name: "Temporary portfolio", assets: [], minInvestment: "100", riskLevel: "low",
        unitPrice: "100", maxUnitsPerUser: 15, totalUnitsAvailable: 30, interestRate: "0.01",
      }).returning();
      const data = (amount: string, status: "pending" | "approved") => {
        const quote = portfolioPurchaseQuote(product, amount);
        return { portfolioId: product.id, investedAmount: String(quote.amount),
          currentValue: String(quote.amount), unitsPurchased: String(quote.units), status };
      };
      await assert.rejects(storage.createUserPortfolio({ ...data("100", "pending"), currentValue: "invalid" }, ids[0]));
      assert.equal(Number((await tx.select().from(users).where(eq(users.id, ids[0])))[0].balance), 1000);
      assert.equal((await tx.select().from(portfolios).where(eq(portfolios.id, product.id)))[0].unitsSold, 0);
      const personal = await storage.createUserPortfolio(data("1,000", "pending"), ids[0]);
      assert.equal(personal.userId, ids[0]);
      const shared = await storage.createUserPortfolio(data("1,500", "approved"), ids[1]);
      assert.equal(shared.jointAccountId, joint.id);
      assert.equal(shared.userId, null);
      const balances = await tx.select().from(users).where(inArray(users.id, ids));
      assert.equal(Number(balances.find(u => u.id === ids[0])!.balance), 0);
      assert.equal(balances.filter(u => u.id !== ids[0]).reduce((sum, u) => sum + Number(u.balance), 0), 500);
      assert.equal((await tx.select().from(portfolios).where(eq(portfolios.id, product.id)))[0].unitsSold, 25);
      await assert.rejects(storage.createUserPortfolio(data("100", "pending"), ids[2]), /Maximum 15/);
      await assert.rejects(storage.createUserPortfolio(data("600", "pending"), ids[0]), /Only 5/);
      await assert.rejects(storage.createUserPortfolio(data("100", "pending"), ids[0]), /Insufficient balance/);
      assert.equal((await tx.select().from(userPortfolios).where(eq(userPortfolios.portfolioId, product.id))).length, 2);
      assert.equal((await tx.select().from(portfolios).where(eq(portfolios.id, product.id)))[0].unitsSold, 25);
      throw rollback;
    }), error => error === rollback);
  } finally { await pool.end(); }
});
