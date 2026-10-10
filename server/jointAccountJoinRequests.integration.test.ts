import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("join codes grant access only after an administrator approves the request", {
  skip: process.env.RUN_JOINT_JOIN_DB_TEST !== "1",
}, async t => {
  const { db, pool } = await import("./db");
  const { DatabaseStorage } = await import("./storage");
  const { listAdminJoinRequests, listUserJoinRequests, reviewJointAccountJoin } = await import("./jointAccountJoinRequests");
  const { users, jointAccounts, userJointAccounts, jointAccountJoinRequests } = await import("../shared/schema");
  const { eq } = await import("drizzle-orm");
  const storage = new DatabaseStorage();
  const rollback = new Error("ROLLBACK_JOIN_REQUEST_TEST_DATA");
  try {
    await assert.rejects(db.transaction(async tx => {
      const ownerId = randomUUID();
      const applicantId = randomUUID();
      const adminId = randomUUID();
      const competitorId = randomUUID();
      await tx.insert(users).values([
        { id: ownerId, firstName: "Test owner", balance: "100", accountType: "joint" },
        { id: applicantId, firstName: "Test applicant", balance: "250", accountType: "personal" },
        { id: adminId, firstName: "Test administrator", balance: "0", role: "admin" },
        { id: competitorId, firstName: "Test competitor", balance: "500", accountType: "personal" },
      ]);
      const joinCode = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
      const [joint] = await tx.insert(jointAccounts).values({
        createdBy: ownerId, name: "Temporary approval test", joinCode,
      }).returning();
      await tx.insert(userJointAccounts).values({ userId: ownerId, jointAccountId: joint.id, role: "primary" });
      t.mock.method(db, "transaction", async callback => tx.transaction(callback));
      t.mock.method(db, "select", fields => fields ? tx.select(fields) : tx.select());

      const submitted = await storage.joinJointAccountByCode(applicantId, ` ${joinCode.toLowerCase()} `);
      assert.equal(submitted.status, "pending");
      assert.equal((await storage.joinJointAccountByCode(applicantId, joinCode)).id, submitted.id);
      assert.equal(await storage.getUserJointAccount(applicantId), undefined);
      assert.equal((await storage.getJointAccountMembers(joint.id)).length, 1);
      assert.equal((await storage.getAccountContext(applicantId)).isJointAccount, false);
      assert.equal((await storage.getUser(applicantId))?.accountType, "personal");
      // Pending applicants can spend only their own personal funds, not the owner pool.
      await assert.rejects(storage.processWithdrawal(applicantId, "300", "crypto", "test-wallet"), /Insufficient balance/);
      assert.equal((await storage.getUser(applicantId))?.balance, "250.00000000");
      await assert.rejects(storage.joinJointAccountByCode(ownerId, joinCode), /already belong/);
      await assert.rejects(storage.joinJointAccountByCode(competitorId, "INVALID0"), /Invalid join code/);

      await assert.rejects(reviewJointAccountJoin(submitted.id, applicantId, "approved"), /Administrator/);
      assert.equal((await listUserJoinRequests(applicantId))[0].status, "pending");
      const adminList = await listAdminJoinRequests();
      const item = adminList.find(row => row.id === submitted.id)!;
      assert.equal(item.requesterId, applicantId);
      assert.equal(item.jointAccountName, joint.name);
      assert.equal(item.ownerFirstName, "Test owner");
      assert.equal("xpCode" in item, false);
      assert.equal("passwordHash" in item, false);

      const rejected = await reviewJointAccountJoin(submitted.id, adminId, "rejected");
      assert.equal(rejected.status, "rejected");
      assert.equal(rejected.reviewedBy, adminId);
      assert.ok(rejected.reviewedAt);
      assert.equal(await storage.getUserJointAccount(applicantId), undefined);
      assert.equal((await storage.getAccountContext(applicantId)).isJointAccount, false);
      await assert.rejects(reviewJointAccountJoin(submitted.id, adminId, "approved"), /already been reviewed/);

      const retry = await storage.joinJointAccountByCode(applicantId, joinCode);
      assert.notEqual(retry.id, submitted.id);
      const competing = await storage.joinJointAccountByCode(competitorId, joinCode);
      assert.equal(competing.status, "pending");
      const approved = await reviewJointAccountJoin(retry.id, adminId, "approved");
      assert.equal(approved.status, "approved");
      const membership = await storage.getUserJointAccount(applicantId);
      assert.equal(membership?.role, "partner");
      assert.equal(membership?.jointAccountId, joint.id);
      assert.equal((await storage.getAccountContext(applicantId)).isJointAccount, true);
      assert.equal((await storage.getJointAccountMembers(joint.id)).length, 2);
      assert.equal((await storage.getUser(applicantId))?.accountType, "joint");
      assert.equal((await storage.getUser(applicantId))?.balance, "250.00000000");
      assert.equal((await storage.getUser(ownerId))?.balance, "100.00000000");
      await assert.rejects(storage.processWithdrawal(applicantId, "300", "crypto", "test-wallet"), /XP code/);
      await assert.rejects(reviewJointAccountJoin(retry.id, adminId, "approved"), /already been reviewed/);
      await assert.rejects(reviewJointAccountJoin(competing.id, adminId, "approved"), /both members/);
      assert.equal(await storage.getUserJointAccount(competitorId), undefined);
      assert.equal((await tx.select().from(jointAccountJoinRequests).where(eq(jointAccountJoinRequests.id, competing.id)))[0].status, "pending");
      await reviewJointAccountJoin(competing.id, adminId, "rejected");
      assert.equal((await listUserJoinRequests(applicantId)).length, 2);
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
