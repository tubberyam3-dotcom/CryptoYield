import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { checkWithdrawalCode, withdrawalRequestHash } from "./jointWithdrawalCodes";

const code = "ABCDEF12345";
const request = { amount: "25", withdrawMethod: "crypto", destinationAddress: "test-wallet", metadata: { crypto: "BTC", network: "Bitcoin" } };
const valid = {
  userId: "initiator", jointAccountId: "joint", partnerId: "partner",
  requestHash: withdrawalRequestHash(request),
  codeHash: createHash("sha256").update(code).digest("hex"),
  expiresAt: 10000, sentAt: 1, attempts: 0, used: false,
};
const check = (authorization = valid, submitted: unknown = code, payload = request, user = "initiator", joint = "joint", partner = "partner") =>
  checkWithdrawalCode(authorization, user, joint, partner, payload, submitted, 5000);

test("accepts partner withdrawal code without requiring either login XP credential", () => {
  assert.equal(check(), null);
  assert.equal(check(valid, " abcdef12345 "), null);
  assert.equal(check(valid, code, { ...request, amount: "25.00" }), null);
});
test("rejects missing, wrong and malformed codes", () => {
  for (const wrong of [undefined, "", null, "LOGINXP1234", "ABCDE", {}, "ABCDEF12345X"]) {
    assert.match(checkWithdrawalCode(valid, "initiator", "joint", "partner", request, wrong, 5000)!, /valid XP code/);
  }
});
test("rejects expired, consumed and brute-forced authorizations", () => {
  assert.match(check({ ...valid, expiresAt: 5000 })!, /new XP code/);
  assert.match(check({ ...valid, used: true })!, /new XP code/);
  assert.match(check({ ...valid, attempts: 5 })!, /Too many/);
  assert.match(checkWithdrawalCode(undefined, "initiator", "joint", "partner", request, code)!, /new XP code/);
});
test("binds authorization to amount, method, destination and all payment metadata", () => {
  for (const changed of [
    { ...request, amount: "30" },
    { ...request, withdrawMethod: "wire_transfer" },
    { ...request, destinationAddress: "different-wallet" },
    { ...request, metadata: { crypto: "ETH", network: "Ethereum" } },
  ]) assert.match(check(valid, code, changed)!, /details changed/);
});
test("binds authorization to both members and the current joint account", () => {
  assert.match(check(valid, code, request, "other-user")!, /details changed/);
  assert.match(check(valid, code, request, "initiator", "other-joint")!, /details changed/);
  assert.match(check(valid, code, request, "initiator", "joint", "other-partner")!, /details changed/);
});
test("metadata ordering does not change the authorized request", () => {
  assert.equal(withdrawalRequestHash(request), withdrawalRequestHash({
    ...request, metadata: { network: "Bitcoin", crypto: "BTC" },
  }));
});
