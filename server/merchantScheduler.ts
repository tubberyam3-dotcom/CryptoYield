import { storage } from './storage';
import { emailService } from './email';

const MERCHANT_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

async function expireOverdueMerchantDeposits() {
  try {
    const allDeposits = await storage.getAllDeposits();
    const now = Date.now();

    const expired = allDeposits.filter(
      (d: any) =>
        d.depositMethod === 'merchant_pay' &&
        d.status === 'pending' &&
        new Date(d.createdAt).getTime() + MERCHANT_EXPIRY_MS < now
    );

    if (expired.length === 0) return;

    console.log(`[Merchant Scheduler] Found ${expired.length} expired Merchant Pay deposit(s) to cancel`);

    for (const deposit of expired) {
      try {
        await storage.cancelDeposit(String(deposit.id), 'system');

        const user = deposit.user;
        if (user?.email) {
          await emailService.sendMerchantPayFailure(
            user.email,
            user.firstName || 'Investor',
            deposit.amount,
            'expired'
          );
          console.log(`[Merchant Scheduler] Sent expiry failure email to ${user.email} for deposit ${deposit.id}`);
        }
      } catch (err: any) {
        console.error(`[Merchant Scheduler] Error expiring deposit ${deposit.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[Merchant Scheduler] Error checking for expired deposits:', err.message);
  }
}

export function startMerchantScheduler() {
  console.log('[Merchant Scheduler] Starting — checking every 5 minutes for expired Merchant Pay deposits');
  expireOverdueMerchantDeposits();
  setInterval(expireOverdueMerchantDeposits, CHECK_INTERVAL_MS);
}
