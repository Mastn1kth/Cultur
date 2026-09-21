/**
 * Welcome email template
 */

import { baseTemplate } from './base.js';
import type { WelcomeEmailData } from '../types.js';

const translations = {
  en: {
    subject: 'Welcome to CultureMatch! 🌍',
    title: 'Welcome to CultureMatch!',
    greeting: (name: string) => `Hi ${name}!`,
    intro: "We're excited to have you join our community of people connecting across cultures.",
    whatNext: "Here's what you can do next:",
    step1Title: '1. Complete Your Profile',
    step1Text: "Add photos and share your cultural background, interests, and what you're looking for.",
    step2Title: '2. Discover People',
    step2Text: 'Browse profiles of people near you who share your interests and cultural values.',
    step3Title: '3. Join Events & Communities',
    step3Text: 'Find local events and small communities to meet people in person.',
    button: 'Complete Your Profile',
    tips: 'Tips for Success:',
    tip1: '✨ Be authentic - share your real interests and cultural experiences',
    tip2: '🌍 Be open-minded - embrace different perspectives and backgrounds',
    tip3: "💬 Start conversations - don't be shy to reach out first",
    help: 'Need help? Check out our',
    helpLink: 'Getting Started Guide',
    footer: 'Welcome to the CultureMatch community!',
  },
  ru: {
    subject: 'Добро пожаловать в CultureMatch! 🌍',
    title: 'Добро пожаловать в CultureMatch!',
    greeting: (name: string) => `Привет, ${name}!`,
    intro: 'Мы рады, что вы присоединились к нашему сообществу людей, которые знакомятся через культуры.',
    whatNext: 'Что делать дальше:',
    step1Title: '1. Заполните профиль',
    step1Text: 'Добавьте фотографии и расскажите о своем культурном происхождении, интересах и целях.',
    step2Title: '2. Находите людей',
    step2Text: 'Просматривайте профили людей рядом с вами, которые разделяют ваши интересы и ценности.',
    step3Title: '3. Присоединяйтесь к событиям',
    step3Text: 'Находите локальные события и небольшие сообщества для личных встреч.',
    button: 'Заполнить профиль',
    tips: 'Советы для успеха:',
    tip1: '✨ Будьте искренними - делитесь реальными интересами и культурным опытом',
    tip2: '🌍 Будьте открытыми - принимайте разные точки зрения и происхождение',
    tip3: '💬 Начинайте разговоры - не стесняйтесь писать первыми',
    help: 'Нужна помощь? Посмотрите наше',
    helpLink: 'Руководство для начинающих',
    footer: 'Добро пожаловать в сообщество CultureMatch!',
  },
};

export function welcomeTemplate(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const t = translations[data.language];

  const content = `
    <h2 class="email-title">${t.title}</h2>
    <p class="email-text">${t.greeting(data.recipientName)}</p>
    <p class="email-text">${t.intro}</p>

    <div class="divider"></div>

    <h3 class="email-text" style="font-weight: 600; font-size: 18px;">${t.whatNext}</h3>

    <div style="margin: 20px 0;">
      <p class="email-text" style="font-weight: 600; margin-bottom: 8px;">${t.step1Title}</p>
      <p class="email-text" style="margin-top: 0; color: #666;">${t.step1Text}</p>
    </div>

    <div style="margin: 20px 0;">
      <p class="email-text" style="font-weight: 600; margin-bottom: 8px;">${t.step2Title}</p>
      <p class="email-text" style="margin-top: 0; color: #666;">${t.step2Text}</p>
    </div>

    <div style="margin: 20px 0;">
      <p class="email-text" style="font-weight: 600; margin-bottom: 8px;">${t.step3Title}</p>
      <p class="email-text" style="margin-top: 0; color: #666;">${t.step3Text}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://culturematch.com/profile/edit" class="email-button">${t.button}</a>
    </div>

    <div class="divider"></div>

    <div class="info-box">
      <p class="info-box-text" style="font-weight: 600; margin-bottom: 12px;">${t.tips}</p>
      <p class="info-box-text" style="margin: 8px 0;">${t.tip1}</p>
      <p class="info-box-text" style="margin: 8px 0;">${t.tip2}</p>
      <p class="info-box-text" style="margin: 8px 0;">${t.tip3}</p>
    </div>

    <p class="email-text" style="text-align: center; font-size: 14px; color: #888;">
      ${t.help} <a href="https://culturematch.com/guide" style="color: #667eea;">${t.helpLink}</a>
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

${t.greeting(data.recipientName)}

${t.intro}

${t.whatNext}

${t.step1Title}
${t.step1Text}

${t.step2Title}
${t.step2Text}

${t.step3Title}
${t.step3Text}

${t.button}: https://culturematch.com/profile/edit

${t.tips}
${t.tip1}
${t.tip2}
${t.tip3}

${t.help} ${t.helpLink}: https://culturematch.com/guide

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
