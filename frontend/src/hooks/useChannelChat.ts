'use client';

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import api from '../lib/api';
import { ChannelMessage } from '../types';
import { useAuth } from './useAuth';
import { 
  cacheMessages, 
  getCachedMessages, 
  queueOfflineMessage, 
  getOfflineQueue, 
  clearOfflineQueueItem 
} from '../lib/indexedDB';

export function useChannelChat(teamId: string, channelId: string | null, socket: Socket | null) {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  
  const channelIdRef = useRef<string | null>(null);

  // Keep channelId ref updated for socket event closures
  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  // Synchronize offline message queue
  const syncOfflineQueue = async () => {
    if (!channelId || typeof window === 'undefined' || !navigator.onLine) return;

    try {
      const queue = await getOfflineQueue();
      const channelQueue = queue.filter(item => item.channelId === channelId);

      for (const item of channelQueue) {
        try {
          const res = await api.post(`/teams/${item.teamId}/channels/${item.channelId}/messages`, {
            content: item.content
          });
          if (res.data.success) {
            const savedMessage = res.data.message;

            // Remove item from offline queue
            await clearOfflineQueueItem(item.id);

            // Broadcast message via Socket
            if (socket) {
              socket.emit('channel-msg-send', {
                channelId: item.channelId,
                message: savedMessage,
              });
            }

            // Replace temporary message in local state
            setMessages((prev) => 
              prev.map(msg => msg.id === item.id ? savedMessage : msg)
            );
          }
        } catch (postErr) {
          console.error('Failed to sync offline message item:', postErr);
        }
      }
    } catch (e) {
      console.error('Failed to sync offline queue:', e);
    }
  };

  // Load message history and bind socket listeners on channel changes
  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    const activeChannelId = channelId;
    let active = true;

    async function loadHistory() {
      setLoading(true);
      setError(null);

      // Check if we are offline
      const isOnline = typeof window !== 'undefined' && navigator.onLine;

      if (!isOnline) {
        console.log('🔌 App is offline. Loading cached chat history from IndexedDB.');
        const cached = await getCachedMessages(activeChannelId);
        if (active) {
          // Merge offline queue items for this channel that are not sent yet
          const queue = await getOfflineQueue();
          const channelQueue = queue.filter(item => item.channelId === activeChannelId);
          
          const queuedMessages: ChannelMessage[] = channelQueue.map(item => ({
            id: item.id,
            channelId: item.channelId,
            userId: item.senderId,
            content: item.content,
            createdAt: item.createdAt,
            user: {
              id: item.senderId,
              name: item.senderName,
              email: item.senderEmail,
              avatarUrl: item.senderAvatarUrl
            },
            status: 'pending'
          } as any));

          setMessages([...cached, ...queuedMessages]);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get(`/teams/${teamId}/channels/${activeChannelId}/messages`);
        if (active && response.data.success) {
          const remoteMsgs = response.data.messages;
          setMessages(remoteMsgs);
          // Cache messages locally
          await cacheMessages(activeChannelId, remoteMsgs);
        }
      } catch (err: any) {
        console.error('❌ Failed to fetch channel chat history, loading cache:', err);
        // Fallback to cache if network request fails
        const cached = await getCachedMessages(activeChannelId);
        if (active) {
          setMessages(cached);
          setError('Could not load live chat messages. Showing offline cache.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHistory();
    syncOfflineQueue();

    // Bind real-time signaling listeners
    if (socket) {
      // 1. Join room
      socket.emit('join-channel', { channelId: activeChannelId });

      // 2. Listen for incoming message relays
      socket.on('channel-msg-recv', (message: ChannelMessage) => {
        // Double check channel matching to avoid cross-talk
        if (message.channelId === channelIdRef.current) {
          setMessages((prev) => [...prev, message]);
        }
      });
    }

    return () => {
      active = false;
      if (socket) {
        socket.emit('leave-channel', { channelId: activeChannelId });
        socket.off('channel-msg-recv');
      }
    };
  }, [teamId, channelId, socket]);

  // Sync queue on coming back online
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      syncOfflineQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [channelId]);

  // Write new message to database and trigger real-time broadcast
  const sendMsg = async (content: string) => {
    if (!channelId || !content.trim()) return;

    const isOnline = typeof window !== 'undefined' && navigator.onLine;
    const tempId = `temp-${Date.now()}`;
    const tempMessage: ChannelMessage = {
      id: tempId,
      channelId,
      userId: currentUser?.id || 'demo-user-id',
      content,
      createdAt: new Date().toISOString(),
      user: {
        id: currentUser?.id || 'demo-user-id',
        name: currentUser?.name || 'Aero User',
        email: currentUser?.email || '',
        avatarUrl: currentUser?.avatarUrl || null,
      },
      status: 'pending'
    } as any;

    if (!isOnline) {
      console.log('🔌 App is offline. Queueing message locally.');
      setMessages((prev) => [...prev, tempMessage]);
      await queueOfflineMessage({
        id: tempId,
        teamId,
        channelId,
        content,
        senderId: currentUser?.id || 'demo-user-id',
        senderName: currentUser?.name || 'Aero User',
        senderEmail: currentUser?.email || '',
        senderAvatarUrl: currentUser?.avatarUrl || null,
        createdAt: tempMessage.createdAt
      });
      return;
    }

    try {
      const response = await api.post(`/teams/${teamId}/channels/${channelId}/messages`, {
        content,
      });

      if (response.data.success) {
        const savedMessage = response.data.message;

        // 1. Append instantly to local state
        setMessages((prev) => [...prev, savedMessage]);

        // 2. Broadcast via Socket.IO to other room participants
        if (socket) {
          socket.emit('channel-msg-send', {
            channelId,
            message: savedMessage,
          });
        }
      }
    } catch (err) {
      console.error('❌ Failed to send channel message, queueing offline:', err);
      setMessages((prev) => [...prev, tempMessage]);
      await queueOfflineMessage({
        id: tempId,
        teamId,
        channelId,
        content,
        senderId: currentUser?.id || 'demo-user-id',
        senderName: currentUser?.name || 'Aero User',
        senderEmail: currentUser?.email || '',
        senderAvatarUrl: currentUser?.avatarUrl || null,
        createdAt: tempMessage.createdAt
      });
    }
  };

  return {
    messages,
    loading,
    error,
    sendMsg,
  };
}
export default useChannelChat;