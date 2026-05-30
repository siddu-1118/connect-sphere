import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users, meetings, meetingParticipants, meetingMessages, teams, teamMembers, channels, channelMessages, calendarEvents } from './schema';

const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  try {
    // Extract connection details without printing credentials/password
    const host = dbUrl.split('@')[1] || dbUrl;
    console.log(`🔌 Attempting database connection to host: ${host.split('/')[0]}`);
  } catch (e) {
    console.log(`🔌 Attempting database connection with invalid URL format`);
  }
} else {
  console.warn(`🔌 DATABASE_URL is UNDEFINED!`);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, {
  schema: {
    users,
    meetings,
    meetingParticipants,
    meetingMessages,
    teams,
    teamMembers,
    channels,
    channelMessages,
    calendarEvents
  }
});