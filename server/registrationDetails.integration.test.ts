import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { registrationDetailsSchema, registrationDetailsToUser } from "../shared/registrationDetails";

test("signup details survive database storage and retrieval used by admin user details", {
  skip: process.env.RUN_ACCOUNT_FUNDS_DB_TEST !== "1",
}, async t => {
  const { db, pool } = await import("./db");
  const { DatabaseStorage } = await import("./storage");
  const { users } = await import("../shared/schema");
  const storage = new DatabaseStorage();
  const rollback = new Error("ROLLBACK_SIGNUP_FIXTURES");
  try {
    await assert.rejects(db.transaction(async tx => {
      // Keep the real storage implementation but route all queries into this rollback.
      t.mock.method(db, "insert", (...args: Parameters<typeof db.insert>) => tx.insert(...args));
      t.mock.method(db, "select", (...args: any[]) => (tx.select as any)(...args));
      const profile = registrationDetailsToUser(registrationDetailsSchema.parse({
        phone: "+10000000000", country: "US", address: "123 Test Street",
        city: "Test City", state: "Test State", zipCode: "00000",
        documentType: "passport", documentNumber: "TEST-ONLY",
        verificationDocumentUrl: "data:image/png;base64,iVBORw0KGgo=",
      }));
      const created = await storage.createUser({ id: randomUUID(), ...profile, passwordHash: "synthetic-hash", authType: "password" });
      const loaded = await storage.getUser(created.id);
      assert.ok(loaded);
      const { passwordHash, xpCode, ...adminDetails } = loaded;
      for (const [key, value] of Object.entries(profile)) assert.equal(adminDetails[key as keyof typeof adminDetails], value);
      assert.equal("passwordHash" in adminDetails, false);
      assert.equal("xpCode" in adminDetails, false);
      throw rollback;
    }), error => error === rollback);
  } finally { await pool.end(); }
});
