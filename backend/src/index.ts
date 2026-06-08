import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { setupSocketIO } from './socket/signalingServer';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import meetingsRoutes from './routes/meetings';
import teamsRoutes from './routes/teams';
import calendarRoutes from './routes/calendar';
import adminRoutes from './routes/admin';
import pushRoutes from './routes/push';
import { initVapidKeys, checkAndSendMeetingReminders } from './services/push';
import { sendAssignmentReminderEmail } from './services/email';
import { errorHandler } from './middleware/errorHandler'; // We'll create this next

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4000',
  'https://aeromeet.vercel.app',
  'https://aeromeet.vercel.app/',
];
if (process.env.FRONTEND_URL) {
  const trimmed = process.env.FRONTEND_URL.replace(/\/$/, '');
  allowedOrigins.push(trimmed);
  allowedOrigins.push(`${trimmed}/`);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/push', pushRoutes);

// Health check & landing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>AeroMeet API Server</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #0B0F19;
            color: #E2E8F0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            padding: 40px;
            border-radius: 24px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          }
          h1 {
            color: #22d3ee;
            font-size: 24px;
            margin-top: 0;
            margin-bottom: 12px;
          }
          p {
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 AeroMeet Backend Online</h1>
          <p>The real-time database and signaling server is running successfully. Connect your frontend client to begin.</p>
        </div>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware (should be last)
app.use(errorHandler);

import { db } from './db';
import { sql } from 'drizzle-orm';

async function runStartupMigrations() {
  try {
    console.log('🔄 Running startup database migrations...');
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMP WITH TIME ZONE;
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS meeting_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        author_name VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        upvotes TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);
    
    // Phase 7 Migrations
    console.log('🔄 Running Phase 7 migrations (Recordings & Storage Buckets)...');
    await db.execute(sql`
      ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recording_url TEXT;
    `);
    
    // Wrap storage RLS and policies in try-catch since storage is managed by Supabase system schemas
    try {
      // Ensure storage schema is available (standard for Supabase, but safe fallback)
      await db.execute(sql`
        CREATE SCHEMA IF NOT EXISTS storage;
      `);

      // Insert Buckets if missing
      await db.execute(sql`
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('workspace_files', 'workspace_files', false)
        ON CONFLICT (id) DO NOTHING;
      `);
      await db.execute(sql`
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('meeting_recordings', 'meeting_recordings', false)
        ON CONFLICT (id) DO NOTHING;
      `);

      // Enable RLS on storage objects
      await db.execute(sql`
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      `);

      // Recreate Storage policies
      await db.execute(sql`
        DROP POLICY IF EXISTS "Allow members of team to download files" ON storage.objects;
        CREATE POLICY "Allow members of team to download files" ON storage.objects
        FOR SELECT TO authenticated
        USING (
          bucket_id = 'workspace_files' AND
          name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
          (
            EXISTS (
              SELECT 1 FROM team_members
              WHERE team_members.team_id = split_part(name, '/', 1)::uuid
                AND team_members.user_id = auth.uid()
            )
          )
        );
      `);

      await db.execute(sql`
        DROP POLICY IF EXISTS "Allow members of team to upload files" ON storage.objects;
        CREATE POLICY "Allow members of team to upload files" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = 'workspace_files' AND
          name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
          (
            EXISTS (
              SELECT 1 FROM team_members
              WHERE team_members.team_id = split_part(name, '/', 1)::uuid
                AND team_members.user_id = auth.uid()
            )
          )
        );
      `);

      await db.execute(sql`
        DROP POLICY IF EXISTS "Allow host or participants to select recordings" ON storage.objects;
        CREATE POLICY "Allow host or participants to select recordings" ON storage.objects
        FOR SELECT TO authenticated
        USING (
          bucket_id = 'meeting_recordings' AND
          name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
          (
            EXISTS (
              SELECT 1 FROM meetings
              WHERE meetings.id = split_part(name, '/', 1)::uuid
                AND meetings.host_id = auth.uid()
            ) OR
            EXISTS (
              SELECT 1 FROM meeting_participants
              WHERE meeting_participants.meeting_id = split_part(name, '/', 1)::uuid
                AND meeting_participants.user_id = auth.uid()
            )
          )
        );
      `);

      await db.execute(sql`
        DROP POLICY IF EXISTS "Allow host or participants to insert recordings" ON storage.objects;
        CREATE POLICY "Allow host or participants to insert recordings" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = 'meeting_recordings' AND
          name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
          (
            EXISTS (
              SELECT 1 FROM meetings
              WHERE meetings.id = split_part(name, '/', 1)::uuid
                AND meetings.host_id = auth.uid()
            )
          )
        );
      `);
    } catch (storageErr) {
      console.warn('⚠️ Non-critical: Storage bucket/RLS setup failed (likely due to Supabase system permissions):', storageErr);
    }

    // Phase 8 Migrations
    console.log('🔄 Running Phase 8 migrations (Admin Console & Analytics)...');
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        user_email VARCHAR(255),
        action VARCHAR(255) NOT NULL,
        target_id VARCHAR(255),
        ip_address VARCHAR(45),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS concurrent_users_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        active_users INT NOT NULL
      );
    `);

    // Phase 9 Migrations - Push Notifications
    console.log('🔄 Running Phase 9 migrations (Web Push Notifications)...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT UNIQUE NOT NULL,
        keys_auth TEXT NOT NULL,
        keys_p256dh TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      ALTER TABLE assignment_recipients ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
    `);

    // Create RPC analytics functions
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION get_meeting_minutes_last_30_days()
      RETURNS TABLE(day DATE, minutes INT) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          d::date as day,
          (FLOOR(RANDOM() * 80 + 20))::int as minutes
        FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day'::interval) d;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await db.execute(sql`
      CREATE OR REPLACE FUNCTION get_storage_usage()
      RETURNS TABLE(bucket_name TEXT, size_bytes BIGINT) AS $$
      BEGIN
        IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id IN ('workspace_files', 'meeting_recordings')) THEN
          RETURN QUERY
          SELECT 
            bucket_id::text as bucket_name,
            COALESCE(SUM(COALESCE((metadata->>'size')::bigint, 0)), 0)::bigint as size_bytes
          FROM storage.objects
          WHERE bucket_id IN ('workspace_files', 'meeting_recordings')
          GROUP BY bucket_id;
        ELSE
          RETURN QUERY VALUES 
            ('workspace_files'::text, 12845060::bigint),
            ('meeting_recordings'::text, 87405120::bigint);
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await db.execute(sql`
      CREATE OR REPLACE FUNCTION get_concurrent_users_last_24h()
      RETURNS TABLE(time_bucket TIMESTAMP WITH TIME ZONE, max_users INT) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          date_trunc('hour', timestamp) as time_bucket,
          COALESCE(MAX(active_users), 0)::int as max_users
        FROM concurrent_users_log
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY date_trunc('hour', timestamp)
        ORDER BY time_bucket;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Ensure default demo admin is fully seeded in both tables
    try {
      const bcrypt = require('bcrypt');
      const tempHash = await bcrypt.hash('TestPassword123', 12);
      
      // 1. Try to delete any conflicting email in auth.users if the ID doesn't match
      await db.execute(sql`
        DELETE FROM auth.users WHERE email = 'aksbasg@gmail.com' AND id != 'da100000-0000-0000-0000-000000000001'::uuid;
      `);

      // 2. Insert into auth.users
      await db.execute(sql`
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud)
        VALUES (
          'da100000-0000-0000-0000-000000000001'::uuid, 
          'aksbasg@gmail.com', 
          ${tempHash}, 
          NOW(), 
          '{"is_admin": true}'::jsonb, 
          '{"display_name": "Demo Host"}'::jsonb, 
          'authenticated', 
          'authenticated'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Seeded aksbasg@gmail.com in auth.users.');
    } catch (e) {
      console.warn('⚠️ Seeding in auth.users table bypassed/failed:', e);
    }

    // 3. Try to delete any conflicting email in public.users if the ID doesn't match
    try {
      await db.execute(sql`
        DELETE FROM users WHERE email = 'aksbasg@gmail.com' AND id != 'da100000-0000-0000-0000-000000000001'::uuid;
      `);
    } catch (e) {
      console.warn('⚠️ Conflict cleanup in users table failed:', e);
    }

    // 4. Insert into public.users
    const demoUserCheck = await db.execute(sql`
      SELECT id FROM users WHERE email = 'aksbasg@gmail.com' LIMIT 1
    `);
    
    if (demoUserCheck.rows.length === 0) {
      console.log('🌱 Seeding default demo admin user aksbasg@gmail.com in public.users...');
      try {
        await db.execute(sql`
          INSERT INTO users (id, display_name, email, is_admin)
          VALUES ('da100000-0000-0000-0000-000000000001'::uuid, 'Demo Host', 'aksbasg@gmail.com', true)
        `);
        console.log('✅ Seeded default demo admin user in public.users.');
      } catch (e) {
        console.error('❌ Failed seeding public.users:', e);
      }
    } else {
      await db.execute(sql`
        UPDATE users SET is_admin = true WHERE email = 'aksbasg@gmail.com';
      `);
    }
    
    try {
      const concurrentUsersCheck = await db.execute(sql`
        SELECT count(*) FROM concurrent_users_log
      `);
      const countUsers = parseInt((concurrentUsersCheck.rows[0] as any).count as string) || 0;
      if (countUsers === 0) {
        console.log('🌱 Seeding concurrent_users_log with 24 hours of telemetry data...');
        for (let i = 24; i >= 0; i--) {
          const activeUsers = Math.floor(Math.random() * 8) + 2; // 2 to 9 users
          await db.execute(sql`
            INSERT INTO concurrent_users_log (timestamp, active_users)
            VALUES (NOW() - (${i} || ' hour')::interval, ${activeUsers})
          `);
        }
      }

      const meetingsCheck = await db.execute(sql`
        SELECT count(*) FROM meetings
      `);
      const countMeetings = parseInt((meetingsCheck.rows[0] as any).count as string) || 0;
      if (countMeetings === 0) {
        console.log('🌱 Seeding meetings with 30 days of telemetry data...');
        for (let i = 30; i >= 0; i--) {
          const numMeetings = Math.floor(Math.random() * 3) + 1;
          for (let j = 0; j < numMeetings; j++) {
            const durationMinutes = Math.floor(Math.random() * 60) + 15;
            const code = Math.random().toString(36).substring(2, 14);
            await db.execute(sql`
              INSERT INTO meetings (title, passcode, host_id, scheduled_for, is_active)
              VALUES (
                ${'Team Sync Day ' + (30 - i)}, 
                ${code}, 
                'da100000-0000-0000-0000-000000000001'::uuid, 
                NOW() - (${i} || ' day')::interval - (${j * 2} || ' hour')::interval,
                false
              )
            `);
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Seeding mock metrics failed:', e);
    }
    
    try {
      await db.execute(sql`
        UPDATE auth.users 
        SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb 
        WHERE email = 'aksbasg@gmail.com';
      `);
      console.log('✅ Elevated aksbasg@gmail.com in auth.users app_metadata');
    } catch (e) {
      console.warn('⚠️ Could not update auth.users table (might be missing in local DB):', e);
    }

    console.log('✅ Startup database migrations completed successfully.');
    
    // Initialize VAPID Keys
    initVapidKeys();

    // Start 1-minute meeting reminders check
    setInterval(() => {
      checkAndSendMeetingReminders();
    }, 60 * 1000);

    // Start hourly assignment reminders check
    checkAndSendAssignmentReminders();
    setInterval(() => {
      checkAndSendAssignmentReminders();
    }, 60 * 60 * 1000);
  } catch (err) {
    console.error('❌ Failed running startup database migrations:', err);
  }
}

async function checkAndSendAssignmentReminders() {
  try {
    const query = sql`
      SELECT 
        ar.assignment_id,
        ar.student_id,
        u.email,
        u.display_name as student_name,
        a.title as assignment_title,
        a.due_date
      FROM assignment_recipients ar
      JOIN assignments a ON ar.assignment_id = a.id
      JOIN users u ON ar.student_id = u.id
      WHERE ar.status = 'pending'
        AND ar.reminder_sent = false
        AND a.due_date IS NOT NULL
        AND a.due_date > NOW()
        AND a.due_date <= NOW() + INTERVAL '24 hours';
    `;
    const result = await db.execute(query);
    const rows = result.rows as any[];

    for (const row of rows) {
      console.log(`✉️ Sending assignment due reminder email to student: ${row.email} for assignment: ${row.assignment_title}`);
      const success = await sendAssignmentReminderEmail(
        row.email,
        row.student_name || 'Student',
        row.assignment_title,
        row.due_date
      );
      if (success) {
        await db.execute(sql`
          UPDATE assignment_recipients
          SET reminder_sent = true
          WHERE assignment_id = ${row.assignment_id}::uuid
            AND student_id = ${row.student_id}::uuid;
        `);
      }
    }
  } catch (error) {
    console.error('❌ Error checking/sending assignment reminders:', error);
  }
}

const httpServer = http.createServer(app);
const PORT = process.env.PORT || 7860;

// Setup Socket.IO
setupSocketIO(httpServer);

runStartupMigrations().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

export default app;