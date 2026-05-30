'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, ArrowLeft, Users } from 'lucide-react';
import { ChannelMessage } from '../../types';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import { formatTime, formatDate } from '../../lib/utils';

interface ChannelChatProps {
  channelName: string;
  messages: ChannelMessage[];
  loading: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onBackToChannels?: () => void;
  onViewMembers?: () => void;
}

export function ChannelChat({
  channelName,
  messages,
  loading,
  onSendMessage,
  onBackToChannels,
  onViewMembers,
}: ChannelChatProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom of viewport on messages list updates
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(content);
      setContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between h-full bg-slate-950/20">
      {/* Channel Header */}
      <div className="h-16 px-4 md:px-6 border-b border-slate-900 bg-slate-950/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onBackToChannels && (
            <button
              type="button"
              onClick={onBackToChannels}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all shrink-0"
              aria-label="Back to channels"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Hash className="w-4 h-4 md:w-5 md:h-5 text-slate-500 shrink-0" />
          <h1 className="text-xs md:text-sm font-bold text-white tracking-wider truncate">{channelName}</h1>
        </div>

        {onViewMembers && (
          <button
            type="button"
            onClick={onViewMembers}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all shrink-0"
            aria-label="View members"
          >
            <Users className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Messages Viewport */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5 min-h-0">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Spinner className="border-t-blue-500 w-8 h-8" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">
              Syncing chat...
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4 shadow-lg">
              <Hash className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              Welcome to #{channelName}!
            </h3>
            <p className="text-xs text-slate-500">
              This is the start of the #{channelName} channel. Drop a note to start collaborating.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-4 items-start animate-fadeIn group">
              <Avatar name={msg.user.name} src={msg.user.avatarUrl} size="sm" className="mt-0.5 shadow-md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-bold text-white hover:underline cursor-pointer">
                    {msg.user.name}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {formatDate(msg.createdAt)} at {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 bg-white/5 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-none inline-block max-w-[85%] break-words shadow-inner">
                  {msg.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Message Form */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-slate-900 bg-slate-950/40">
        <div className="relative flex items-center">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            placeholder={`Send message to #${channelName}...`}
            className="w-full pl-5 pr-14 py-4 bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-2xl text-xs text-slate-200 placeholder:text-slate-500 transition-colors shadow-inner"
          />
          <button
            type="submit"
            disabled={!content.trim() || sending || loading}
            className="absolute right-3.5 p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-all active:scale-95 shadow-md shadow-blue-500/10"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChannelChat;