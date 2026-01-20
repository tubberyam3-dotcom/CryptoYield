import { storage } from './storage';
import { emailService } from './email';

const EMAIL_SCHEDULER_INTERVAL = 60000; // Check every 60 seconds

export async function processScheduledEmails(): Promise<void> {
  try {
    const pendingEmails = await storage.getPendingScheduledEmails();
    
    if (pendingEmails.length === 0) {
      return;
    }

    console.log(`[Email Scheduler] Processing ${pendingEmails.length} pending scheduled email(s)...`);

    for (const email of pendingEmails) {
      try {
        let result: { success: boolean; error?: string };

        switch (email.emailType) {
          case 'investment_encouragement':
            result = await emailService.sendInvestmentEncouragementEmail(
              email.recipientEmail,
              email.recipientFirstName || 'there'
            );
            break;
          default:
            console.log(`[Email Scheduler] Unknown email type: ${email.emailType}`);
            result = { success: false, error: `Unknown email type: ${email.emailType}` };
        }

        if (result.success) {
          await storage.markScheduledEmailSent(email.id);
          console.log(`[Email Scheduler] Successfully sent ${email.emailType} email to ${email.recipientEmail}`);
        } else {
          await storage.markScheduledEmailFailed(email.id, result.error || 'Unknown error');
          console.error(`[Email Scheduler] Failed to send ${email.emailType} email to ${email.recipientEmail}: ${result.error}`);
        }
      } catch (error: any) {
        await storage.markScheduledEmailFailed(email.id, error.message);
        console.error(`[Email Scheduler] Error processing email ${email.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[Email Scheduler] Error fetching pending emails:', error);
  }
}

export function startEmailScheduler(): void {
  console.log('[Email Scheduler] Starting scheduled email processor...');
  console.log(`[Email Scheduler] Checking for pending emails every ${EMAIL_SCHEDULER_INTERVAL / 1000} seconds`);
  
  // Run immediately on startup
  processScheduledEmails();
  
  // Then run periodically
  setInterval(processScheduledEmails, EMAIL_SCHEDULER_INTERVAL);
}
