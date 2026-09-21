/**
 * Magic link email template
 */

import { baseTemplate } from './base.js';
import type { MagicLinkEmailData } from '../types.js';

const translations = {
  en: {
    subject: 'Your CultureMatch login link',
    title: 'Sign in to CultureMatch',
    greeting: 'Hello!',
    intro: 'Click the button below to sign in to your CultureMatch account:',
    button: 'Sign In',
    expires: (minutes: number) => `This link will expire in ${minutes} minutes.`,
    alternative: 'Or copy and paste this link into your browser:',
    notYou: "If you didn't request this email, you can safely ignore it.",
    footer: 'You received this email because someone requested a login link for your email address.',
  },
  ru: {
    subject: 'Ваша ссылка для входа в CultureMatch',
    title: 'Войдите в CultureMatch',
    greeting: 'Здравствуйте!',
    intro: 'Нажмите на кнопку ниже, чтобы войти в ваш аккаунт CultureMatch:',
    button: 'Войти',
    expires: (minutes: number) => `Ссылка действительна ${minutes} минут.`,
    alternative: 'Или скопируйте и вставьте эту ссылку в браузер:',
    notYou: 'Если вы не запрашивали это письмо, можете его проигнорировать.',
    footer: 'Вы получили это письмо, потому что кто-то запросил ссылку для входа на ваш email.',
  },
};

export function magicLinkTemplate(data: MagicLinkEmailData): { subject: string; html: string; text: string } {
  const t = translations[data.language];

  const content = `
    <h2 class="email-title">${t.title}</h2>
    <p class="email-text">${t.greeting}</p>
    <p class="email-text">${t.intro}</p>
    
    <div style="text-align: center;">
      <a href="${data.link}" class="email-button">${t.button}</a>
    </div>

    <div class="info-box">
      <p class="info-box-text">
        ⏱️ ${t.expires(data.expiresInMinutes)}
      </p>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: #888888;">
      ${t.alternative}
    </p>
    <p class="email-text" style="font-size: 14px; word-break: break-all;">
      <a href="${data.link}" style="color: #667eea;">${data.link}</a>
    </p>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: #888888;">
      ${t.notYou}
    </p>
  `;

  const html = baseTemplate({
    title: t.title,
    previewText: t.intro,
    content,
    footerText: t.footer,
  });

  const text = `
${t.title}

${t.greeting}

${t.intro}

${data.link}

${t.expires(data.expiresInMinutes)}

${t.notYou}

---
${t.footer}
© ${new Date().getFullYear()} CultureMatch
  `.trim();

  return {
    subject: t.subject,
    html,
    text,
  };
}
