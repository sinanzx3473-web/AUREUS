import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EndorsementRequestData {
  endorseeName: string;
  endorseeAddress: string;
  endorserName: string;
  endorserAddress: string;
  skillName: string;
  message?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.EMAIL_ENABLED === 'true';
    
    if (this.enabled) {
      this.initializeTransporter();
    } else {
      logger.info('Email service disabled');
    }
  }

  private initializeTransporter() {
    try {
      // Validate required SMTP environment variables
      if (!process.env.SMTP_HOST) {
        throw new Error('SMTP_HOST environment variable is required when EMAIL_ENABLED=true');
      }
      if (!process.env.SMTP_USER) {
        throw new Error('SMTP_USER environment variable is required when EMAIL_ENABLED=true');
      }
      if (!process.env.SMTP_PASS) {
        throw new Error('SMTP_PASS environment variable is required when EMAIL_ENABLED=true');
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      logger.info('Email service initialized');
    } catch (error) {
      logger.error('Failed to initialize email service', error);
      this.enabled = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      logger.warn('Email service not enabled, skipping email send');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info('Email sent successfully', { messageId: info.messageId, to: options.to });
      return true;
    } catch (error) {
      logger.error('Failed to send email', { error, to: options.to });
      return false;
    }
  }

  async sendEndorsementRequest(data: EndorsementRequestData, recipientEmail: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .skill-badge { display: inline-block; background: #667eea; color: white; padding: 8px 16px; border-radius: 20px; margin: 10px 0; }
            .message-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 New Endorsement Request</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${data.endorseeName}</strong>,</p>
              
              <p><strong>${data.endorserName}</strong> has requested to endorse your skill on Takumi!</p>
              
              <div class="skill-badge">
                ${data.skillName}
              </div>
              
              ${data.message ? `
                <div class="message-box">
                  <strong>Message:</strong>
                  <p>${data.message}</p>
                </div>
              ` : ''}
              
              <p><strong>Endorser Details:</strong></p>
              <ul>
                <li>Name: ${data.endorserName}</li>
                <li>Address: <code>${data.endorserAddress}</code></li>
              </ul>
              
              <a href="${process.env.FRONTEND_URL}/profile/${data.endorseeAddress}" class="button">
                View Your Profile
              </a>
              
              <div class="footer">
                <p>This is an automated notification from Takumi - Decentralized Skills Verification Platform</p>
                <p>If you didn't expect this email, you can safely ignore it.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
New Endorsement Request

Hello ${data.endorseeName},

${data.endorserName} has requested to endorse your skill: ${data.skillName}

${data.message ? `Message: ${data.message}\n` : ''}

Endorser: ${data.endorserName} (${data.endorserAddress})

View your profile: ${process.env.FRONTEND_URL}/profile/${data.endorseeAddress}

---
Takumi - Decentralized Skills Verification Platform
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `New Endorsement Request for ${data.skillName}`,
      html,
      text,
    });
  }

  async sendSkillVerificationNotification(
    userName: string,
    userEmail: string,
    skillName: string,
    verifierName: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Skill Verified!</h1>
            </div>
            <div class="content">
              <div class="success-icon">🎉</div>
              
              <p>Hello <strong>${userName}</strong>,</p>
              
              <p>Great news! Your skill <strong>${skillName}</strong> has been verified by <strong>${verifierName}</strong>.</p>
              
              <p>This verification adds credibility to your profile and helps others trust your expertise.</p>
              
              <div class="footer">
                <p>Takumi - Decentralized Skills Verification Platform</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: `Skill Verified: ${skillName}`,
      html,
    });
  }

  async sendBountyClaimNotification(
    data: { userName: string; skillName: string; amount: string; transactionHash: string },
    recipientEmail: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .amount-box { background: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; text-align: center; }
            .amount { font-size: 32px; font-weight: bold; color: #f59e0b; }
            .tx-hash { font-family: monospace; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Bounty Claimed Successfully!</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${data.userName}</strong>,</p>
              
              <p>Congratulations! You have successfully claimed your bounty for <strong>${data.skillName}</strong>.</p>
              
              <div class="amount-box">
                <div class="amount">${data.amount} USDC</div>
                <p style="margin: 5px 0; color: #666;">Bounty Amount</p>
              </div>
              
              <p><strong>Transaction Hash:</strong></p>
              <div class="tx-hash">${data.transactionHash}</div>
              
              <p>The USDC tokens have been transferred to your wallet. You can verify the transaction on the blockchain explorer.</p>
              
              <div class="footer">
                <p>Takumi - Decentralized Skills Verification Platform</p>
                <p>Keep building your skills and earning bounties!</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Bounty Claimed Successfully!

Hello ${data.userName},

Congratulations! You have successfully claimed your bounty for ${data.skillName}.

Amount: ${data.amount} USDC
Transaction Hash: ${data.transactionHash}

The USDC tokens have been transferred to your wallet.

---
Takumi - Decentralized Skills Verification Platform
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `Bounty Claimed: ${data.amount} USDC for ${data.skillName}`,
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
