require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  
  try {
    console.log('🚧 Altering "users" table to add missing auth columns...');
    
    await client.query(`
      ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS refresh_token TEXT;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_push BOOLEAN DEFAULT true;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
    `);
    
    console.log('✅ Columns added successfully.');
  } catch (err) {
    console.error('❌ Error altering table:', err);
  } finally {
    await client.end();
  }
}

main();
