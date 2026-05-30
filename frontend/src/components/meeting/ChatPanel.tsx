'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';
import { MeetingMessage } from '../../types';
import { formatTime } from '../../lib/utils';

interface ChatPanelProps {
  messages: MeetingMessage[];
  onSendMessage: (content: string) => void;
  onClose: () => void;
}

export function ChatPanel({ messages, onSendMessage, onClose }: ChatPanelProps) {
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the bottom of the chat list on message arrivals
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSendMessage(content);
    setContent('');
  };

  return (
    <aside className="w-full sm:w-80 h-full bg-slate-950/95 border-l border-slate-900 flex flex-col justify-between shrink-0 shadow-2xl fixed sm:relative right-0 top-0 bottom-0 z-50">
      {/* Title Header */}
      <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between bg-slate-950">
        <h3 className="text-sm font-bold text-white tracking-wider uppercase">
          Meeting Chat
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          aria-label="Close chat panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages viewport */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-h-[calc(100vh-140px)]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
            <p className="text-sm font-medium text-slate-500">
              No messages here yet.
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Send a note to let everyone know you joined!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="flex flex-col gap-1 max-w-full">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold text-white truncate max-w-[140px]">
                  {msg.userName}
                </span>
                <span className="text-[9px] text-slate-500">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <p className="text-xs text-slate-300 bg-white/5 border border-white/5 px-3 py-2 rounded-xl rounded-tl-none break-words">
                {msg.content}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input section */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-slate-900 bg-slate-950 flex items-center gap-2"
      >
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Send message to everyone..."
          className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-all active:scale-95 shadow-md shadow-blue-500/10"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
}

export default ChatPanel;