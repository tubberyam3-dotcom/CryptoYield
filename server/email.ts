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
        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_DOMAIN}/dashboard" 
             style="background-color: #e4fe7b; color: #1a1a1a; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
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
        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_DOMAIN}/dashboard" 
             style="background-color: #e4fe7b; color: #1a1a1a; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Go to Dashboard
          </a>
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
          We received a request to reset your password for your Reflux Capital account. Click the button below to create a new password.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #e4fe7b; color: #1a1a1a; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
        </p>
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
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_DOMAIN}/dashboard" 
             style="background-color: #e4fe7b; color: #1a1a1a; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
            👉 Log In to Your Dashboard
          </a>
        </div>
        
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
