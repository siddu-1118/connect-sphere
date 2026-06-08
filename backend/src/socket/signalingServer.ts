import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import * as Y from 'yjs';
import { db } from '../db';
import { sql } from 'drizzle-orm';

let activeIoInstance: Server | null = null;

export function kickUser(userId: string): boolean {
  if (!activeIoInstance) {
    console.warn('⚠️ Cannot kick user: socket instance not initialized');
    return false;
  }
  
  let kicked = false;
  activeIoInstance.sockets.sockets.forEach((socket) => {
    if (socket.data.userId === userId) {
      console.log(`🔌 Admin Kicked user: ${userId} (socket: ${socket.id})`);
      socket.emit('kicked-by-admin');
      socket.disconnect(true);
      kicked = true;
    }
  });
  return kicked;
}

async function logActiveUsersCount(io: Server) {
  try {
    const count = io.engine.clientsCount;
    await db.execute(sql`
      INSERT INTO concurrent_users_log (active_users) VALUES (${count})
    `);
  } catch (err) {
    console.error('Failed to log concurrent socket users:', err);
  }
}

const roomWhiteboards = new Map<string, Y.Doc>();
const roomDocuments = new Map<string, string>();

interface BreakoutState {
  mainRoomId: string;
  rooms: Record<string, string[]>;
  expiresAt: number;
  timer?: NodeJS.Timeout;
}

const activeBreakouts = new Map<string, BreakoutState>();

interface RoomUser {
  userId: string;
  userName: string;
  socketId: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
}

export function setupSocketIO(server: HttpServer) {
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

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`⚠️ Blocked by CORS for signaling: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  console.log('🔌 Socket.IO Signaling Server registered successfully');

  activeIoInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`📡 Client connected: ${socket.id}`);
    logActiveUsersCount(io);

    // --- WebRTC Meeting signaling ---
    socket.on('join-room', ({ roomId, userId, userName }: { roomId: string; userId: string; userName: string }) => {
      console.log(`👥 User ${userName} (${userId}) joining meet room: ${roomId}`);
      
      const meetingRoom = `meet:${roomId}`;
      socket.join(meetingRoom);

      // Store identity data directly on the socket instance
      socket.data.userId = userId;
      socket.data.userName = userName;
      socket.data.roomId = roomId;
      socket.data.isMuted = false;
      socket.data.isCameraOff = false;

      // Get all other connected sockets in this room
      const clients = io.sockets.adapter.rooms.get(meetingRoom);
      const otherUsers: RoomUser[] = [];

      if (clients) {
        for (const clientId of clients) {
          if (clientId !== socket.id) {
            const clientSocket = io.sockets.sockets.get(clientId);
            if (clientSocket) {
              otherUsers.push({
                userId: clientSocket.data.userId,
                userName: clientSocket.data.userName,
                socketId: clientSocket.id,
                isMuted: clientSocket.data.isMuted,
                isCameraOff: clientSocket.data.isCameraOff,
              });
            }
          }
        }
      }

      // 1. Send all existing participants to the joining client
      socket.emit('all-users', otherUsers);

      // Send existing whiteboard state to joining user
      const doc = roomWhiteboards.get(roomId);
      if (doc) {
        const stateUpdate = Y.encodeStateAsUpdate(doc);
        socket.emit('whiteboard-sync', Buffer.from(stateUpdate));
      }

      // Send existing document text to joining user
      const currentDocText = roomDocuments.get(roomId) || '';
      socket.emit('document-sync', currentDocText);

      // Check if breakout rooms are active for this main room
      const breakout = activeBreakouts.get(roomId);
      if (breakout) {
        socket.emit('breakout-rooms-started', { rooms: breakout.rooms, expiresAt: breakout.expiresAt });
      }

      // 2. Broadcast user-joined event to all existing participants in the room
      socket.to(meetingRoom).emit('user-joined', {
        userId,
        userName,
        socketId: socket.id,
        isMuted: false,
        isCameraOff: false,
      });
    });

    // Relay SDP Offer
    socket.on('offer', ({ to, from, sdp }: { to: string; from: string; sdp: any }) => {
      io.to(to).emit('offer', { from, sdp });
    });

    // Relay SDP Answer
    socket.on('answer', ({ to, from, sdp }: { to: string; from: string; sdp: any }) => {
      io.to(to).emit('answer', { from, sdp });
    });

    // Relay ICE Candidate
    socket.on('ice-candidate', ({ to, from, candidate }: { to: string; from: string; candidate: any }) => {
      io.to(to).emit('ice-candidate', { from, candidate });
    });

    // Relay Mic Mute status
    socket.on('mute-toggle', ({ roomId, userId, isMuted }: { roomId: string; userId: string; isMuted: boolean }) => {
      socket.data.isMuted = isMuted;
      socket.to(`meet:${roomId}`).emit('mute-update', { userId, isMuted });
    });

    // Relay Camera Toggle status
    socket.on('camera-toggle', ({ roomId, userId, isCameraOff }: { roomId: string; userId: string; isCameraOff: boolean }) => {
      socket.data.isCameraOff = isCameraOff;
      socket.to(`meet:${roomId}`).emit('camera-update', { userId, isCameraOff });
    });

    // Relay Meeting Chat Messages
    socket.on('chat-message', ({ roomId, userId, userName, content, timestamp }: { roomId: string; userId: string; userName: string; content: string; timestamp: string }) => {
      io.to(`meet:${roomId}`).emit('chat-message', { userId, userName, content, timestamp });
    });

    // Handle Whiteboard drawing updates (Yjs)
    socket.on('whiteboard-update', ({ roomId, update }: { roomId: string; update: Buffer }) => {
      let doc = roomWhiteboards.get(roomId);
      if (!doc) {
        doc = new Y.Doc();
        roomWhiteboards.set(roomId, doc);
      }
      try {
        Y.applyUpdate(doc, new Uint8Array(update));
        socket.to(`meet:${roomId}`).emit('whiteboard-update', update);
      } catch (err) {
        console.error('Yjs update error:', err);
      }
    });

    // Document editing sync
    socket.on('document-change', ({ roomId, text }: { roomId: string; text: string }) => {
      roomDocuments.set(roomId, text);
      socket.to(`meet:${roomId}`).emit('document-change', text);
    });

    // Backstage events
    socket.on('join-backstage', ({ roomId, userId, userName }: { roomId: string; userId: string; userName: string }) => {
      socket.join(`backstage:${roomId}`);
      console.log(`🕵️ User ${userName} joined backstage for room ${roomId}`);
    });

    socket.on('leave-backstage', ({ roomId }: { roomId: string }) => {
      socket.leave(`backstage:${roomId}`);
    });

    socket.on('backstage-msg-send', ({ roomId, userId, userName, content }: { roomId: string; userId: string; userName: string; content: string }) => {
      io.to(`backstage:${roomId}`).emit('backstage-msg-recv', { userId, userName, content, timestamp: new Date().toISOString() });
    });

    // Relay screen share status updates
    socket.on('screen-share-toggle', ({ roomId, userId, isSharing }: { roomId: string; userId: string; isSharing: boolean }) => {
      socket.to(`meet:${roomId}`).emit('screen-share-update', { userId, isSharing });
    });

    // User leaving the call explicitly
    socket.on('user-leave', ({ roomId, userId }: { roomId: string; userId: string }) => {
      console.log(`🚶 User ${userId} left room explicitly: ${roomId}`);
      const meetingRoom = `meet:${roomId}`;
      socket.to(meetingRoom).emit('user-left', { userId, socketId: socket.id });
      socket.leave(meetingRoom);
    });

    // --- Team Channel messaging ---
    socket.on('join-channel', ({ channelId }: { channelId: string }) => {
      const channelRoom = `channel:${channelId}`;
      socket.join(channelRoom);
      console.log(`💬 Socket ${socket.id} joined channel space: ${channelId}`);
    });

    socket.on('leave-channel', ({ channelId }: { channelId: string }) => {
      const channelRoom = `channel:${channelId}`;
      socket.leave(channelRoom);
      console.log(`💬 Socket ${socket.id} left channel space: ${channelId}`);
    });

    // Relay real-time messages to channels
    socket.on('channel-msg-send', (payload: { channelId: string; message: any }) => {
      socket.to(`channel:${payload.channelId}`).emit('channel-msg-recv', payload.message);
    });

    // --- Breakout Rooms Signaling ---
    socket.on('start-breakout-rooms', async ({ roomId, rooms, durationMinutes }: { roomId: string; rooms: Record<string, string[]>; durationMinutes: number }) => {
      console.log(`🚀 Starting breakout rooms for meeting ${roomId}. Duration: ${durationMinutes} mins.`);
      const expiresAt = Date.now() + durationMinutes * 60 * 1000;
      
      const existing = activeBreakouts.get(roomId);
      if (existing && existing.timer) {
        clearTimeout(existing.timer);
      }

      const timer = setTimeout(() => {
        console.log(`⏰ Breakout room timer expired for meeting ${roomId}`);
        activeBreakouts.delete(roomId);
        io.to(`meet:${roomId}`).emit('breakout-rooms-ended');
      }, durationMinutes * 60 * 1000);

      activeBreakouts.set(roomId, {
        mainRoomId: roomId,
        rooms,
        expiresAt,
        timer
      });

      io.to(`meet:${roomId}`).emit('breakout-rooms-started', { rooms, expiresAt });

      // Log to audit log
      try {
        const userId = socket.data.userId;
        const userName = socket.data.userName;
        let userEmail = 'unknown';
        if (userId) {
          const emailRes = await db.execute(sql`SELECT email FROM users WHERE id = ${userId}::uuid LIMIT 1`);
          userEmail = (emailRes.rows[0] as any)?.email || 'unknown';
        }
        const ipAddress = socket.handshake.address || 'socket';
        await db.execute(sql`
          INSERT INTO audit_logs (user_id, user_email, action, target_id, ip_address)
          VALUES (${userId}::uuid, ${userEmail}, 'breakout_room_opened', ${roomId}, ${ipAddress})
        `);
      } catch (err) {
        console.warn('Failed to insert breakout start audit log:', err);
      }
    });

    socket.on('close-breakout-rooms', ({ roomId }: { roomId: string }) => {
      console.log(`🛑 Closing breakout rooms for meeting ${roomId}`);
      
      const existing = activeBreakouts.get(roomId);
      if (existing) {
        if (existing.timer) {
          clearTimeout(existing.timer);
        }
        activeBreakouts.delete(roomId);
      }

      io.to(`meet:${roomId}`).emit('breakout-rooms-ended');
    });

    // Cleanups on disconnection
    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('meet:')) {
          const roomId = room.split(':')[1];
          const userId = socket.data.userId;
          console.log(`🔌 Client disconnected unexpectedly, leaving meet: ${roomId}`);
          socket.to(room).emit('user-left', { userId, socketId: socket.id });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      logActiveUsersCount(io);
    });
  });
}