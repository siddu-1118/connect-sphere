import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate Request using User's Authorization Context
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header is required' }, { status: 401 });
    }

    const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: { user }, error: userError } = await supabaseServer.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid credentials' }, { status: 401 });
    }

    // 2. Validate parameters
    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get('room');
    const participantName = searchParams.get('username');

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'Missing "room" or "username" query parameters' },
        { status: 400 }
      );
    }

    // 3. Process API configurations
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      console.warn(
        'AeroMeet: LiveKit API credentials or WS URL missing. Clients will fall back to WebRTC.'
      );
      return NextResponse.json({
        fallback: true,
        reason: 'LiveKit server credentials not configured',
      });
    }

    // 4. Generate LiveKit Access Token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token, wsUrl });
  } catch (error: any) {
    console.error('Error generating LiveKit access token:', error);
    return NextResponse.json(
      { error: error.message || 'Server failed to generate access token' },
      { status: 500 }
    );
  }
}
