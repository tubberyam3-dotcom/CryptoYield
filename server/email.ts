import { Resend } from 'resend';
import { storage } from './storage';

// Production app domain for email links
const APP_DOMAIN = 'https://app.refluxcapital.com';

// Reusable email footer with copyright and confidentiality disclaimer
const getEmailFooter = () => `
  <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
    <p style="color: #999; font-size: 12px; margin: 0 0 15px 0;">
      © ${new Date().getFullYear()} Reflux Capital. All rights reserved.
    </p>
    <p style="color: #999; font-size: 10px; line-height: 1.5; margin: 0; padding: 0 20px;">
      This email and any attachments are confidential and intended solely for the addressee. If you are not the intended recipient, please notify the sender immediately and delete this email. Any unauthorized copying, disclosure, or distribution of the material in this email is strictly prohibited.
    </p>
  </div>
`;

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string = 'onboarding@resend.dev';
  private fromName: string = 'Reflux Capital';

  private async getApiKey(): Promise<string | null> {
    // Check database first, then fall back to environment variable
    try {
      const dbApiKey = await storage.getSetting('email_resend_api_key');
      if (dbApiKey?.settingValue) {
        return dbApiKey.settingValue;
      }
    } catch (error) {
      console.log('Could not fetch API key from database, using env var');
    }
    return process.env.RESEND_API_KEY || null;
  }

  async initialize(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      console.log('Email service not configured - no API key in database or environment');
      return false;
    }

    try {
      this.resend = new Resend(apiKey);
      
      const fromEmailSetting = await storage.getSetting('email_from_address');
      const fromNameSetting = await storage.getSetting('email_from_name');
      
      if (fromEmailSetting?.settingValue) {
        this.fromEmail = fromEmailSetting.settingValue;
      }
      if (fromNameSetting?.settingValue) {
        this.fromName = fromNameSetting.settingValue;
      }
      
      console.log('Email service initialized successfully with Resend');
      return true;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.resend = null;
      return false;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return { success: false, error: 'Email service not configured - missing API key' };
    }

    try {
      const resend = new Resend(apiKey);
      
      const fromEmailSetting = await storage.getSetting('email_from_address');
      const fromNameSetting = await storage.getSetting('email_from_name');
      
      const customFromEmail = fromEmailSetting?.settingValue;
      const fromName = fromNameSetting?.settingValue || 'Reflux Capital';
      
      const fromEmail = customFromEmail || 'onboarding@resend.dev';

      console.log(`=== EMAIL DEBUG ===`);
      console.log(`Attempting to send email:`);
      console.log(`  From: ${fromName} <${fromEmail}>`);
      console.log(`  To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
      console.log(`  Subject: ${options.subject}`);
      console.log(`  API Key present: Yes`);
      console.log(`  API Key prefix: ${apiKey.substring(0, 10)}...`);

      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      });

      if (error) {
        const apiKeyPrefix = process.env.RESEND_API_KEY?.substring(0, 12) || 'unknown';
        console.error('Error sending email with custom domain:', error);
        console.error('API Key prefix used:', apiKeyPrefix);
        
        if (customFromEmail && customFromEmail !== 'onboarding@resend.dev') {
          console.log('Retrying with Resend test domain (onboarding@resend.dev)...');
          const { data: retryData, error: retryError } = await resend.emails.send({
            from: `${fromName} <onboarding@resend.dev>`,
            to: Array.isArray(options.to) ? options.to : [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>/g, ''),
          });
          
          if (retryError) {
            console.error('Error sending email with test domain:', retryError);
            return { success: false, error: `Failed with API key: ${apiKeyPrefix}... Error: ${error.message}. Note: If using an old API key created before domain verification, create a new key in Resend dashboard.` };
          }
          
          console.log('Email sent successfully using Resend test domain');
          return { success: true, messageId: retryData?.id };
        }
        
        return { success: false, error: `Failed with API key: ${apiKeyPrefix}... Error: ${error.message}` };
      }

      console.log('Email sent successfully:', data?.id);
      return { success: true, messageId: data?.id };
    } catch (error: any) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<{ success: boolean; error?: string }> {
    const enabled = await storage.getSetting('email_welcome_enabled');
    if (enabled?.settingValue !== 'true') {
      return { success: true };
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0;">Welcome to Reflux Capital</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi ${firstName || 'there'},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Welcome to Reflux Capital! We're excited to have you on board.
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          With your new account, you can:
        </p>
        <ul style="color: #333; font-size: 16px; line-height: 1.8;">
          <li>Invest in curated portfolios</li>
          <li>Purchase bonds with competitive yields</li>
          <li>Buy and sell stocks with admin-approved transactions</li>
          <li>Participate in community challenges</li>
          <li>Earn daily rewards and XP bonuses</li>
        </ul>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Get started by logging into your dashboard and exploring our investment options.
        </p>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          If you have any questions, feel free to reach out to our support team.
        </p>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Reflux Capital',
      html,
    });
  }

  async sendMerchantPayInstructions(
    email: string,
    firstName: string,
    amount: string,
    bankDetails: {
      bankName?: string;
      accountName?: string;
      accountNumber?: string;
      routingNumber?: string;
      swiftCode?: string;
      iban?: string;
      bankAddress?: string;
      instructions?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const formatAmount = parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const detailRows = [
      { label: 'Bank Name', value: bankDetails.bankName },
      { label: 'Account Name', value: bankDetails.accountName },
      { label: 'Account Number', value: bankDetails.accountNumber },
      { label: 'Routing Number (ACH)', value: bankDetails.routingNumber },
      { label: 'SWIFT / BIC Code', value: bankDetails.swiftCode },
      { label: 'IBAN', value: bankDetails.iban },
      { label: 'Bank Address', value: bankDetails.bankAddress },
    ]
      .filter(row => row.value)
      .map(row => `
        <tr>
          <td style="padding: 10px 16px; color: #666; font-size: 14px; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">${row.label}</td>
          <td style="padding: 10px 16px; color: #1a1a1a; font-size: 14px; font-weight: bold; border-bottom: 1px solid #f0f0f0; font-family: monospace;">${row.value}</td>
        </tr>`)
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0 0 8px 0;">Merchant Paired — Transfer Instructions</h1>
          <p style="color: #666; margin: 0; font-size: 15px;">Your deposit request has been matched with a merchant</p>
        </div>

        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${firstName || 'there'},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Great news! You've been paired with a verified merchant. Please transfer the amount below to the bank account details provided and your deposit will be credited once confirmed.
        </p>

        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #6ee7b7; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center;">
          <p style="color: #065f46; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px 0;">Amount to Transfer</p>
          <p style="color: #047857; font-size: 36px; font-weight: bold; margin: 0;">$${formatAmount}</p>
        </div>

        <div style="background-color: #f9fafb; border-radius: 10px; overflow: hidden; margin: 24px 0;">
          <div style="background-color: #059669; padding: 12px 16px;">
            <p style="color: #ffffff; font-size: 14px; font-weight: bold; margin: 0;">🏦 Bank Transfer Details</p>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            ${detailRows || '<tr><td style="padding: 16px; color: #666;">Contact support for bank details.</td></tr>'}
          </table>
        </div>

        ${bankDetails.instructions ? `
        <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #92400e; font-size: 14px; margin: 0;"><strong>⚠️ Important:</strong> ${bankDetails.instructions}</p>
        </div>` : ''}

        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          Once you've completed the transfer, your deposit will be reviewed and credited to your account within <strong>1–2 business days</strong>.
        </p>
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          If you have any questions, please contact our support team.
        </p>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Merchant Pay Instructions — Transfer $${formatAmount} | Reflux Capital`,
      html,
    });
  }

  async sendMerchantPayFailure(
    email: string,
    firstName: string,
    amount: string,
    reason: 'expired' | 'cancelled'
  ): Promise<{ success: boolean; error?: string }> {
    const formatAmount = parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const reasonText = reason === 'expired'
      ? 'Your 2-day transfer window has elapsed and no payment was received.'
      : 'Your Merchant Pay deposit was cancelled by our team.';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0 0 8px 0;">Payment Not Received</h1>
          <p style="color: #666; margin: 0; font-size: 15px;">Your Merchant Pay deposit could not be completed</p>
        </div>

        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${firstName || 'there'},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Unfortunately, your Merchant Pay deposit of <strong>$${formatAmount}</strong> was not successfully completed. ${reasonText}
        </p>

        <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fca5a5; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center;">
          <p style="color: #991b1b; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px 0;">Deposit Amount</p>
          <p style="color: #dc2626; font-size: 36px; font-weight: bold; margin: 0;">$${formatAmount}</p>
          <p style="color: #991b1b; font-size: 13px; margin: 8px 0 0 0;">Status: Not Completed</p>
        </div>

        <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #92400e; font-size: 14px; margin: 0;"><strong>⚠️ What happened?</strong> ${reasonText}</p>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          No funds have been deducted from your account. You are welcome to start a new Merchant Pay deposit at any time.
        </p>



        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          If you believe this is an error or need assistance, please contact our support team and we'll be happy to help.
        </p>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Action Required — Merchant Pay Deposit Not Completed | Reflux Capital`,
      html,
    });
  }

  async sendDepositConfirmation(email: string, firstName: string, amount: string, status: string): Promise<{ success: boolean; error?: string }> {
    const enabled = await storage.getSetting('email_deposit_enabled');
    if (enabled?.settingValue !== 'true') {
      return { success: true };
    }

    const statusColor = status === 'completed' ? '#22c55e' : status === 'pending' ? '#f59e0b' : '#ef4444';
    const statusText = status === 'completed' ? 'Approved' : status === 'pending' ? 'Pending Review' : 'Rejected';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0;">Deposit ${statusText}</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi ${firstName || 'there'},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Your deposit request has been ${status === 'completed' ? 'approved and processed' : status === 'pending' ? 'received and is pending review' : 'reviewed'}.
        </p>
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Amount:</span>
            <span style="color: #1a1a1a; font-weight: bold;">$${parseFloat(amount).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #666;">Status:</span>
            <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
          </div>
        </div>
        ${status === 'completed' ? '<p style="color: #333; font-size: 16px; line-height: 1.6;">The funds have been added to your wallet and are ready to use for investments.</p>' : ''}
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Deposit ${statusText} - Reflux Capital`,
      html,
    });
  }

  async sendStockPurchaseUpdate(email: string, firstName: string, stockSymbol: string, quantity: number, status: string): Promise<{ success: boolean; error?: string }> {
    const enabled = await storage.getSetting('email_stock_enabled');
    if (enabled?.settingValue !== 'true') {
      return { success: true };
    }

    const statusColor = status === 'approved' ? '#22c55e' : status === 'pending' ? '#f59e0b' : '#ef4444';
    const statusText = status === 'approved' ? 'Approved' : status === 'pending' ? 'Pending Review' : 'Rejected';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0;">Stock Purchase ${statusText}</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi ${firstName || 'there'},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Your stock purchase order has been ${status === 'approved' ? 'approved' : status === 'pending' ? 'submitted and is pending review' : 'reviewed'}.
        </p>
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Stock:</span>
            <span style="color: #1a1a1a; font-weight: bold;">${stockSymbol}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Quantity:</span>
            <span style="color: #1a1a1a; font-weight: bold;">${quantity}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #666;">Status:</span>
            <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
          </div>
        </div>
        ${status === 'rejected' ? '<p style="color: #333; font-size: 16px; line-height: 1.6;">Your funds have been refunded to your wallet balance.</p>' : ''}
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Stock Purchase ${statusText} - Reflux Capital`,
      html,
    });
  }

  async sendDailyRewardNotification(email: string, firstName: string, bonusAmount: string, xpAmount: number): Promise<{ success: boolean; error?: string }> {
    const enabled = await storage.getSetting('email_rewards_enabled');
    if (enabled?.settingValue !== 'true') {
      return { success: true };
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0;">🎉 Daily Rewards Claimed!</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi ${firstName || 'there'},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Congratulations! You've successfully claimed your daily rewards.
        </p>
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">Daily Bonus:</span>
            <span style="color: #22c55e; font-weight: bold;">+$${parseFloat(bonusAmount).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #666;">XP Earned:</span>
            <span style="color: #3b82f6; font-weight: bold;">+${xpAmount} XP</span>
          </div>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Come back tomorrow to claim more rewards!
        </p>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: '🎉 Daily Rewards Claimed - Reflux Capital',
      html,
    });
  }

  async sendAccountPendingEmail(email: string, firstName: string): Promise<{ success: boolean; error?: string }> {
    const enabled = await storage.getSetting('email_welcome_enabled');
    if (enabled?.settingValue !== 'true') {
      return { success: true };
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background-color: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">⏳</span>
          </div>
          <h1 style="color: #1a1a1a; margin: 0;">Account Created Successfully</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi ${firstName || 'there'},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Thank you for registering with Reflux Capital! Your account has been created and is now <strong>awaiting approval</strong>.
        </p>
        <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>What happens next?</strong><br>
            Our team will review your application and verify your information. This usually takes 1-2 business days.
          </p>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          You'll receive an email notification once your account has been approved and you can start investing.
        </p>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          If you have any questions in the meantime, feel free to reach out to our support team.
        </p>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Account Created - Awaiting Approval | Reflux Capital',
      html,
    });
  }

  async sendAccountApprovedEmail(email: string, firstName: string): Promise<{ success: boolean; error?: string }> {
    console.log(`=== sendAccountApprovedEmail called for ${email} ===`);
    const enabled = await storage.getSetting('email_welcome_enabled');
    console.log(`  email_welcome_enabled setting: ${enabled?.settingValue}`);
    if (enabled?.settingValue !== 'true') {
      console.log(`  Email notifications disabled, skipping send`);
      return { success: true };
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background-color: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">✓</span>
          </div>
          <h1 style="color: #1a1a1a; margin: 0;">Your Account Has Been Approved!</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi ${firstName || 'there'},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Great news! Your Reflux Capital account has been <strong style="color: #22c55e;">approved</strong> and is now fully active.
        </p>
        <div style="background-color: #dcfce7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
          <p style="color: #166534; font-size: 14px; margin: 0;">
            <strong>You can now:</strong><br>
            • Invest in curated portfolios<br>
            • Purchase bonds with competitive yields<br>
            • Buy and sell stocks<br>
            • Participate in community challenges<br>
            • Earn daily rewards and XP bonuses
          </p>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          If you have any questions, our support team is here to help.
        </p>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Account Approved - Welcome to Reflux Capital!',
      html,
    });
  }

  async sendPortfolioPurchaseEmail(
    email: string, 
    firstName: string, 
    portfolioName: string, 
    investedAmount: string, 
    units: number
  ): Promise<{ success: boolean; error?: string }> {
    const enabled = await storage.getSetting('email_welcome_enabled');
    if (enabled?.settingValue !== 'true') {
      return { success: true };
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background-color: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">📋</span>
          </div>
          <h1 style="color: #1a1a1a; margin: 0;">Investment Request Submitted</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi ${firstName || 'there'},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Your investment request has been submitted and is now <strong>pending approval</strong>.
        </p>
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1a1a1a; margin: 0 0 15px 0;">Investment Details</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="color: #666; padding: 5px 0;">Portfolio:</td>
              <td style="color: #1a1a1a; font-weight: bold; text-align: right;">${portfolioName}</td>
            </tr>
            <tr>
              <td style="color: #666; padding: 5px 0;">Units:</td>
              <td style="color: #1a1a1a; font-weight: bold; text-align: right;">${units}</td>
            </tr>
            <tr>
              <td style="color: #666; padding: 5px 0;">Amount:</td>
              <td style="color: #1a1a1a; font-weight: bold; text-align: right;">$${parseFloat(investedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
        </div>
        <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>What happens next?</strong><br>
            Our team will review your investment request. You'll receive a confirmation email once it's approved and your funds are allocated.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Investment Request Submitted - ${portfolioName}`,
      html,
    });
  }

  async sendPortfolioApprovedEmail(
    email: string, 
    firstName: string, 
    portfolioName: string, 
    investedAmount: string, 
    units: number
  ): Promise<{ success: boolean; error?: string }> {
    const enabled = await storage.getSetting('email_welcome_enabled');
    if (enabled?.settingValue !== 'true') {
      return { success: true };
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background-color: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">✅</span>
          </div>
          <h1 style="color: #1a1a1a; margin: 0;">Investment Approved!</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi ${firstName || 'there'},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Great news! Your investment has been <strong style="color: #22c55e;">approved</strong> and is now active.
        </p>
        <div style="background-color: #dcfce7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
          <h3 style="color: #166534; margin: 0 0 15px 0;">Investment Confirmed</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="color: #166534; padding: 5px 0;">Portfolio:</td>
              <td style="color: #166534; font-weight: bold; text-align: right;">${portfolioName}</td>
            </tr>
            <tr>
              <td style="color: #166534; padding: 5px 0;">Units:</td>
              <td style="color: #166534; font-weight: bold; text-align: right;">${units}</td>
            </tr>
            <tr>
              <td style="color: #166534; padding: 5px 0;">Amount Invested:</td>
              <td style="color: #166534; font-weight: bold; text-align: right;">$${parseFloat(investedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Your investment will now begin earning returns based on the portfolio's configured interest rate. You can track your investment performance anytime from your dashboard.
        </p>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          Thank you for investing with Reflux Capital. We're excited to help you grow your wealth!
        </p>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Investment Approved - ${portfolioName} 🎉`,
      html,
    });
  }

  async sendAdminPortfolioPurchaseEmail(
    email: string, 
    firstName: string, 
    portfolioName: string, 
    investedAmount: string, 
    units: number,
    status: 'approved' | 'pending'
  ): Promise<{ success: boolean; error?: string }> {
    const enabled = await storage.getSetting('email_welcome_enabled');
    if (enabled?.settingValue !== 'true') {
      return { success: true };
    }

    const isApproved = status === 'approved';
    const statusColor = isApproved ? '#22c55e' : '#f59e0b';
    const statusBg = isApproved ? '#dcfce7' : '#fef3c7';
    const statusText = isApproved ? 'Approved & Active' : 'Pending Review';
    const icon = isApproved ? '✅' : '📋';
    const headerColor = isApproved ? '#166534' : '#92400e';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background-color: ${statusBg}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">${icon}</span>
          </div>
          <h1 style="color: #1a1a1a; margin: 0;">Portfolio Investment Made on Your Behalf</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi ${firstName || 'there'},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          A portfolio investment has been made on your behalf by our investment team. The funds have been deducted from your account balance.
        </p>
        <div style="background-color: ${statusBg}; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${statusColor};">
          <h3 style="color: ${headerColor}; margin: 0 0 15px 0;">Investment Details</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="color: ${headerColor}; padding: 5px 0;">Portfolio:</td>
              <td style="color: ${headerColor}; font-weight: bold; text-align: right;">${portfolioName}</td>
            </tr>
            <tr>
              <td style="color: ${headerColor}; padding: 5px 0;">Units Purchased:</td>
              <td style="color: ${headerColor}; font-weight: bold; text-align: right;">${units}</td>
            </tr>
            <tr>
              <td style="color: ${headerColor}; padding: 5px 0;">Amount Invested:</td>
              <td style="color: ${headerColor}; font-weight: bold; text-align: right;">$${parseFloat(investedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="color: ${headerColor}; padding: 5px 0;">Status:</td>
              <td style="color: ${statusColor}; font-weight: bold; text-align: right;">${statusText}</td>
            </tr>
          </table>
        </div>
        ${isApproved 
          ? `<p style="color: #333; font-size: 16px; line-height: 1.6;">Your investment is now active and will begin earning returns based on the portfolio's configured interest rate.</p>` 
          : `<p style="color: #333; font-size: 16px; line-height: 1.6;">Your investment is pending final approval. You will receive another notification once it has been fully approved.</p>`
        }
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          If you have any questions about this investment, please contact our support team.
        </p>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Portfolio Investment Made on Your Behalf - ${portfolioName}`,
      html,
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${APP_DOMAIN}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background-color: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">🔐</span>
          </div>
          <h1 style="color: #1a1a1a; margin: 0;">Password Reset Request</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hi ${firstName || 'there'},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          We received a request to reset your password for your Reflux Capital account. Copy and paste the link below into your browser to create a new password.
        </p>
        <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; font-size: 14px; margin: 0 0 10px 0;">
            <strong>Important:</strong> This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
          <p style="color: #92400e; font-size: 13px; word-break: break-all; margin: 0;">${resetUrl}</p>
        </div>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request - Reflux Capital',
      html,
    });
  }

  async sendInvestmentEncouragementEmail(email: string, firstName: string): Promise<{ success: boolean; error?: string }> {
    const enabled = await storage.getSetting('email_welcome_enabled');
    if (enabled?.settingValue !== 'true') {
      console.log('Investment encouragement email skipped - email notifications disabled');
      return { success: true };
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0;">Ready to Start Your Investment Journey?</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Hey ${firstName || 'there'},
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Now that your account is all set up, why not begin your investment journey today? Whether you're interested in curated portfolios, stable bond yields, or exploring individual stocks, we've got options to match your goals and risk appetite.
        </p>
        
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1a1a1a; margin: 0 0 15px 0;">💡 Why Start Now?</h3>
          <ul style="color: #333; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Grow Your Savings:</strong> Invest in portfolios with strategic, diversified assets.</li>
            <li><strong>Daily Rewards:</strong> Log in each day to claim your $100 bonus.</li>
            <li><strong>Flexible Options:</strong> Start small or go big — it's completely up to you.</li>
          </ul>
        </div>
        
        <div style="background-color: #e4fe7b; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1a1a1a; margin: 0 0 15px 0;">🎯 Easy First Steps:</h3>
          <ol style="color: #333; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Fund Your Wallet</strong> – Deposit securely via crypto, bank transfer, or card.</li>
            <li><strong>Choose Your Portfolio</strong> – Browse our active strategies, from Growth to Income-focused plans.</li>
            <li><strong>Invest & Monitor</strong> – Watch your portfolio grow right from your dashboard.</li>
          </ol>
        </div>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          No matter where you are in your financial journey, we're here to support you every step of the way.
        </p>
        
        
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          If you have any questions or need guidance picking the right plan, don't hesitate to reply to this email or use the live chat available 24/7 on our website.
        </p>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 25px;">
          Here's to your success,
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Happy investing,<br>
          <strong>The Reflux Capital Team</strong>
        </p>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Ready to Start Your Investment Journey? 🚀',
      html,
    });
  }

  async sendAdminCreditNotification(email: string, firstName: string, amount: string): Promise<{ success: boolean; error?: string }> {
    const formatAmount = parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <span style="font-size: 28px;">💰</span>
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">Deposit Credited</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 15px;">Your account has been funded</p>
        </div>

        <div style="padding: 36px 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hi ${firstName || 'there'},
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 28px 0;">
            Great news! A deposit has been credited to your Reflux Capital account and is ready to use.
          </p>

          <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 28px; text-align: center; margin: 0 0 28px 0;">
            <p style="color: #166534; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0; font-weight: 600;">Amount Credited</p>
            <p style="color: #15803d; font-size: 42px; font-weight: 800; margin: 0; line-height: 1;">$${formatAmount}</p>
            <p style="color: #166534; font-size: 13px; margin: 8px 0 0 0;">USD — Available immediately</p>
          </div>

          <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
            These funds are now available in your wallet. You can start investing right away across our range of portfolios, bonds, and stocks.
          </p>

          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0;">
            Thank you for being a valued member of Reflux Capital.<br>
            <strong>The Reflux Capital Team</strong>
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `$${formatAmount} Deposited to Your Account | Reflux Capital`,
      html,
    });
  }

  async sendJointAccountPartnerJoined(
    primaryEmail: string,
    primaryName: string,
    partnerName: string,
    accountName: string,
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0;">Your Partner Has Joined!</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${primaryName},</p>
        <div style="background: #f0f9ff; border: 2px solid #bae6fd; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
          <p style="color: #0369a1; font-size: 18px; font-weight: 700; margin: 0 0 6px 0;">${partnerName}</p>
          <p style="color: #0284c7; font-size: 14px; margin: 0;">has accepted your invitation and joined</p>
          <p style="color: #0369a1; font-size: 16px; font-weight: 600; margin: 8px 0 0 0;">${accountName}</p>
        </div>
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          Your joint account is now active. All investments made by either of you will be visible on your shared dashboard.
        </p>
        ${getEmailFooter()}
      </div>
    `;
    return this.sendEmail({ to: primaryEmail, subject: `${partnerName} joined your joint account | Reflux Capital`, html });
  }

  async sendJointAccountWelcome(
    partnerEmail: string,
    partnerName: string,
    primaryName: string,
    accountName: string,
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0;">You've Joined a Joint Account!</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${partnerName},</p>
        <div style="background: #f0f9ff; border: 2px solid #bae6fd; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
          <p style="color: #0369a1; font-size: 14px; margin: 0 0 6px 0;">You are now a partner on</p>
          <p style="color: #0369a1; font-size: 20px; font-weight: 700; margin: 0;">${accountName}</p>
          <p style="color: #0284c7; font-size: 14px; margin: 8px 0 0 0;">Created by ${primaryName}</p>
        </div>
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          Your dashboard now shows a combined view of all investments made by you and ${primaryName}. Any investment either of you makes will appear on both dashboards.
        </p>
        ${getEmailFooter()}
      </div>
    `;
    return this.sendEmail({ to: partnerEmail, subject: `You've joined ${accountName} | Reflux Capital`, html });
  }

  async sendJointActivityNotification(
    email: string,
    recipientName: string,
    actorName: string,
    activityType: 'portfolio' | 'bond' | 'stock',
    assetName: string,
    amount: string,
    accountName: string,
  ): Promise<{ success: boolean; error?: string }> {
    const activityLabels: Record<string, string> = {
      portfolio: 'invested in a portfolio',
      bond: 'invested in a bond',
      stock: 'purchased stock',
    };
    const activityLabel = activityLabels[activityType] || 'made an investment';
    const formattedAmount = parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0;">New Joint Account Activity</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          Your partner <strong>${actorName}</strong> has ${activityLabel} on your joint account <strong>${accountName}</strong>.
        </p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Activity</td>
              <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0; text-transform: capitalize;">${activityType}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Asset</td>
              <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${assetName}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Amount</td>
              <td style="color: #059669; font-size: 16px; font-weight: 700; text-align: right; padding: 6px 0;">$${formattedAmount}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Made by</td>
              <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${actorName}</td>
            </tr>
          </table>
        </div>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          This investment is now visible on your shared dashboard.
        </p>
        ${getEmailFooter()}
      </div>
    `;
    return this.sendEmail({ to: email, subject: `${actorName} made an investment on your joint account | Reflux Capital`, html });
  }

  async sendBondPurchaseEmail(
    email: string,
    firstName: string,
    bondName: string,
    investedAmount: string,
    yieldPercent: string,
    maturityMonths: number,
  ): Promise<{ success: boolean; error?: string }> {
    const enabled = await storage.getSetting('email_welcome_enabled');
    if (enabled?.settingValue !== 'true') return { success: true };

    const maturityLabel = maturityMonths >= 12
      ? `${Math.round(maturityMonths / 12)} year${Math.round(maturityMonths / 12) !== 1 ? 's' : ''}`
      : `${maturityMonths} month${maturityMonths !== 1 ? 's' : ''}`;
    const expectedReturn = (parseFloat(investedAmount) * parseFloat(yieldPercent) / 100).toFixed(2);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background-color: #dbeafe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">🏦</span>
          </div>
          <h1 style="color: #1a1a1a; margin: 0;">Bond Investment Submitted</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${firstName || 'there'},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Your bond investment has been submitted and is now <strong>active</strong>.
        </p>
        <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">Bond Investment Details</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="color: #1e40af; padding: 5px 0;">Bond:</td><td style="color: #1e3a5f; font-weight: bold; text-align: right;">${bondName}</td></tr>
            <tr><td style="color: #1e40af; padding: 5px 0;">Invested:</td><td style="color: #1e3a5f; font-weight: bold; text-align: right;">$${parseFloat(investedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td style="color: #1e40af; padding: 5px 0;">Yield Rate:</td><td style="color: #1e3a5f; font-weight: bold; text-align: right;">${yieldPercent}% p.a.</td></tr>
            <tr><td style="color: #1e40af; padding: 5px 0;">Maturity:</td><td style="color: #1e3a5f; font-weight: bold; text-align: right;">${maturityLabel}</td></tr>
            <tr><td style="color: #1e40af; padding: 5px 0;">Expected Return:</td><td style="color: #1e3a5f; font-weight: bold; text-align: right;">$${parseFloat(expectedReturn).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
          </table>
        </div>
        <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            Your bond will mature in <strong>${maturityLabel}</strong>. At maturity, your principal plus accrued returns will be available in your account.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Bond Investment Confirmed — ${bondName}`,
      html,
    });
  }

  async sendStockPurchaseEmail(
    email: string,
    firstName: string,
    symbol: string,
    stockName: string,
    quantity: string,
    purchasePrice: string,
    totalAmount: string,
  ): Promise<{ success: boolean; error?: string }> {
    const enabled = await storage.getSetting('email_welcome_enabled');
    if (enabled?.settingValue !== 'true') return { success: true };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; background-color: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span style="font-size: 40px;">📈</span>
          </div>
          <h1 style="color: #1a1a1a; margin: 0;">Stock Purchase Submitted</h1>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${firstName || 'there'},</p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Your stock purchase is <strong>pending admin approval</strong>. You'll be notified once it's confirmed.
        </p>
        <div style="background-color: #fef9e7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin: 0 0 15px 0;">Purchase Details</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="color: #92400e; padding: 5px 0;">Stock:</td><td style="color: #78350f; font-weight: bold; text-align: right;">${symbol} — ${stockName}</td></tr>
            <tr><td style="color: #92400e; padding: 5px 0;">Shares:</td><td style="color: #78350f; font-weight: bold; text-align: right;">${quantity}</td></tr>
            <tr><td style="color: #92400e; padding: 5px 0;">Price per Share:</td><td style="color: #78350f; font-weight: bold; text-align: right;">$${parseFloat(purchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td style="color: #92400e; padding: 5px 0;">Total Invested:</td><td style="color: #78350f; font-weight: bold; text-align: right;">$${parseFloat(totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td style="color: #92400e; padding: 5px 0;">Status:</td><td style="color: #d97706; font-weight: bold; text-align: right;">Pending Approval</td></tr>
          </table>
        </div>
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #374151; font-size: 14px; margin: 0;">
            <strong>What happens next?</strong> Our team will review your purchase. Funds have been reserved from your balance and will be released back if the purchase is rejected.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Stock Purchase Submitted — ${symbol}`,
      html,
    });
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'Resend API key not configured' };
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const fromEmailSetting = await storage.getSetting('email_from_address');
      const fromEmail = fromEmailSetting?.settingValue || 'onboarding@resend.dev';
      
      const { error } = await resend.emails.send({
        from: `Reflux Capital <${fromEmail}>`,
        to: ['test@resend.dev'],
        subject: 'Test Connection',
        html: '<p>This is a test email to verify the connection.</p>',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const emailService = new EmailService();
