import { storage } from "./storage";

let schedulerInterval: NodeJS.Timeout | null = null;

export function startInterestScheduler() {
  if (schedulerInterval) {
    console.log("[Interest Scheduler] Already running");
    return;
  }

  console.log("[Interest Scheduler] Starting automated interest accrual...");

  const runAccrual = async () => {
    try {
      const result = await storage.accrueInterestForAllPortfolios();
      if (result.processed > 0 || result.maturityPayouts > 0) {
        console.log(`[Interest Scheduler] Processed ${result.processed} portfolios, added $${result.totalInterestAdded} interest, ${result.maturityPayouts} maturity payouts`);
      }
    } catch (error) {
      console.error("[Interest Scheduler] Error during accrual:", error);
    }
  };

  runAccrual();

  schedulerInterval = setInterval(runAccrual, 60 * 1000);

  console.log("[Interest Scheduler] Running every 60 seconds");
}

export function stopInterestScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Interest Scheduler] Stopped");
  }
}
