import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { sessions } from "@shared/schema";
import { db } from "./db";

export interface WithdrawalCodeRequest {
  amount: string;
  withdrawMethod: string;
  destinationAddress: string;
  metadata?: unknown;
}

interface Authorization {
  userId: string;
  jointAccountId: string;
  partnerId: string;
  requestHash: string;
  codeHash: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
  used: boolean;
}

const TTL = 10 * 60 * 1000;
const COOLDOWN = 60 * 1000;
const MAX_ATTEMPTS = 5;
const sidFor = (userId: string) => `joint-withdrawal-code:${userId}`;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function canonical(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().filter(key => object[key] !== undefined)
      .map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function withdrawalRequestHash(request: WithdrawalCodeRequest): string {
  return hash(canonical({
    ...request,
    amount: Number(request.amount).toFixed(8),
    metadata: request.metadata ?? null,
  }));
}

export function checkWithdrawalCode(
  authorization: Authorization | undefined,
  userId: string,
  jointAccountId: string,
  partnerId: string,
  request: WithdrawalCodeRequest,
  code: unknown,
  now = Date.now(),
): string | null {
  if (!authorization || authorization.used || authorization.expiresAt <= now) {
    return "Request a new XP code sent to your partner's registered email.";
  }
  if (authorization.attempts >= MAX_ATTEMPTS) {
    return "Too many incorrect XP code attempts. Request a new code.";
  }
  if (authorization.userId !== userId || authorization.jointAccountId !== jointAccountId ||
      authorization.partnerId !== partnerId || authorization.requestHash !== withdrawalRequestHash(request)) {
    return "Withdrawal details changed. Request a new XP code from your partner.";
  }
  const supplied = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!/^[A-Z0-9]{11}$/.test(supplied) ||
      !timingSafeEqual(Buffer.from(hash(supplied), "hex"), Buffer.from(authorization.codeHash, "hex"))) {
    return "Enter the valid XP code sent to your partner's registered email.";
  }
  return null;
}

// Namespaced, expiring records use the existing PostgreSQL session store.
// Only hashes are persisted; codes never become reusable account/login credentials.
export async function issueWithdrawalCode(
  userId: string,
  jointAccountId: string,
  partnerId: string,
  request: WithdrawalCodeRequest,
  send: (code: string) => Promise<{ success: boolean }>,
): Promise<void> {
  await db.transaction(async tx => {
    const sid = sidFor(userId);
    await tx.insert(sessions).values({
      sid, sess: {}, expire: new Date(Date.now() + TTL),
    }).onConflictDoNothing();
    const [row] = await tx.select().from(sessions).where(eq(sessions.sid, sid)).for("update");
    const existing = row?.sess as Partial<Authorization>;
    const now = Date.now();
    if (existing.sentAt && now - existing.sentAt < COOLDOWN) {
      throw new Error("Please wait 60 seconds before requesting another XP code.");
    }
    const code = randomBytes(8).toString("hex").slice(0, 11).toUpperCase();
    const delivered = await send(code);
    if (!delivered.success) throw new Error("Could not send the XP code to your partner. Please try again.");
    const authorization: Authorization = {
      userId, jointAccountId, partnerId, requestHash: withdrawalRequestHash(request),
      codeHash: hash(code), expiresAt: now + TTL, sentAt: now, attempts: 0, used: false,
    };
    await tx.update(sessions).set({
      sess: authorization, expire: new Date(authorization.expiresAt),
    }).where(eq(sessions.sid, sid));
  });
}

export async function checkAndConsumeWithdrawalCode(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  jointAccountId: string,
  partnerId: string,
  request: WithdrawalCodeRequest,
  code: unknown,
): Promise<string | null> {
  // The caller commits rejected attempts, or commits code consumption together
  // with the withdrawal debit. Concurrent submissions cannot reuse the code.
  const sid = sidFor(userId);
  const [row] = await tx.select().from(sessions).where(eq(sessions.sid, sid)).for("update");
  const authorization = row?.sess as Authorization | undefined;
  const problem = checkWithdrawalCode(authorization, userId, jointAccountId, partnerId, request, code);
  if (authorization && !authorization.used) {
    await tx.update(sessions).set({
      sess: { ...authorization, attempts: authorization.attempts + (problem ? 1 : 0), used: !problem },
    }).where(eq(sessions.sid, sid));
  }
  return problem;
}
