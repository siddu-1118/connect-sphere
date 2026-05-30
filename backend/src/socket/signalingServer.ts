import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

interface RoomUser {
  userId: string;
  userName: string;
  socketId: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
}

export function setupSocketIO(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  console.log('🔌 Socket.IO Signaling Server registered successfully');

  io.on('connection', (socket: Socket) => {
    console.log(`📡 Client connected: ${socket.id}`);

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
    });
  });
}