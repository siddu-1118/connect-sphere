import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomName = searchParams.get('room');
  const participantName = searchParams.get('username');

  if (!roomName || !participantName) {
    return NextResponse.json(
      { error: 'Missing "room" or "username" query parameters' },
      { status: 400 }
    );
  }

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

  try {
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
