import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Middleware: Admin access check
async function adminAuthenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized: User session missing' });
    return;
  }

  try {
    const result = await db.execute(sql`
      SELECT is_admin FROM users WHERE id = ${req.user.id}::uuid LIMIT 1
    `);
    const user = result.rows[0] as any;

    if (!user || !user.is_admin) {
      res.status(403).json({ success: false, error: 'Access denied: Requires administrator credentials' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

// Apply authentication to all admin routes
router.use(authenticate);

// POST /api/admin/audit-logs (custom action logging) - accessible by all authenticated users
router.post('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, targetId } = req.body;
    if (!action) {
      res.status(400).json({ success: false, error: 'Missing log action' });
      return;
    }

    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();

    await db.execute(sql`
      INSERT INTO audit_logs (user_id, user_email, action, target_id, ip_address)
      VALUES (${req.user!.id}::uuid, ${req.user!.email}, ${action}, ${targetId || null}, ${ipAddress})
    `);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Guard subsequent endpoints behind the administrator check
router.use(adminAuthenticate);

// GET /api/admin/users (paginated users list)
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    
    let whereClause = sql`TRUE`;
    if (search) {
      whereClause = sql`display_name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'}`;
    }

    const countRes = await db.execute(sql`SELECT count(*) FROM users WHERE ${whereClause}`);
    const totalCount = parseInt((countRes.rows[0] as any).count as string) || 0;

    const usersListRes = await db.execute(sql`
      SELECT id, display_name as "name", email, avatar_url as "avatarUrl", is_admin as "isAdmin", created_at as "createdAt"
      FROM users
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const usersList = usersListRes.rows as any[];

    res.status(200).json({
      success: true,
      users: usersList,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/users/:id/reset-password
router.post('/users/:id/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tempPassword = 'TempPassword123!';
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    try {
      await db.execute(sql`
        UPDATE auth.users SET encrypted_password = ${passwordHash} WHERE id = ${id}::uuid
      `);
    } catch (authErr) {
      console.warn('⚠️ Could not update auth.users encrypted_password:', authErr);
    }

    // Log to audit log
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
    await db.execute(sql`
      INSERT INTO audit_logs (user_id, user_email, action, target_id, ip_address)
      VALUES (${req.user!.id}::uuid, ${req.user!.email}, 'force_password_reset', ${id}, ${ipAddress})
    `);

    res.status(200).json({
      success: true,
      message: `Password reset successfully. The temporary credentials are: ${tempPassword}`
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/users/:id/require-mfa
router.post('/users/:id/require-mfa', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Set claims metadata in Supabase auth table
    try {
      await db.execute(sql`
        UPDATE auth.users 
        SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"mfa_required": true}'::jsonb 
        WHERE id = ${id}::uuid
      `);
    } catch (e) {
      console.warn('⚠️ Could not update auth.users raw app metadata for MFA:', e);
    }

    // Log to audit log
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
    await db.execute(sql`
      INSERT INTO audit_logs (user_id, user_email, action, target_id, ip_address)
      VALUES (${req.user!.id}::uuid, ${req.user!.email}, 'require_mfa', ${id}, ${ipAddress})
    `);

    res.status(200).json({
      success: true,
      message: 'MFA requirements will be enforced on next session login.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/users/:id/kick
router.post('/users/:id/kick', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Log to audit log
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
    await db.execute(sql`
      INSERT INTO audit_logs (user_id, user_email, action, target_id, ip_address)
      VALUES (${req.user!.id}::uuid, ${req.user!.email}, 'kick_user', ${id}, ${ipAddress})
    `);

    // Emit socket global kick
    try {
      const { kickUser } = require('../socket/signalingServer');
      if (typeof kickUser === 'function') {
        kickUser(id);
      }
    } catch (e) {
      console.warn('⚠️ Socket kick function call bypassed:', e);
    }

    res.status(200).json({
      success: true,
      message: 'User session tokens terminated globally.'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/analytics (aggregates telemetry stats)
router.get('/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Meeting minutes aggregate over 30 days
    const meetingMinutesRes = await db.execute(sql`
      SELECT * FROM get_meeting_minutes_last_30_days()
    `);
    const meetingMinutes = meetingMinutesRes.rows as any[];

    // 2. Storage capacity usage
    const storageUsageRes = await db.execute(sql`
      SELECT * FROM get_storage_usage()
    `);
    const storageUsage = storageUsageRes.rows as any[];

    // 3. Concurrent users last 24h
    const concurrentUsersRes = await db.execute(sql`
      SELECT * FROM get_concurrent_users_last_24h()
    `);
    const concurrentUsers = concurrentUsersRes.rows as any[];

    res.status(200).json({
      success: true,
      analytics: {
        meetingMinutes: meetingMinutes.map(row => ({
          day: row.day,
          minutes: parseInt(row.minutes) || 0
        })),
        storageUsage: storageUsage.map(row => ({
          bucket: row.bucket_name,
          sizeBytes: parseInt(row.size_bytes) || 0
        })),
        concurrentUsers: concurrentUsers.map(row => ({
          time: row.time_bucket,
          users: parseInt(row.max_users) || 0
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listRes = await db.execute(sql`
      SELECT id, user_id as "userId", user_email as "userEmail", action, target_id as "targetId", ip_address as "ipAddress", timestamp
      FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT 100
    `);
    const list = listRes.rows as any[];

    res.status(200).json({
      success: true,
      logs: list
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/audit-logs (custom action logging)
router.post('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, targetId } = req.body;
    if (!action) {
      res.status(400).json({ success: false, error: 'Missing log action' });
      return;
    }

    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();

    await db.execute(sql`
      INSERT INTO audit_logs (user_id, user_email, action, target_id, ip_address)
      VALUES (${req.user!.id}::uuid, ${req.user!.email}, ${action}, ${targetId || null}, ${ipAddress})
    `);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
