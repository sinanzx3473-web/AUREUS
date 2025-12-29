import nodemailer from 'nodemailer';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { EmailConfig, WebhookPayload } from '../types';
import axios from 'axios';

export class NotificationService {
  private transporter: nodemailer.Transporter;
  private webhookEndpoints: string[];

  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Parse webhook endpoints
    this.webhookEndpoints = (process.env.WEBHOOK_ENDPOINTS || '')
      .split(',')
      .filter(Boolean);
  }

  /**
   * Send email notification
   */
  async sendEmail(config: EmailConfig): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@takumi.io',
        to: config.to,
        subject: config.subject,
        html: config.html,
        text: config.text,
      });

      logger.info('Email sent', { messageId: info.messageId, to: config.to });
      return true;
    } catch (error) {
      logger.error('Failed to send email', { error, to: config.to });
      return false;
    }
  }

  /**
   * Create in-app notification
   */
  async createNotification(
    userAddress: string,
    type: string,
    title: string,
    message: string,
    data: string = '{}'
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO notifications (user_address, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [userAddress, type, title, message, data]
      );

      logger.info('Notification created', { userAddress, type });
    } catch (error) {
      logger.error('Failed to create notification', error);
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(payload: WebhookPayload): Promise<void> {
    const webhookSecret = process.env.WEBHOOK_SECRET || '';

    for (const endpoint of this.webhookEndpoints) {
      try {
        await axios.post(endpoint, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': webhookSecret,
          },
          timeout: 5000,
        });

        logger.info('Webhook sent', { endpoint, event: payload.event });
      } catch (error) {
        logger.error('Failed to send webhook', { endpoint, error });
      }
    }
  }

  /**
   * Notify on skill verification
   */
  async notifySkillVerified(
    userAddress: string,
    skillName: string,
    verifierName: string
  ): Promise<void> {
    const title = 'Skill Verified!';
    const message = `Your skill "${skillName}" has been verified by ${verifierName}`;

    // Create in-app notification
    await this.createNotification(userAddress, 'skill_verified', title, message, JSON.stringify({
      skillName,
      verifierName,
    }));

    // Send webhook
    await this.sendWebhook({
      event: 'skill.verified',
      data: { userAddress, skillName, verifierName },
      timestamp: Date.now(),
    });

    // Optionally send email (if user has email configured)
    // await this.sendEmail({ ... });
  }

  /**
   * Notify on new endorsement
   */
  async notifyEndorsementReceived(
    userAddress: string,
    skillName: string,
    endorserAddress: string,
    rating: number
  ): Promise<void> {
    const title = 'New Endorsement!';
    const message = `You received a ${rating}-star endorsement for "${skillName}"`;

    await this.createNotification(
      userAddress,
      'endorsement_received',
      title,
      message,
      JSON.stringify({ skillName, endorserAddress, rating })
    );

    await this.sendWebhook({
      event: 'endorsement.received',
      data: { userAddress, skillName, endorserAddress, rating },
      timestamp: Date.now(),
    });
  }

  /**
   * Notify on verification request
   */
  async notifyVerificationRequest(
    verifierAddress: string,
    requesterAddress: string,
    skillName: string
  ): Promise<void> {
    const title = 'Verification Request';
    const message = `New verification request for skill "${skillName}"`;

    await this.createNotification(
      verifierAddress,
      'verification_request',
      title,
      message,
      JSON.stringify({ requesterAddress, skillName })
    );

    await this.sendWebhook({
      event: 'verification.requested',
      data: { verifierAddress, requesterAddress, skillName },
      timestamp: Date.now(),
    });
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userAddress: string,
    limit: number = 20,
    offset: number = 0
  ) {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE user_address = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userAddress, limit, offset]
    );

    return result.rows;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userAddress: string): Promise<boolean> {
    const result = await query(
      `UPDATE notifications 
       SET is_read = true, read_at = NOW() 
       WHERE id = $1 AND user_address = $2`,
      [notificationId, userAddress]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userAddress: string): Promise<number> {
    const result = await query(
      `UPDATE notifications 
       SET is_read = true, read_at = NOW() 
       WHERE user_address = $1 AND is_read = false`,
      [userAddress]
    );

    return result.rowCount ?? 0;
  }
}

export default new NotificationService();
