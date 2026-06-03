import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { pushSubscriptions } from '../db/schema';
import { authenticate } from '../middleware/authenticate';
import { getVapidPublicKey } from '../services/push';

const router = Router();

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  const publicKey = getVapidPublicKey();
  res.json({ success: true, publicKey });
});

// Save subscription
router.post('/subscribe', authenticate, async (req: any, res: Response) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user?.id;

    if (!endpoint || !keys || !keys.auth || !keys.p256dh) {
      res.status(400).json({ success: false, error: 'Invalid subscription payload' });
      return;
    }

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Insert or update on conflict of endpoint
    await db.insert(pushSubscriptions)
      .values({
        userId,
        endpoint,
        keysAuth: keys.auth,
        keysP256dh: keys.p256dh
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId,
          keysAuth: keys.auth,
          keysP256dh: keys.p256dh,
          createdAt: new Date()
        }
      });

    res.status(201).json({ success: true, message: 'Push subscription saved successfully' });
  } catch (err: any) {
    console.error('❌ Failed to save push subscription:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Unsubscribe
router.post('/unsubscribe', authenticate, async (req: any, res: Response) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user?.id;

    if (!endpoint) {
      res.status(400).json({ success: false, error: 'Endpoint is required' });
      return;
    }

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    await db.delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, userId)
        )
      );

    res.json({ success: true, message: 'Push subscription removed successfully' });
  } catch (err: any) {
    console.error('❌ Failed to remove push subscription:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
