/**
 * Email service with retry logic and template support
 */

import { Resend } from 'resend';
import { config } from '../../config.js';
import { createModuleLogger } from '../logger.js';
import type {
  EmailParams,
  EmailSendResult,
  MagicLinkEmailData,
  MatchNotificationEmailData,
  EventReminderEmailData,
  WelcomeEmailData,
} from './types.js';
import { magicLinkTemplate } from './templates/magic-link.js';
import { matchNotificationTemplate } from './templates/match-notification.js';
import { eventReminderTemplate } from './templates/event-reminder.js';
import { welcomeTemplate } from './templates/welcome.js';

const logger = createModuleLogger('email-service');

export class EmailService {
  private resend: Resend | null = null;
  private isConfigured: boolean = false;

  constructor() {
    if (config.RESEND_API_KEY) {
      this.resend = new Resend(config.RESEND_API_KEY);
      this.isConfigured = true;
      logger.info('Email service initialized with Resend');
    } else {
      logger.warn('Email service not configured (missing RESEND_API_KEY)');
    }
  }

  /**
   * Check if email service is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Send email with retry logic
   */
  async sendWithRetry(params: EmailParams, maxRetries = 3): Promise<EmailSendResult> {
    if (!this.isConfigured || !this.resend) {
      if (config.NODE_ENV === 'production') {
        logger.error({ to: params.to }, 'Cannot send email: service not configured');
        return {
          success: false,
          error: 'Email service not configured',
        };
      }

      // Development mode: log email instead of sending
      logger.info(
        {
          to: params.to,
          subject: params.subject,
          from: params.from || config.FROM_EMAIL,
        },
        'Email would be sent (dev mode)'
      );
      return {
        success: true,
        messageId: `dev-${Date.now()}`,
      };
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;

      try {
        logger.debug(
          {
            to: params.to,
            subject: params.subject,
            attempt,
            maxRetries,
          },
          'Attempting to send email'
        );

        const result = await this.resend.emails.send({
          from: params.from || config.FROM_EMAIL,
          to: Array.isArray(params.to) ? params.to : [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text,
          replyTo: params.replyTo,
          tags: params.tags,
        });

        logger.info(
          {
            to: params.to,
            subject: params.subject,
            messageId: result.data?.id,
            attempt,
          },
          'Email sent successfully'
        );

        return {
          success: true,
          messageId: result.data?.id,
          retries: attempt - 1,
        };
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          {
            error: lastError,
            to: params.to,
            subject: params.subject,
            attempt,
            maxRetries,
          },
          'Email send attempt failed'
        );

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          logger.debug({ delay, attempt }, 'Waiting before retry');
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(
      {
        error: lastError,
        to: params.to,
        subject: params.subject,
        attempts: maxRetries,
      },
      'Failed to send email after all retries'
    );

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      retries: maxRetries,
    };
  }

  /**
   * Send magic link email
   */
  async sendMagicLink(data: MagicLinkEmailData): Promise<EmailSendResult> {
    const { subject, html, text } = magicLinkTemplate(data);

    return this.sendWithRetry({
      to: data.email,
      subject,
      html,
      text,
      tags: [
        { name: 'type', value: 'magic-link' },
        { name: 'language', value: data.language },
      ],
    });
  }

  /**
   * Send match notification email
   */
  async sendMatchNotification(data: MatchNotificationEmailData): Promise<EmailSendResult> {
    const { subject, html, text } = matchNotificationTemplate(data);

    return this.sendWithRetry({
      to: data.recipientEmail,
      subject,
      html,
      text,
      tags: [
        { name: 'type', value: 'match-notification' },
        { name: 'language', value: data.language },
      ],
    });
  }

  /**
   * Send event reminder email
   */
  async sendEventReminder(data: EventReminderEmailData): Promise<EmailSendResult> {
    const { subject, html, text } = eventReminderTemplate(data);

    return this.sendWithRetry({
      to: data.recipientEmail,
      subject,
      html,
      text,
      tags: [
        { name: 'type', value: 'event-reminder' },
        { name: 'language', value: data.language },
      ],
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcome(data: WelcomeEmailData): Promise<EmailSendResult> {
    const { subject, html, text } = welcomeTemplate(data);

    return this.sendWithRetry({
      to: data.recipientEmail,
      subject,
      html,
      text,
      tags: [
        { name: 'type', value: 'welcome' },
        { name: 'language', value: data.language },
      ],
    });
  }

  /**
   * Send custom email
   */
  async send(params: EmailParams): Promise<EmailSendResult> {
    return this.sendWithRetry(params);
  }
}

// Singleton instance
export const emailService = new EmailService();
