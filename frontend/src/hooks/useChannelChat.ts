'use client';

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import api from '../lib/api';
import { ChannelMessage } from '../types';

export function useChannelChat(teamId: string, channelId: string | null, socket: Socket | null) {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const channelIdRef = useRef<string | null>(null);

  // Keep channelId ref updated for socket event closures
  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  // Load message history and bind socket listeners on channel changes
  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    let active = true;

    async function loadHistory() {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/teams/${teamId}/channels/${channelId}/messages`);
        if (active && response.data.success) {
          setMessages(response.data.messages);
        }
      } catch (err: any) {
        console.error('❌ Failed to fetch channel chat history:', err);
        if (active) {
          setError('Could not load chat messages.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    // Bind real-time signaling listeners
    if (socket) {
      // 1. Join room
      socket.emit('join-channel', { channelId });

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
      if (socket && channelId) {
        socket.emit('leave-channel', { channelId });
        socket.off('channel-msg-recv');
      }
    };
  }, [teamId, channelId, socket]);

  // Write new message to database and trigger real-time broadcast
  const sendMsg = async (content: string) => {
    if (!channelId || !content.trim()) return;

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
      console.error('❌ Failed to send channel message:', err);
      throw err;
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