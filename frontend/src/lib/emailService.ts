/**
 * Email Service utility to send notifications via Resend REST API.
 * Uses environment variables RESEND_API_KEY and SENDER_EMAIL.
 */

export interface EmailParams {
  to: string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

  if (!apiKey) {
    console.warn('[EmailService] RESEND_API_KEY is not defined in environment. Skipping email dispatch.');
    console.log(`[Mock Email Sent] From: ${fromEmail}, To: ${to.join(', ')}, Subject: "${subject}"`);
    return false;
  }

  try {
    console.log(`[EmailService] Attempting to send email from: ${fromEmail} to: ${to.join(', ')}...`);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `AeroMeet <${fromEmail}>`,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[EmailService] Email sent successfully via Resend. ID:', data.id);
    return true;
  } catch (err: any) {
    console.error('[EmailService] Failed to send email via Resend:', err.message || err);
    return false;
  }
}
