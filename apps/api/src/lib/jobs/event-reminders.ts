/**
 * Scheduled job for sending event reminders
 */

import cron from 'node-cron';
import { query } from '../../db/pool.js';
import { createModuleLogger } from '../logger.js';
import { emailService } from '../email/index.js';

const logger = createModuleLogger('event-reminders');

interface EventAttendee {
  event_id: string;
  event_title: string;
  event_starts_at: Date;
  event_city: string;
  user_id: string;
  user_email: string;
  user_name: string;
}

/**
 * Send reminders for events starting in 24 hours
 */
async function sendEventReminders() {
  try {
    logger.info('Starting event reminder job');

    // Find events starting in 24 hours (±1 hour window)
    const result = await query<EventAttendee>(
      `SELECT 
        e.id as event_id,
        e.title as event_title,
        e.starts_at as event_starts_at,
        e.city as event_city,
        ea.user_id,
        u.email as user_email,
        p.name as user_name
      FROM events e
      JOIN event_attendees ea ON ea.event_id = e.id
      JOIN users u ON u.id = ea.user_id
      JOIN profiles p ON p.user_id = u.id
      WHERE e.starts_at BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'
        AND ea.status = 'going'
        AND u.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM event_reminders_sent ers 
          WHERE ers.event_id = e.id AND ers.user_id = ea.user_id
        )`,
      []
    );

    if (result.rows.length === 0) {
      logger.info('No event reminders to send');
      return;
    }

    logger.info({ count: result.rows.length }, 'Sending event reminders');

    // Send reminders
    const promises = result.rows.map(async (attendee) => {
      try {
        await emailService.sendEventReminder({
          recipientEmail: attendee.user_email,
          recipientName: attendee.user_name,
          eventTitle: attendee.event_title,
          eventDate: new Date(attendee.event_starts_at),
          eventLocation: attendee.event_city,
          eventUrl: `https://culturematch.com/event/${attendee.event_id}`,
          language: 'en', // TODO: detect from user preferences
        });

        // Mark reminder as sent
        await query(
          `INSERT INTO event_reminders_sent (event_id, user_id, sent_at) 
           VALUES ($1, $2, now())
           ON CONFLICT (event_id, user_id) DO NOTHING`,
          [attendee.event_id, attendee.user_id]
        );

        logger.debug(
          {
            eventId: attendee.event_id,
            userId: attendee.user_id,
            email: attendee.user_email,
          },
          'Event reminder sent'
        );
      } catch (error) {
        logger.error(
          {
            error,
            eventId: attendee.event_id,
            userId: attendee.user_id,
          },
          'Failed to send event reminder'
        );
      }
    });

    await Promise.allSettled(promises);

    logger.info({ count: result.rows.length }, 'Event reminder job completed');
  } catch (error) {
    logger.error({ error }, 'Event reminder job failed');
  }
}

/**
 * Start the event reminder cron job
 * Runs every hour
 */
export function startEventReminderJob() {
  // Run every hour at minute 0
  const job = cron.schedule('0 * * * *', sendEventReminders, {
    timezone: 'UTC',
  });

  logger.info('Event reminder job scheduled (runs every hour)');

  return job;
}

/**
 * Run event reminders immediately (for testing)
 */
export async function runEventRemindersNow() {
  logger.info('Running event reminders manually');
  await sendEventReminders();
}
