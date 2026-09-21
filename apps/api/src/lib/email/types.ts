/**
 * Email types and interfaces
 */

export type Language = 'en' | 'ru';

export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface MagicLinkEmailData {
  email: string;
  link: string;
  expiresInMinutes: number;
  language: Language;
}

export interface MatchNotificationEmailData {
  recipientEmail: string;
  recipientName: string;
  matchName: string;
  matchPhotoUrl?: string;
  compatibilityScore: number;
  language: Language;
}

export interface EventReminderEmailData {
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  eventUrl: string;
  language: Language;
}

export interface MessageNotificationEmailData {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  messagePreview: string;
  conversationUrl: string;
  language: Language;
}

export interface WelcomeEmailData {
  recipientEmail: string;
  recipientName: string;
  language: Language;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retries?: number;
}
