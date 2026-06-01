import nodemailer from 'nodemailer';

/**
 * Email Service utility to send notifications via Gmail SMTP.
 * Uses environment variables SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM.
 */

export interface EmailParams {
  to: string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<boolean> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.EMAIL_FROM || `"AeroMeet" <saisiddharthvooka@gmail.com>`;

  if (!user || !pass) {
    console.warn('[EmailService] SMTP credentials are not defined in environment. Skipping email dispatch.');
    console.log(`[Mock Email Sent] From: ${fromEmail}, To: ${to.join(', ')}, Subject: "${subject}"`);
    return false;
  }

  try {
    console.log(`[EmailService] Attempting to send SMTP email from: ${fromEmail} to: ${to.join(', ')}...`);
    
    // Create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: fromEmail,
      to: to.join(', '),
      subject,
      html,
    });

    console.log('[EmailService] Email sent successfully via SMTP. Message ID:', info.messageId);
    return true;
  } catch (err: any) {
    console.error('[EmailService] Failed to send email via SMTP:', err.message || err);
    return false;
  }
}
