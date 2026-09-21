/**
 * Development-only routes for testing
 */

import { Router } from "express";
import { z } from "zod";
import { config } from "../../config.js";
import { asyncHandler, BadRequestError } from "../../http/errors.js";
import { emailService } from "../../lib/email/index.js";
import { runEventRemindersNow } from "../../lib/jobs/index.js";
import { createModuleLogger } from "../../lib/logger.js";

const logger = createModuleLogger("dev");

export const devRouter = Router();

// Only enable in development
if (config.NODE_ENV !== "production") {
  /**
   * Test magic link email
   */
  devRouter.post(
    "/test-email/magic-link",
    asyncHandler(async (req, res) => {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);

      const result = await emailService.sendMagicLink({
        email,
        link: "https://culturematch.com/auth/verify?token=test-token-123",
        expiresInMinutes: 15,
        language: "en",
      });

      res.json(result);
    })
  );

  /**
   * Test match notification email
   */
  devRouter.post(
    "/test-email/match",
    asyncHandler(async (req, res) => {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);

      const result = await emailService.sendMatchNotification({
        recipientEmail: email,
        recipientName: "Alex",
        matchName: "Maria",
        compatibilityScore: 87,
        language: "en",
      });

      res.json(result);
    })
  );

  /**
   * Test welcome email
   */
  devRouter.post(
    "/test-email/welcome",
    asyncHandler(async (req, res) => {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);

      const result = await emailService.sendWelcome({
        recipientEmail: email,
        recipientName: "Alex",
        language: "en",
      });

      res.json(result);
    })
  );

  /**
   * Test event reminder email
   */
  devRouter.post(
    "/test-email/event-reminder",
    asyncHandler(async (req, res) => {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await emailService.sendEventReminder({
        recipientEmail: email,
        recipientName: "Alex",
        eventTitle: "Cultural Exchange Meetup",
        eventDate: tomorrow,
        eventLocation: "Central Park, New York",
        eventUrl: "https://culturematch.com/event/123",
        language: "en",
      });

      res.json(result);
    })
  );

  /**
   * Run event reminders job manually
   */
  devRouter.post(
    "/jobs/event-reminders",
    asyncHandler(async (req, res) => {
      logger.info("Running event reminders job manually");
      await runEventRemindersNow();
      res.json({ ok: true, message: "Event reminders job completed" });
    })
  );

  /**
   * Check email service status
   */
  devRouter.get(
    "/email/status",
    asyncHandler(async (req, res) => {
      res.json({
        configured: emailService.isReady(),
        resendApiKey: config.RESEND_API_KEY ? "configured" : "missing",
        fromEmail: config.FROM_EMAIL,
      });
    })
  );

  logger.info("Development routes enabled");
} else {
  // In production, return 404 for all dev routes
  devRouter.use((req, res) => {
    throw new BadRequestError("Development routes not available in production");
  });
}
