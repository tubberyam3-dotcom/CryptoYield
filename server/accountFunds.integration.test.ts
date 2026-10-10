import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';

test('joint account funding uses transactions and rolls back failed records', {
  skip: process.env.RUN_ACCOUNT_FUNDS_DB_TEST !== '1',
}, async t => {
  const { db, pool } = await import('./db');
  const { DatabaseStorage } = await import('./storage');
  const { issueWithdrawalCode } = await import('./jointWithdrawalCodes');
  const { users, jointAccounts, userJointAccounts, stockProducts, withdrawals, sessions } = await import('../shared/schema');
  const { eq, inArray } = await import('drizzle-orm');
  const storage = new DatabaseStorage();
  const rollback = new Error('ROLLBACK_TEST_FIXTURES');
  try {
    await assert.rejects(db.transaction(async tx => {
      const firstId = randomUUID();
      const secondId = randomUUID();
      const code = randomUUID().replace(/-/g, '').slice(0, 11).toUpperCase();
      await tx.insert(users).values([
        { id: firstId, balance: '100', accountType: 'joint', xpCode: code },
        { id: secondId, balance: '250', accountType: 'joint', xpCode: code.split('').reverse().join('') },
      ]);
      const [joint] = await tx.insert(jointAccounts).values({
        name: 'Temporary joint funds test', createdBy: firstId,
      }).returning();
      await tx.insert(userJointAccounts).values([
        { userId: firstId, jointAccountId: joint.id, role: 'primary' },
        { userId: secondId, jointAccountId: joint.id, role: 'partner' },
      ]);
      const [product] = await tx.insert(stockProducts).values({
        symbol: `TEST-${randomUUID()}`, name: 'Temporary test stock', isActive: false,
      }).returning();

      // Nested storage transactions use savepoints inside the outer rollback.
      t.mock.method(db, 'transaction', async callback => tx.transaction(callback));
      const balance = async () => (await tx.select().from(users).where(inArray(users.id, [firstId, secondId])))
        .reduce((sum, member) => sum + Number(member.balance), 0);

      await assert.rejects(storage.processWithdrawal(firstId, '300', 'crypto', 'test-wallet'), /XP code/);
      await assert.rejects(storage.processWithdrawal(firstId, '300', 'crypto', 'test-wallet', undefined, 'INVALIDCODE'), /XP code/);
      assert.equal(await balance(), 350);
      let authorizationCode = "";
      await issueWithdrawalCode(firstId, joint.id, secondId,
        { amount: "300", withdrawMethod: "crypto", destinationAddress: "test-wallet" },
        async deliveredCode => { authorizationCode = deliveredCode; return { success: true }; });
      await assert.rejects(storage.processWithdrawal(firstId, '300', 'crypto', 'test-wallet', undefined, code), /valid XP code/);
      assert.equal(await balance(), 350);
      const withdrawal = await storage.processWithdrawal(firstId, '300', 'crypto', 'test-wallet', undefined, authorizationCode);
      assert.equal(withdrawal.userId, firstId);
      assert.equal(await balance(), 50);
      await assert.rejects(storage.processWithdrawal(firstId, '300', 'crypto', 'test-wallet', undefined, authorizationCode), /new XP code/);
      await issueWithdrawalCode(secondId, joint.id, firstId,
        { amount: "51", withdrawMethod: "wire_transfer", destinationAddress: "test-bank" },
        async deliveredCode => { authorizationCode = deliveredCode; return { success: true }; });
      await assert.rejects(storage.processWithdrawal(secondId, '51', 'wire_transfer', 'test-bank',
        undefined, authorizationCode), /Insufficient balance/);
      assert.equal(await balance(), 50);
      assert.equal((await tx.select().from(withdrawals).where(eq(withdrawals.userId, firstId))).length, 1);

      const stockData = {
        stockProductId: product.id, quantity: '1', purchasePrice: '10',
        totalInvested: '10', status: 'pending' as const,
      };
      await assert.rejects(storage.createUserStock({ ...stockData, stockProductId: randomUUID() }, secondId));
      assert.equal(await balance(), 50, 'failed investment insertion rolls back its balance debit');
      const investment = await storage.createUserStock(stockData, secondId);
      assert.equal(investment.jointAccountId, joint.id);
      assert.equal(investment.userId, null);
      assert.equal(await balance(), 40);

      // Authorize all methods from either member, without using either login XP.
      const methods = ['crypto', 'wire_transfer', 'merchant_pay'] as const;
      for (const actorId of [firstId, secondId]) {
        const partnerId = actorId === firstId ? secondId : firstId;
        for (const method of methods) {
          const sid = `joint-withdrawal-code:${actorId}`;
          const [prior] = await tx.select().from(sessions).where(eq(sessions.sid, sid));
          if (prior) await tx.update(sessions).set({
            sess: { ...prior.sess as object, sentAt: 0 },
          }).where(eq(sessions.sid, sid));
          const request = { amount: '1', withdrawMethod: method, destinationAddress: `test-${method}` };
          const before = await balance();
          await issueWithdrawalCode(actorId, joint.id, partnerId, request,
            async deliveredCode => { authorizationCode = deliveredCode; return { success: true }; });
          await assert.rejects(issueWithdrawalCode(actorId, joint.id, partnerId, request,
            async () => { throw new Error('Must not send during cooldown'); }), /wait 60 seconds/);
          await assert.rejects(storage.processWithdrawal(actorId, '2', method, request.destinationAddress,
            undefined, authorizationCode), /details changed/);
          assert.equal(await balance(), before);
          const authorized = await storage.processWithdrawal(actorId, '1', method, request.destinationAddress,
            undefined, authorizationCode);
          assert.equal(authorized.userId, actorId);
          assert.equal(await balance(), before - 1);
          await assert.rejects(storage.processWithdrawal(actorId, '1', method, request.destinationAddress,
            undefined, authorizationCode), /new XP code/);
          assert.equal(await balance(), before - 1);
        }
      }

      // Failed delivery must not replace the previous authorization.
      const secondSid = `joint-withdrawal-code:${secondId}`;
      const [prior] = await tx.select().from(sessions).where(eq(sessions.sid, secondSid));
      await tx.update(sessions).set({ sess: { ...prior.sess as object, sentAt: 0 } }).where(eq(sessions.sid, secondSid));
      await assert.rejects(issueWithdrawalCode(secondId, joint.id, firstId,
        { amount: '1', withdrawMethod: 'crypto', destinationAddress: 'test-failure' },
        async () => ({ success: false })), /Could not send/);
      assert.equal(((await tx.select().from(sessions).where(eq(sessions.sid, secondSid)))[0].sess as { used: boolean }).used, true);

      const suspendedBalance = await balance();
      await tx.update(users).set({ withdrawalSuspended: true }).where(eq(users.id, secondId));
      await assert.rejects(storage.processWithdrawal(secondId, '10', 'merchant_pay', 'test-merchant',
        undefined, code.split('').reverse().join('')), /currently suspended/);
      assert.equal(await balance(), suspendedBalance);
      throw rollback;
    }), error => error === rollback);
  } finally {
    t.mock.restoreAll();
    await pool.end();
  }
});
