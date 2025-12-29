import axios from 'axios';
import { logger } from '../utils/logger';
import { query } from '../config/database';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

interface WebhookSubscription {
  id: number;
  url: string;
  events: string[];
  secret?: string;
  is_active: boolean;
}

class WebhookService {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  /**
   * Send webhook to all subscribed endpoints
   */
  async sendWebhook(event: string, data: any): Promise<void> {
    try {
      // Get all active webhook subscriptions for this event
      const result = await query(
        `SELECT * FROM webhook_subscriptions 
         WHERE is_active = true 
         AND $1 = ANY(events)`,
        [event]
      );

      const subscriptions: WebhookSubscription[] = result.rows;

      if (subscriptions.length === 0) {
        logger.debug(`No webhook subscriptions for event: ${event}`);
        return;
      }

      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      // Send webhooks in parallel
      await Promise.allSettled(
        subscriptions.map(subscription => 
          this.deliverWebhook(subscription, payload)
        )
      );
    } catch (error) {
      logger.error('Error sending webhooks', { event, error });
    }
  }

  /**
   * Deliver webhook to a single endpoint with retry logic
   */
  private async deliverWebhook(
    subscription: WebhookSubscription,
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<void> {
    try {
      const headers: any = {
        'Content-Type': 'application/json',
        'X-Takumi-Event': payload.event,
        'X-Takumi-Timestamp': payload.timestamp,
      };

      // Add signature if secret is configured
      if (subscription.secret) {
        const crypto = require('crypto');
        const signature = crypto
          .createHmac('sha256', subscription.secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers['X-Takumi-Signature'] = signature;
      }

      const response = await axios.post(subscription.url, payload, {
        headers,
        timeout: 10000, // 10 seconds
      });

      logger.info('Webhook delivered successfully', {
        subscriptionId: subscription.id,
        event: payload.event,
        status: response.status,
      });

      // Log successful delivery
      await this.logWebhookDelivery(subscription.id, payload, true, response.status);
    } catch (error: any) {
      logger.error('Webhook delivery failed', {
        subscriptionId: subscription.id,
        event: payload.event,
        attempt,
        error: error.message,
      });

      // Retry logic
      if (attempt < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        return this.deliverWebhook(subscription, payload, attempt + 1);
      }

      // Log failed delivery after all retries
      await this.logWebhookDelivery(
        subscription.id,
        payload,
        false,
        error.response?.status,
        error.message
      );
    }
  }

  /**
   * Log webhook delivery attempt
   */
  private async logWebhookDelivery(
    subscriptionId: number,
    payload: WebhookPayload,
    success: boolean,
    statusCode?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO webhook_logs 
         (subscription_id, event_name, payload, success, status_code, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          subscriptionId,
          payload.event,
          JSON.stringify(payload),
          success,
          statusCode,
          errorMessage,
        ]
      );
    } catch (error) {
      logger.error('Failed to log webhook delivery', error);
    }
  }

  /**
   * Register a new webhook subscription
   */
  async registerWebhook(
    url: string,
    events: string[],
    secret?: string,
    apiKeyId?: number
  ): Promise<number> {
    const result = await query(
      `INSERT INTO webhook_subscriptions (url, events, secret, api_key_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [url, events, secret, apiKeyId]
    );

    logger.info('Webhook registered', { id: result.rows[0].id, url, events });
    return result.rows[0].id;
  }

  /**
   * Unregister a webhook subscription
   */
  async unregisterWebhook(id: number): Promise<void> {
    await query(
      'UPDATE webhook_subscriptions SET is_active = false WHERE id = $1',
      [id]
    );

    logger.info('Webhook unregistered', { id });
  }

  /**
   * Get webhook delivery logs
   */
  async getWebhookLogs(subscriptionId: number, limit: number = 100) {
    const result = await query(
      `SELECT * FROM webhook_logs 
       WHERE subscription_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [subscriptionId, limit]
    );

    return result.rows;
  }
}

export const webhookService = new WebhookService();

// Supported webhook events
export const WEBHOOK_EVENTS = {
  PROFILE_CREATED: 'profile.created',
  SKILL_ADDED: 'skill.added',
  SKILL_VERIFIED: 'skill.verified',
  ENDORSEMENT_CREATED: 'endorsement.created',
  VERIFIER_REGISTERED: 'verifier.registered',
  CLAIM_CREATED: 'claim.created',
  CLAIM_APPROVED: 'claim.approved',
  CLAIM_REJECTED: 'claim.rejected',
  BOUNTY_CLAIMED: 'bounty.claimed',
} as const;
