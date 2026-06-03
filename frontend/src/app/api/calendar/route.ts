import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_ACCESS_SECRET || 'your_access_secret_here';

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Invalid or expired access token' }, { status: 401 });
    }

    const userId = decoded.userId;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID missing from token' }, { status: 401 });
    }

    // Query database for user's Google tokens
    const client = await pool.connect();
    let userRow: any;
    try {
      const res = await client.query(
        'SELECT google_access_token, google_refresh_token, google_token_expires_at FROM users WHERE id = $1',
        [userId]
      );
      userRow = res.rows[0];
    } finally {
      client.release();
    }

    if (!userRow) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let { google_access_token, google_refresh_token, google_token_expires_at } = userRow;

    if (!google_access_token) {
      return NextResponse.json({ success: false, error: 'Google Calendar not connected' }, { status: 400 });
    }

    // Check if access token is expired or close to expiring (within 5 minutes)
    const expiresAt = google_token_expires_at ? new Date(google_token_expires_at).getTime() : 0;
    const isExpiring = expiresAt - Date.now() < 5 * 60 * 1000;

    if (isExpiring && google_refresh_token) {
      console.log('🔄 Refreshing Google access token for user:', userId);
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            refresh_token: google_refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          google_access_token = refreshData.access_token;
          const expiresIn = refreshData.expires_in || 3600;
          const newTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

          // Update tokens in database
          const dbClient = await pool.connect();
          try {
            await dbClient.query(
              'UPDATE users SET google_access_token = $1, google_token_expires_at = $2, updated_at = NOW() WHERE id = $3',
              [google_access_token, newTokenExpiresAt, userId]
            );
          } finally {
            dbClient.release();
          }
          console.log('✅ Google access token refreshed successfully.');
        } else {
          const errorBody = await refreshResponse.text();
          console.error('❌ Failed to refresh Google access token:', errorBody);
        }
      } catch (err) {
        console.error('❌ Error during Google token refresh flow:', err);
      }
    }

    // Fetch Google Calendar events for the current day
    const timeMin = new Date();
    timeMin.setHours(0, 0, 0, 0);

    const timeMax = new Date();
    timeMax.setHours(23, 59, 59, 999);

    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      timeMin.toISOString()
    )}&timeMax=${encodeURIComponent(timeMax.toISOString())}&singleEvents=true&orderBy=startTime`;

    const calendarResponse = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${google_access_token}`,
      },
    });

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('❌ Google Calendar API returned error:', errorText);
      return NextResponse.json({ success: false, error: 'Google Calendar API error', details: errorText }, { status: calendarResponse.status });
    }

    const calendarData = await calendarResponse.json();
    const items = calendarData.items || [];

    // Map and return events
    const events = items.map((item: any) => ({
      id: item.id,
      summary: item.summary || 'No Title',
      description: item.description || '',
      start: item.start?.dateTime || item.start?.date || '',
      end: item.end?.dateTime || item.end?.date || '',
      location: item.location || '',
      meetLink: item.hangoutLink || '',
    }));

    return NextResponse.json({ success: true, events });
  } catch (err: any) {
    console.error('❌ calendar/route GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
