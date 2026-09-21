/**
 * Match notification email template
 */

import { baseTemplate } from './base.js';
import type { MatchNotificationEmailData } from '../types.js';

const translations = {
  en: {
    subject: (name: string) => `You matched with ${name}! 🎉`,
    title: "It's a Match!",
    greeting: (name: string) => `Hi ${name}!`,
    intro: (matchName: string) => `Great news! You and ${matchName} liked each other.`,
    compatibility: (score: number) => `Your compatibility score: ${score}%`,
    cta: 'Start chatting now and see where this connection takes you!',
    button: 'Send a Message',
    tip: '💡 Tip: Break the ice with a question about their culture or interests!',
    footer: 'You received this email because you have match notifications enabled.',
  },
  ru: {
    subject: (name: string) => `У вас совпадение с ${name}! 🎉`,
    title: 'Это совпадение!',
    greeting: (name: string) => `Привет, ${name}!`,
    intro: (matchName: string) => `Отличные новости! Вы и ${matchName} понравились друг другу.`,
    compatibility: (score: number) => `Ваша совместимость: ${score}%`,
    cta: 'Начните общаться прямо сейчас и посмотрите, куда приведет это знакомство!',
    button: 'Написать сообщение',
    tip: '💡 Совет: Начните разговор с вопроса о культуре или интересах!',
    footer: 'Вы получили это письмо, потому что у вас включены уведомления о совпадениях.',
  },
};

export function matchNotificationTemplate(
  data: MatchNotificationEmailData
): { subject: string; html: string; text: string } {
  const t = translations[data.language];

  const photoSection = data.matchPhotoUrl
    ? `
    <div style="text-align: center; margin: 30px 0;">
      <img src="${data.matchPhotoUrl}" alt="${data.matchName}" 
           style="width: 120px; height: 120px; border-radius: 60px; object-fit: cover; border: 4px solid #667eea;">
    </div>
  `
    : '';

  const content = `
    <h2 class="email-title">${t.title}</h2>
    <p class="email-text">${t.greeting(data.recipientName)}</p>
    
    ${photoSection}
    
    <p class="email-text" style="font-size: 18px; text-align: center; font-weight: 600;">
      ${t.intro(data.matchName)}
    </p>

    <div class="info-box" style="text-align: center; background: linear-gradient(135deg, #f0f4ff 0%, #e8f0ff 100%);">
      <p class="info-box-text" style="font-size: 18px; font-weight: 600; color: #667eea;">
        ${t.compatibility(data.compatibilityScore)}
      </p>
    </div>

    <p class="email-text" style="text-align: center;">
      ${t.cta}
    </p>

    <div style="text-align: center;">
      <a href="https://culturematch.com/chat" class="email-button">${t.button}</a>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: #888888; text-align: center;">
      ${t.tip}
    </p>
  `;

  const html = baseTemplate({
    title: t.title,
    previewText: t.intro(data.matchName),
    content,
    footerText: t.footer,
  });

  const text = `
${t.title}

${t.greeting(data.recipientName)}

${t.intro(data.matchName)}

${t.compatibility(data.compatibilityScore)}

${t.cta}

${t.button}: https://culturematch.com/chat

${t.tip}

---
${t.footer}
© ${new Date().getFullYear()} CultureMatch
  `.trim();

  return {
    subject: t.subject(data.matchName),
    html,
    text,
  };
}
