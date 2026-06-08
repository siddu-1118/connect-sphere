import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';

const router = Router();
const SALT_ROUNDS = 12;

// --- Zod schemas ---
const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name cannot be empty').optional(),
    avatarUrl: z.string().url('Invalid avatar URL').or(z.string().length(0)).optional().nullable(),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }),
});

const updateNotificationsSchema = z.object({
  body: z.object({
    notificationEmail: z.boolean().optional(),
    notificationPush: z.boolean().optional(),
  }),
});

// Protect all routes with authentication middleware
router.use(authenticate);

// GET /me
router.get('/me', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        notificationEmail: user.notificationEmail,
        notificationPush: user.notificationPush,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /me
router.patch('/me', validate(updateMeSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { name, avatarUrl } = req.body;

    const [updatedUser] = await db
      .update(users)
      .set({
        ...(name !== undefined && { name }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
        notificationEmail: updatedUser.notificationEmail,
        notificationPush: updatedUser.notificationPush,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /me/password
router.patch('/me/password', validate(changePasswordSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, error: 'Incorrect current password' });
      return;
    }

    // Hash and update new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /me/notifications
router.patch('/me/notifications', validate(updateNotificationsSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { notificationEmail, notificationPush } = req.body;

    const [updatedUser] = await db
      .update(users)
      .set({
        ...(notificationEmail !== undefined && { notificationEmail }),
        ...(notificationPush !== undefined && { notificationPush }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
        notificationEmail: updatedUser.notificationEmail,
        notificationPush: updatedUser.notificationPush,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;