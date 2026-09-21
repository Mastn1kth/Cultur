/**
 * Event reminder email template
 */

import { baseTemplate } from './base.js';
import type { EventReminderEmailData } from '../types.js';

const translations = {
  en: {
    subject: (title: string) => `Reminder: ${title} is coming up!`,
    title: 'Event Reminder',
    greeting: (name: string) => `Hi ${name}!`,
    intro: (title: string) => `This is a friendly reminder that "${title}" is happening soon.`,
    when: 'When:',
    where: 'Where:',
    button: 'View Event Details',
    addCalendar: 'Add to Calendar',
    seeYou: "We're looking forward to seeing you there!",
    questions: 'Have questions? Contact the event organizer through the event page.',
    footer: 'You received this email because you RSVP\'d to this event.',
  },
  ru: {
    subject: (title: string) => `Напоминание: "${title}" скоро начнется!`,
    title: 'Напоминание о событии',
    greeting: (name: string) => `Привет, ${name}!`,
    intro: (title: string) => `Напоминаем, что событие "${title}" скоро начнется.`,
    when: 'Когда:',
    where: 'Где:',
    button: 'Детали события',
    addCalendar: 'Добавить в календарь',
    seeYou: 'Ждем вас на событии!',
    questions: 'Есть вопросы? Свяжитесь с организатором через страницу события.',
    footer: 'Вы получили это письмо, потому что подтвердили участие в событии.',
  },
};

function formatDate(date: Date, language: 'en' | 'ru'): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', options);
}

export function eventReminderTemplate(
  data: EventReminderEmailData
): { subject: string; html: string; text: string } {
  const t = translations[data.language];
  const formattedDate = formatDate(data.eventDate, data.language);

  const content = `
    <h2 class="email-title">${t.title}</h2>
    <p class="email-text">${t.greeting(data.recipientName)}</p>
    <p class="email-text">${t.intro(data.eventTitle)}</p>

    <div class="info-box" style="background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%); border-left-color: #f56565;">
      <p class="info-box-text" style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #1a1a1a;">
        ${data.eventTitle}
      </p>
      
      <p class="info-box-text" style="margin: 12px 0;">
        <strong>📅 ${t.when}</strong><br>
        ${formattedDate}
      </p>
      
      <p class="info-box-text" style="margin: 12px 0;">
        <strong>📍 ${t.where}</strong><br>
        ${data.eventLocation}
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.eventUrl}" class="email-button">${t.button}</a>
    </div>

    <p class="email-text" style="text-align: center;">
      ${t.seeYou}
    </p>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: #888888; text-align: center;">
      ${t.questions}
    </p>
  `;

  const html = baseTemplate({
    title: t.title,
    previewText: t.intro(data.eventTitle),
    content,
    footerText: t.footer,
  });

  const text = `
${t.title}

${t.greeting(data.recipientName)}

${t.intro(data.eventTitle)}

${data.eventTitle}

📅 ${t.when}
${formattedDate}

📍 ${t.where}
${data.eventLocation}

${t.button}: ${data.eventUrl}

${t.seeYou}

${t.questions}

---
${t.footer}
© ${new Date().getFullYear()} CultureMatch
  `.trim();

  return {
    subject: t.subject(data.eventTitle),
    html,
    text,
  };
}
