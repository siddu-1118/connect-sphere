import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || '"AeroMeet" <noreply@aeromeet.app>';

let transporter: nodemailer.Transporter | null = null;

// Initialize mail transporter with fallback support
function getTransporter() {
  if (transporter) return transporter;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    console.log('📬 Initializing production SMTP transporter...');
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  } else {
    console.warn('⚠️ SMTP settings not configured. Falling back to console-logging email simulator.');
  }

  return transporter;
}

export async function sendOTPEmail(email: string, otp: string, userName: string): Promise<boolean> {
  const subject = 'Your AeroMeet Verification Code';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #0B0F19;
            color: #E2E8F0;
            padding: 40px 20px;
            margin: 0;
          }
          .container {
            max-width: 520px;
            background: linear-gradient(135deg, #111827 0%, #0F172A 100%);
            border: 1px solid rgba(59, 130, 246, 0.1);
            border-radius: 16px;
            padding: 40px;
            margin: 0 auto;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
          }
          .logo {
            text-align: center;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.05em;
            background: linear-gradient(to right, #3B82F6, #8B5CF6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 30px;
          }
          h2 {
            font-size: 20px;
            font-weight: 600;
            color: #FFFFFF;
            margin-top: 0;
            margin-bottom: 12px;
          }
          p {
            font-size: 15px;
            line-height: 1.6;
            color: #94A3B8;
            margin-bottom: 24px;
          }
          .code-box {
            text-align: center;
            background: rgba(59, 130, 246, 0.08);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
          }
          .otp-code {
            font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 0.15em;
            color: #3B82F6;
            margin: 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #1E293B;
            font-size: 12px;
            color: #64748B;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">AeroMeet</div>
          <h2>Verify Your Email</h2>
          <p>Hi ${userName},</p>
          <p>Thank you for signing up for AeroMeet. Please use the verification code below to activate your account. This code is valid for 10 minutes.</p>
          <div class="code-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p>If you did not request this, you can safely ignore this email.</p>
          <div class="footer">
            © 2026 AeroMeet. Built for premium real-time collaboration.
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject,
    html: htmlContent,
  };

  const client = getTransporter();
  if (client) {
    try {
      await client.sendMail(mailOptions);
      console.log(`✉️ OTP email sent successfully to ${email}`);
      return true;
    } catch (err) {
      console.error(`❌ Failed to send OTP email to ${email}:`, err);
      return false;
    }
  } else {
    console.log(`
===================================================
📬 [AeroMeet Email Simulator]
To: ${email}
Subject: ${subject}
Name: ${userName}
OTP Code: ${otp}
===================================================
`);
    return true;
  }
}

export async function sendPasswordResetEmail(email: string, otp: string, userName: string): Promise<boolean> {
  const subject = 'Reset Your AeroMeet Password';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #0B0F19;
            color: #E2E8F0;
            padding: 40px 20px;
            margin: 0;
          }
          .container {
            max-width: 520px;
            background: linear-gradient(135deg, #111827 0%, #0F172A 100%);
            border: 1px solid rgba(139, 92, 246, 0.1);
            border-radius: 16px;
            padding: 40px;
            margin: 0 auto;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
          }
          .logo {
            text-align: center;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.05em;
            background: linear-gradient(to right, #3B82F6, #8B5CF6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 30px;
          }
          h2 {
            font-size: 20px;
            font-weight: 600;
            color: #FFFFFF;
            margin-top: 0;
            margin-bottom: 12px;
          }
          p {
            font-size: 15px;
            line-height: 1.6;
            color: #94A3B8;
            margin-bottom: 24px;
          }
          .code-box {
            text-align: center;
            background: rgba(139, 92, 246, 0.08);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
          }
          .otp-code {
            font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 0.15em;
            color: #8B5CF6;
            margin: 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #1E293B;
            font-size: 12px;
            color: #64748B;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">AeroMeet</div>
          <h2>Reset Your Password</h2>
          <p>Hi ${userName},</p>
          <p>We received a request to reset your password. Please use the 6-digit verification code below to authorize your reset. This code is valid for 10 minutes.</p>
          <div class="code-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p>If you did not make this request, you can safely ignore this email. Your password will remain unchanged.</p>
          <div class="footer">
            © 2026 AeroMeet. Built for premium real-time collaboration.
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject,
    html: htmlContent,
  };

  const client = getTransporter();
  if (client) {
    try {
      await client.sendMail(mailOptions);
      console.log(`✉️ Password reset email sent successfully to ${email}`);
      return true;
    } catch (err) {
      console.error(`❌ Failed to send reset email to ${email}:`, err);
      return false;
    }
  } else {
    console.log(`
===================================================
📬 [AeroMeet Email Reset Simulator]
To: ${email}
Subject: ${subject}
Name: ${userName}
OTP Code: ${otp}
===================================================
`);
    return true;
  }
}