'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../lib/auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Access token to authenticate websocket handshakes if needed
    const token = getAccessToken();

    // Establish Socket connection
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket'],
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log(`🔌 Connected to signaling socket: ${socketRef.current?.id}`);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('📡 Socket connection error:', err);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log('🔌 Disconnected from signaling socket');
      }
    };
  }, []);

  return socketRef.current;
}