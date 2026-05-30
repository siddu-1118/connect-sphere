'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  PenSquare,
  Phone,
  Video,
  Send,
  Paperclip,
  Smile,
  Bold,
  Italic,
  Code2,
  MessageSquare,
  X,
  Reply,
  MoreHorizontal,
  Image,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { User } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DMConversation {
  userId: string;
  name: string;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  presence: 'online' | 'away' | 'offline';
}

interface DMMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  senderName: string;
  senderAvatarUrl?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatMsgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

// ─── Presence Dot ─────────────────────────────────────────────────────────────

function PresenceDot({ presence }: { presence: 'online' | 'away' | 'offline' }) {
  const color =
    presence === 'online'
      ? 'bg-emerald-400'
      : presence === 'away'
      ? 'bg-yellow-400'
      : 'bg-slate-500';
  return (
    <span
      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#1a1a2e] ${color}`}
    />
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ConversationSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-3 rounded bg-white/5 animate-pulse w-2/3" />
            <div className="h-2.5 rounded bg-white/5 animate-pulse w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
          <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse shrink-0" />
          <div
            className={`h-10 rounded-2xl bg-white/5 animate-pulse ${
              i % 2 === 0 ? 'w-2/5' : 'w-1/3'
            }`}
          />
        </div>
      ))}
    </div>
  );
}

// ─── New Chat Modal ────────────────────────────────────────────────────────────

function NewChatModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (user: User) => void;
}) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setUsers([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/users?search=${encodeURIComponent(query.trim())}`);
        setUsers(res.data.users ?? res.data ?? []);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#252540] border border-white/[0.06] rounded-2xl w-[420px] max-h-[520px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <span className="text-sm font-semibold text-slate-100">New Direct Message</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg p-1 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2">
            <Search size={14} className="text-slate-500 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people..."
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col gap-1 p-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2">
                  <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse shrink-0" />
                  <div className="flex-1 h-3 rounded bg-white/5 animate-pulse" />
                </div>
              ))}
            </div>
          )}
          {!loading && query.trim() && users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Search size={32} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-400">No users found for &quot;{query}&quot;</p>
            </div>
          )}
          {!loading && !query.trim() && (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare size={32} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">Type a name to search</p>
            </div>
          )}
          {!loading &&
            users.map((u) => (
              <button
                key={u.id}
                onClick={() => onSelect(u)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
              >
                <div className="relative shrink-0">
                  <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-slate-100 truncate">{u.name}</span>
                  <span className="text-xs text-slate-500 truncate">{u.email}</span>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isOwn,
}: {
  msg: DMMessage;
  isOwn: boolean;
}) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div
      className={`group flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      {/* Avatar — only for others */}
      {!isOwn && (
        <div className="shrink-0 mb-5">
          <Avatar name={msg.senderName} src={msg.senderAvatarUrl ?? null} size="sm" />
        </div>
      )}

      <div className={`flex flex-col max-w-[65%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div
          className={`relative px-3.5 py-2.5 text-[13px] leading-relaxed break-words ${
            isOwn
              ? 'bg-[#5B5FC7] text-white rounded-2xl rounded-br-sm'
              : 'bg-[#252540] text-slate-100 rounded-2xl rounded-bl-sm'
          }`}
        >
          {msg.content}

          {/* Reaction toolbar */}
          {showReactions && (
            <div
              className={`absolute -top-9 ${
                isOwn ? 'right-0' : 'left-0'
              } flex items-center gap-0.5 bg-[#2a2a4a] border border-white/[0.06] rounded-xl px-2 py-1 shadow-xl z-10`}
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className="text-base hover:scale-125 transition-transform cursor-pointer px-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {emoji}
                </button>
              ))}
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 cursor-pointer">
                <Reply size={13} />
              </button>
              <button className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 cursor-pointer">
                <MoreHorizontal size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-slate-600 mt-1 px-0.5">
          {formatMsgTime(msg.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pb-2">
      <div className="flex gap-1 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-slate-500 italic">{name} is typing…</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user } = useAuth();

  // Conversations
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [convoLoading, setConvoLoading] = useState(true);
  const [convoSearch, setConvoSearch] = useState('');

  // Active conversation
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeConvo, setActiveConvo] = useState<DMConversation | null>(null);

  // Messages
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);

  // Compose
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New Chat Modal
  const [showNewChat, setShowNewChat] = useState(false);

  // Typing indicator (demo only — would be socket-driven in production)
  const [isTypingShown] = useState(false);

  // ── Fetch Conversations ──────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setConvoLoading(true);
    try {
      const res = await api.get('/direct-messages/conversations');
      setConversations(res.data.conversations ?? res.data ?? []);
    } catch {
      // Try fallback endpoint
      try {
        const res2 = await api.get('/direct-messages');
        setConversations(res2.data.conversations ?? res2.data ?? []);
      } catch {
        setConversations([]);
      }
    } finally {
      setConvoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ── Fetch Messages ────────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (userId: string) => {
    setMsgLoading(true);
    try {
      const res = await api.get(`/direct-messages/${userId}`);
      setMessages(res.data.messages ?? res.data ?? []);
    } catch {
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeUserId) {
      fetchMessages(activeUserId);
    }
  }, [activeUserId, fetchMessages]);

  // ── Scroll to bottom ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Select Conversation ───────────────────────────────────────────────────────
  const selectConversation = (conv: DMConversation) => {
    setActiveUserId(conv.userId);
    setActiveConvo(conv);
    setDraft('');
  };

  // ── Start New Chat From Modal ─────────────────────────────────────────────────
  const handleNewChatSelect = (u: User) => {
    const existing = conversations.find((c) => c.userId === u.id);
    if (existing) {
      selectConversation(existing);
    } else {
      const synthetic: DMConversation = {
        userId: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl,
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
        presence: 'offline',
      };
      setConversations((prev) => [synthetic, ...prev]);
      selectConversation(synthetic);
    }
    setShowNewChat(false);
  };

  // ── Send Message ──────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!draft.trim() || !activeUserId || sending) return;
    const content = draft.trim();
    setDraft('');
    setSending(true);

    const optimistic: DMMessage = {
      id: `opt-${Date.now()}`,
      senderId: user?.id ?? '',
      receiverId: activeUserId,
      content,
      createdAt: new Date().toISOString(),
      senderName: user?.name ?? 'You',
      senderAvatarUrl: user?.avatarUrl,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await api.post('/direct-messages', {
        receiverId: activeUserId,
        content,
      });
      const saved: DMMessage = res.data.message ?? res.data;
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
      // Refresh conversations to update last message
      fetchConversations();
    } catch {
      // Revert on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Filtered conversations ────────────────────────────────────────────────────
  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(convoSearch.toLowerCase())
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-[#1e1e35]">
      {/* ── Left Panel ─────────────────────────────────────────────────────────── */}
      <div className="w-[260px] shrink-0 bg-[#1a1a2e] border-r border-white/[0.06] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">
            Direct Messages
          </span>
          <button
            onClick={() => setShowNewChat(true)}
            className="text-slate-400 hover:text-slate-100 hover:bg-white/5 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="New Chat"
          >
            <PenSquare size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2">
            <Search size={13} className="text-slate-500 shrink-0" />
            <input
              value={convoSearch}
              onChange={(e) => setConvoSearch(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {convoLoading ? (
            <ConversationSkeleton />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pb-20 px-4 text-center">
              <MessageSquare size={36} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 font-medium">No conversations yet</p>
              <p className="text-xs text-slate-600 mt-1">Start chatting with someone!</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-4 text-xs bg-[#5B5FC7] hover:bg-[#4f52b2] text-white font-semibold rounded-xl px-3 py-1.5 transition-colors cursor-pointer"
              >
                New Message
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 px-2 pb-3">
              {filtered.map((conv) => {
                const isActive = activeUserId === conv.userId;
                return (
                  <button
                    key={conv.userId}
                    onClick={() => selectConversation(conv)}
                    className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all cursor-pointer text-left group relative ${
                      isActive
                        ? 'bg-[#5B5FC7]/15'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Active accent bar */}
                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#818cf8] rounded-full" />
                    )}

                    {/* Avatar + presence */}
                    <div className="relative shrink-0">
                      <Avatar name={conv.name} src={conv.avatarUrl} size="sm" />
                      <PresenceDot presence={conv.presence} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-medium truncate ${
                            isActive ? 'text-[#818cf8]' : 'text-slate-100'
                          }`}
                        >
                          {conv.name}
                        </span>
                        {conv.lastMessageAt && (
                          <span className="text-[10px] text-slate-600 ml-1 shrink-0">
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-slate-500 truncate">
                          {conv.lastMessage ?? 'No messages yet'}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="ml-1 shrink-0 min-w-[18px] h-[18px] bg-[#5B5FC7] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Area ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeConvo ? (
          /* No conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-[#252540] border border-white/[0.06] flex items-center justify-center">
              <MessageSquare size={36} className="text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-300">
                Select a conversation
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Or start a new one with the pencil icon
              </p>
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              className="bg-[#5B5FC7] hover:bg-[#4f52b2] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors cursor-pointer"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <>
            {/* ── Conversation Header ───────────────────────────────────────── */}
            <div className="h-12 border-b border-white/[0.06] flex items-center px-4 gap-3 shrink-0 bg-[#1e1e35]">
              <div className="relative shrink-0">
                <Avatar name={activeConvo.name} src={activeConvo.avatarUrl} size="sm" />
                <PresenceDot presence={activeConvo.presence} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100 truncate">
                    {activeConvo.name}
                  </span>
                  <span className="text-xs text-slate-500 capitalize">
                    • {activeConvo.presence}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors cursor-pointer">
                  <Phone size={16} />
                </button>
                <button className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors cursor-pointer">
                  <Video size={16} />
                </button>
                <button className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors cursor-pointer">
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {/* ── Messages Area ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {msgLoading ? (
                <MessageSkeleton />
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#252540] border border-white/[0.06] flex items-center justify-center">
                    <MessageSquare size={28} className="text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-400">
                    Send the first message to{' '}
                    <span className="text-slate-200 font-medium">{activeConvo.name}</span>
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={msg.senderId === user?.id}
                  />
                ))
              )}

              {/* Typing indicator */}
              {isTypingShown && <TypingIndicator name={activeConvo.name} />}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Compose Area ──────────────────────────────────────────────── */}
            <div className="border-t border-white/[0.06] bg-[#1a1a2e] px-4 py-3 shrink-0">
              {/* Formatting bar */}
              <div className="flex items-center gap-1 mb-2">
                <button className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer">
                  <Bold size={13} />
                </button>
                <button className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer">
                  <Italic size={13} />
                </button>
                <button className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer">
                  <Code2 size={13} />
                </button>
              </div>

              {/* Input row */}
              <div className="flex items-end gap-2">
                <div className="flex-1 bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2 flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeConvo.name}…`}
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none resize-none max-h-32 leading-relaxed"
                    style={{ minHeight: '20px' }}
                  />
                  <div className="flex items-center gap-1 pb-0.5 shrink-0">
                    <button className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer">
                      <Paperclip size={15} />
                    </button>
                    <button className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer">
                      <Smile size={15} />
                    </button>
                    <button className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer">
                      <Image size={15} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  className="shrink-0 w-9 h-9 rounded-xl bg-[#5B5FC7] hover:bg-[#4f52b2] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── New Chat Modal ─────────────────────────────────────────────────────── */}
      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} onSelect={handleNewChatSelect} />
      )}
    </div>
  );
}
