import { Router } from 'express';
import bcrypt from 'bcrypt';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { generateOTP, isOTPExpired } from '../services/otp';
import { sendOTPEmail, sendPasswordResetEmail } from '../services/email';
import { validate } from '../middleware/validate';

const router = Router();

const SALT_ROUNDS = 12;

// --- Zod schemas for input validation ---
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otpCode: z.string().length(6, 'OTP must be exactly 6 digits'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otpCode: z.string().length(6, 'OTP must be exactly 6 digits'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

// --- API Router Handlers ---

// POST /register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUsers.length > 0) {
      res.status(400).json({ success: false, error: 'Email already registered' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate random OTP and expiration (10 minutes from now)
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Save user to DB
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        otpCode: otp,
        otpExpiresAt: otpExpires,
        isVerified: false,
      })
      .returning();

    // Send OTP email via Nodemailer
    await sendOTPEmail(email, otp, name);

    res.status(201).json({
      success: true,
      message: 'Registration successful. OTP sent to your email.',
      email,
    });
  } catch (error) {
    next(error);
  }
});

// POST /verify-otp
router.post('/verify-otp', validate(verifyOtpSchema), async (req, res, next) => {
  try {
    const { email, otpCode } = req.body;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (user.otpCode !== otpCode) {
      res.status(401).json({ success: false, error: 'Invalid verification code' });
      return;
    }

    if (isOTPExpired(user.otpExpiresAt)) {
      res.status(401).json({ success: false, error: 'Verification code expired' });
      return;
    }

    // Set as verified, clear OTP fields
    const accessPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(accessPayload);
    const refreshToken = generateRefreshToken(accessPayload);

    await db
      .update(users)
      .set({
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        refreshToken: refreshToken,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        notificationEmail: user.notificationEmail,
        notificationPush: user.notificationPush,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /resend-otp
router.post('/resend-otp', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await db
      .update(users)
      .set({
        otpCode: otp,
        otpExpiresAt: otpExpires,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await sendOTPEmail(email, otp, user.name || 'User');

    res.status(200).json({
      success: true,
      message: 'New verification code sent',
    });
  } catch (error) {
    next(error);
  }
});

// POST /login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Check password
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Check if email is verified
    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        error: 'Please verify your email first.',
        isUnverified: true,
      });
      return;
    }

    // Issue tokens
    const accessPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(accessPayload);
    const refreshToken = generateRefreshToken(accessPayload);

    // Save refresh token
    await db
      .update(users)
      .set({
        refreshToken: refreshToken,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        notificationEmail: user.notificationEmail,
        notificationPush: user.notificationPush,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      res.status(404).json({ success: false, error: 'No account found with this email' });
      return;
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await db
      .update(users)
      .set({
        otpCode: otp,
        otpExpiresAt: otpExpires,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await sendPasswordResetEmail(email, otp, user.name || 'User');

    res.status(200).json({
      success: true,
      message: 'Password reset code sent to your email',
      email,
    });
  } catch (error) {
    next(error);
  }
});

// POST /reset-password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { email, otpCode, newPassword } = req.body;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (user.otpCode !== otpCode) {
      res.status(401).json({ success: false, error: 'Invalid verification code' });
      return;
    }

    if (isOTPExpired(user.otpExpiresAt)) {
      res.status(401).json({ success: false, error: 'Verification code expired' });
      return;
    }

    // Set new password, clear OTP
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db
      .update(users)
      .set({
        passwordHash: hashedNewPassword,
        otpCode: null,
        otpExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /refresh
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
      return;
    }

    // Verify user in database
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, decoded.userId), eq(users.refreshToken, refreshToken)))
      .limit(1);

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid session or refresh token' });
      return;
    }

    // Issue new access token
    const newAccessToken = generateAccessToken({ userId: user.id, email: user.email });

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
});

// POST /logout
router.post('/logout', validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Remove refresh token from db
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
      await db
        .update(users)
        .set({
          refreshToken: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, decoded.userId));
    } catch (err) {
      // If verification fails, just end successfully since the session is already invalid
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;