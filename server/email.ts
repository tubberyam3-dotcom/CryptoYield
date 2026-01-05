import { Resend } from 'resend';
import { storage } from './storage';

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

  async initialize(): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log('Email service not configured - missing RESEND_API_KEY');
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
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'Email service not configured - missing API key' };
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const fromEmailSetting = await storage.getSetting('email_from_address');
      const fromNameSetting = await storage.getSetting('email_from_name');
      
      const fromEmail = fromEmailSetting?.settingValue || 'onboarding@resend.dev';
      const fromName = fromNameSetting?.settingValue || 'Reflux Capital';

      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      });

      if (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
      }

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
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/dashboard" 
             style="background-color: #e4fe7b; color: #1a1a1a; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          If you have any questions, feel free to reach out to our support team.
        </p>
        <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Reflux Capital. All rights reserved.
          </p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Reflux Capital',
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
        <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Reflux Capital. All rights reserved.
          </p>
        </div>
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
        <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Reflux Capital. All rights reserved.
          </p>
        </div>
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
        <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Reflux Capital. All rights reserved.
          </p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: '🎉 Daily Rewards Claimed - Reflux Capital',
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
