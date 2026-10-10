import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";

test("credits preserve other balance changes and adjustments cannot lose their ledger record", {
  skip: process.env.RUN_ACCOUNT_FUNDS_DB_TEST !== "1",
}, async t => {
  const { db, pool } = await import("./db");
  const { DatabaseStorage } = await import("./storage");
  const { users, deposits, coupons } = await import("../shared/schema");
  const { eq } = await import("drizzle-orm");
  const storage = new DatabaseStorage();
  const rollback = new Error("ROLLBACK_BALANCE_INTEGRITY_FIXTURES");
  try {
    await assert.rejects(db.transaction(async tx => {
      const id = randomUUID();
      await tx.insert(users).values({ id, balance: "100", xpBalance: 100 });
      t.mock.method(db, "transaction", async callback => tx.transaction(callback));
      t.mock.method(db, "update", table => tx.update(table));
      const balance = async () => (await tx.select({ value: users.balance }).from(users).where(eq(users.id, id)))[0].value;
      const ledger = async () => tx.select().from(deposits).where(eq(deposits.userId, id));

      // Even if another operation has already changed the balance, credit the
      // current value rather than a previously read balance of 100.
      assert.equal((await storage.creditUserBalance(id, "50")).balance, "150.00000000");
      assert.equal((await storage.creditUserBalance(id, "25")).balance, "175.00000000");
      await Promise.all(Array.from({ length: 10 }, () => storage.creditUserBalance(id, "0.00000001")));
      assert.equal(await balance(), "175.00000010");
      await assert.rejects(storage.creditUserBalance(id, "-25"), /Invalid credit amount/);
      await assert.rejects(storage.creditUserBalance(id, "NaN"), /Invalid credit amount/);

      const date = new Date("2026-01-10T12:00:00Z");
      const credited = await storage.adjustUserBalance(id, "10.00000000", "add", { type: "add" }, "test-credit", date);
      assert.equal(credited.balance, "185.00000010");
      const debited = await storage.adjustUserBalance(id, "20.00000000", "withdraw", { type: "withdraw" }, "test-debit");
      assert.equal(debited.balance, "165.00000010");
      const records = await ledger();
      assert.equal(records.length, 2);
      assert.equal(records.find(row => row.transactionId === "test-credit")?.amount, "10.00000000");
      assert.equal(records.find(row => row.transactionId === "test-credit")?.createdAt?.toISOString(), date.toISOString());
      assert.equal(records.find(row => row.transactionId === "test-debit")?.amount, "-20.00000000");

      await assert.rejects(storage.adjustUserBalance(id, "200.00000000", "withdraw", {}, "test-insufficient"), /Insufficient balance/);
      assert.equal(await balance(), "165.00000010");
      assert.equal((await ledger()).length, 2);

      // JSON serialization failure simulates a ledger-write failure after the
      // balance UPDATE. Both must roll back together.
      await assert.rejects(storage.adjustUserBalance(id, "25.00000000", "add", { invalid: BigInt(1) }, "test-failed-record"));
      assert.equal(await balance(), "165.00000010");
      assert.equal((await ledger()).length, 2);
      await assert.rejects(storage.adjustUserBalance(id, "5.00000000", "add", {}, "test-invalid-date", new Date("invalid")), /Invalid adjustment/);
      assert.equal(await balance(), "165.00000010");

      t.mock.method(storage, "getSetting", async () => undefined);
      const conversion = await storage.convertXpToCash(id, 100);
      assert.equal(conversion.newBalance, "166.00000010");
      assert.equal(conversion.newXpBalance, 0);
      await assert.rejects(storage.convertXpToCash(id, 100), /Insufficient XP balance/);
      await assert.rejects(storage.convertXpToCash(id, -100), /Invalid XP conversion/);
      assert.equal(await balance(), "166.00000010");

      const couponCode = randomUUID().toUpperCase();
      await tx.insert(coupons).values({ code: couponCode, rewardAmount: "30" });
      assert.equal((await storage.redeemCoupon(id, couponCode)).newBalance, "196.00000010");
      await assert.rejects(storage.redeemCoupon(id, couponCode), /maximum number of times/);
      assert.equal(await balance(), "196.00000010");
      throw rollback;
    }), error => {
      if (error !== rollback) throw error;
      return true;
    });
  } finally {
    t.mock.restoreAll();
    await pool.end();
  }
});
