/**
 * Base email template with consistent styling
 */

export interface BaseTemplateParams {
  title: string;
  previewText: string;
  content: string;
  footerText?: string;
}

export function baseTemplate(params: BaseTemplateParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${params.title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
      line-height: 1.6;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .email-logo {
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .email-content {
      padding: 40px 30px;
    }
    .email-title {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0 0 20px 0;
    }
    .email-text {
      font-size: 16px;
      color: #4a4a4a;
      margin: 0 0 20px 0;
    }
    .email-button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: transform 0.2s;
    }
    .email-button:hover {
      transform: translateY(-2px);
    }
    .email-footer {
      background-color: #f9f9f9;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e5e5;
    }
    .email-footer-text {
      font-size: 14px;
      color: #888888;
      margin: 0 0 10px 0;
    }
    .email-footer-link {
      color: #667eea;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #e5e5e5;
      margin: 30px 0;
    }
    .info-box {
      background-color: #f0f4ff;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box-text {
      font-size: 14px;
      color: #4a4a4a;
      margin: 0;
    }
    @media only screen and (max-width: 600px) {
      .email-content {
        padding: 30px 20px;
      }
      .email-title {
        font-size: 20px;
      }
      .email-button {
        display: block;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <h1 class="email-logo">CultureMatch</h1>
    </div>
    <div class="email-content">
      ${params.content}
    </div>
    <div class="email-footer">
      <p class="email-footer-text">
        ${params.footerText || 'You received this email because you have an account with CultureMatch.'}
      </p>
      <p class="email-footer-text">
        <a href="https://culturematch.com/privacy" class="email-footer-link">Privacy Policy</a> · 
        <a href="https://culturematch.com/terms" class="email-footer-link">Terms of Service</a>
      </p>
      <p class="email-footer-text" style="margin-top: 20px;">
        © ${new Date().getFullYear()} CultureMatch. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
