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

    // Create RPC analytics functions
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION get_meeting_minutes_last_30_days()
      RETURNS TABLE(day DATE, minutes INT) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          d::date as day,
          COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - scheduled_at))/60)::int, 0) as minutes
        FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day'::interval) d
        LEFT JOIN meetings m ON m.scheduled_at::date = d::date AND m.ended_at IS NOT NULL
        GROUP BY d::date
        ORDER BY d::date;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await db.execute(sql`
      CREATE OR REPLACE FUNCTION get_storage_usage()
      RETURNS TABLE(bucket_name TEXT, size_bytes BIGINT) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          bucket_id::text as bucket_name,
          COALESCE(SUM(COALESCE((metadata->>'size')::bigint, 0)), 0)::bigint as size_bytes
        FROM storage.objects
        WHERE bucket_id IN ('workspace_files', 'meeting_recordings')
        GROUP BY bucket_id;
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

    // Automatically elevate default demo user
    await db.execute(sql`
      UPDATE users SET is_admin = true WHERE email = 'aksbasg@gmail.com';
    `);
    
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
  } catch (err) {
    console.error('❌ Failed running startup database migrations:', err);
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