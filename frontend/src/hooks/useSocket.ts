'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../lib/auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Access token to authenticate websocket handshakes if needed
    const token = getAccessToken();

    console.log(`🔌 Initializing socket connection to: ${SOCKET_URL}`);

    // Establish Socket connection with polling and websocket fallbacks
    const socketInstance = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      console.log(`🔌 Connected to signaling socket: ${socketInstance.id}`);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('📡 Socket connection error:', err);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      console.log('🔌 Disconnected from signaling socket');
    };
  }, []);

  return socket;
}