'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  ChevronRight,
  Hash,
  Users,
  FileText,
  StickyNote,
  Bold,
  Italic,
  Code,
  List,
  Paperclip,
  Smile,
  Image,
  Send,
  MoreHorizontal,
  MessageSquare,
  X,
  ChevronDown,
  AlertCircle,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface Channel {
  id: string;
  name: string;
  teamId: string;
  description?: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  channelId: string;
}

type ChannelTab = 'Posts' | 'Files' | 'Notes';
type Priority = 'Standard' | 'Important' | 'Urgent';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────

function renderMarkdownLite(text: string): JSX.Element[] {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const parts: (string | JSX.Element)[] = [];
    let remaining = line;
    let key = 0;

    // bold **text**
    remaining = remaining.replace(/\*\*(.+?)\*\*/g, (_, m) => `%%BOLD:${m}%%`);
    // italic *text*
    remaining = remaining.replace(/\*(.+?)\*/g, (_, m) => `%%ITALIC:${m}%%`);
    // code `text`
    remaining = remaining.replace(/`(.+?)`/g, (_, m) => `%%CODE:${m}%%`);

    const tokens = remaining.split(/(%%BOLD:.+?%%|%%ITALIC:.+?%%|%%CODE:.+?%%)/g);
    for (const token of tokens) {
      if (token.startsWith('%%BOLD:')) {
        parts.push(<strong key={key++} className="font-semibold text-slate-100">{token.slice(7, -2)}</strong>);
      } else if (token.startsWith('%%ITALIC:')) {
        parts.push(<em key={key++} className="italic text-slate-300">{token.slice(9, -2)}</em>);
      } else if (token.startsWith('%%CODE:')) {
        parts.push(
          <code key={key++} className="px-1 py-0.5 rounded bg-white/10 text-[#22d3ee] font-mono text-[12px]">
            {token.slice(7, -2)}
          </code>
        );
      } else {
        parts.push(token);
      }
    }

    return (
      <span key={idx} className="block leading-relaxed">
        {parts}
        {idx < lines.length - 1 && <br />}
      </span>
    );
  });
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function NoTeamSelected() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 select-none">
      <div className="relative">
        <div className="absolute inset-0 -m-8 rounded-full bg-[#5B5FC7]/5 blur-3xl" />
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Background circles */}
          <circle cx="60" cy="60" r="50" fill="#252540" />
          <circle cx="60" cy="60" r="50" stroke="#5B5FC7" strokeWidth="1" strokeOpacity="0.2" />
          {/* Channel hash */}
          <text x="60" y="72" textAnchor="middle" fontSize="42" fill="#5B5FC7" fillOpacity="0.3" fontWeight="900" fontFamily="Inter, sans-serif">#</text>
          {/* Sparkle */}
          <line x1="96" y1="22" x2="96" y2="32" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
          <line x1="91" y1="27" x2="101" y2="27" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
          <circle cx="26" cy="88" r="3" fill="#818cf8" fillOpacity="0.5" />
          <circle cx="90" cy="92" r="2" fill="#22d3ee" fillOpacity="0.4" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-semibold text-base">Select a channel to start collaborating</p>
        <p className="text-slate-600 text-sm mt-1.5 max-w-[260px]">Choose a team and channel from the left panel to view conversations.</p>
      </div>
    </div>
  );
}

function NoTeams({ onCreateTeam }: { onCreateTeam: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4 py-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#5B5FC7]/15 flex items-center justify-center">
        <Users className="w-7 h-7 text-[#818cf8]" />
      </div>
      <div>
        <p className="text-slate-300 font-semibold text-sm">No teams yet</p>
        <p className="text-slate-600 text-xs mt-1 leading-relaxed">Create a team to start collaborating with your colleagues.</p>
      </div>
      <button
        onClick={onCreateTeam}
        className="bg-[#5B5FC7] hover:bg-[#4f52b2] text-white font-semibold rounded-xl px-4 py-2 text-sm cursor-pointer transition-colors"
      >
        Create your first team
      </button>
    </div>
  );
}

function NoMessages({ channelName }: { channelName: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 py-16 select-none">
      <div className="w-16 h-16 rounded-2xl bg-[#5B5FC7]/15 flex items-center justify-center">
        <MessageSquare className="w-8 h-8 text-[#818cf8]" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-semibold text-sm">Start the conversation in #{channelName}</p>
        <p className="text-slate-600 text-xs mt-1.5 max-w-[280px]">Be the first to post a message. Share ideas, files, or updates with your team.</p>
      </div>
    </div>
  );
}

function FilesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 py-16 select-none">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] border-dashed flex items-center justify-center">
        <FileText className="w-8 h-8 text-slate-600" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-semibold text-sm">No files shared yet</p>
        <p className="text-slate-600 text-xs mt-1.5 max-w-[260px]">Drag &amp; drop a file to share it with the channel.</p>
      </div>
    </div>
  );
}

function NotesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 py-16 select-none">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
        <StickyNote className="w-8 h-8 text-slate-600" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-semibold text-sm">No meeting notes yet</p>
        <p className="text-slate-600 text-xs mt-1.5 max-w-[260px]">Notes from meetings in this channel will appear here automatically.</p>
      </div>
    </div>
  );
}

// ─── Priority Dropdown ────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: Priority; label: string; icon: JSX.Element; color: string }[] = [
  { value: 'Standard', label: 'Standard', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-slate-400' },
  { value: 'Important', label: 'Important', icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'text-amber-400' },
  { value: 'Urgent', label: 'Urgent', icon: <Zap className="w-3.5 h-3.5" />, color: 'text-red-400' },
];

function PriorityDropdown({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (v: Priority) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = PRIORITY_OPTIONS.find((o) => o.value === value)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.06] text-[11px] font-medium transition-colors cursor-pointer ${selected.color}`}
      >
        {selected.icon}
        <span>{selected.label}</span>
        <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 bg-[#2a2a4a] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden w-36 py-1">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium hover:bg-white/[0.06] transition-colors cursor-pointer ${opt.color} ${value === opt.value ? 'bg-white/[0.04]' : ''}`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Message Item ─────────────────────────────────────────────────────────────

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮'];

function MessageItem({ message }: { message: Message }) {
  const [hovered, setHovered] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>({});

  const addReaction = (emoji: string) => {
    setReactions((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
  };

  return (
    <div
      className="group relative flex gap-3 px-5 py-2.5 hover:bg-white/[0.02] rounded-lg transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        <Avatar name={message.senderName} size="md" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-slate-100">{message.senderName}</span>
          <span className="text-[11px] text-slate-600">{formatTimestamp(message.createdAt)}</span>
        </div>
        <div className="text-[13px] text-slate-300 leading-relaxed">
          {renderMarkdownLite(message.content)}
        </div>
        {/* Reaction badges */}
        {Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(reactions).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => addReaction(emoji)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#5B5FC7]/15 border border-[#5B5FC7]/25 text-[11px] text-slate-300 hover:bg-[#5B5FC7]/25 cursor-pointer transition-colors"
              >
                <span>{emoji}</span>
                <span className="text-[#818cf8] font-medium">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover toolbar */}
      {hovered && (
        <div className="absolute right-4 top-1.5 flex items-center gap-0.5 bg-[#2a2a4a] border border-white/[0.08] rounded-xl px-1.5 py-1 shadow-xl z-10">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addReaction(emoji)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-base cursor-pointer transition-colors"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <button
            className="flex items-center gap-1 px-2 h-7 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
            title="Reply"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/10 cursor-pointer transition-colors"
            title="More options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Compose Box ──────────────────────────────────────────────────────────────

function ComposeBox({
  channelId,
  channelName,
  onMessageSent,
}: {
  channelId: string;
  channelName: string;
  onMessageSent: (msg: Message) => void;
}) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('Standard');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const insertFormat = (wrap: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = text.slice(start, end);
    const newText = text.slice(0, start) + wrap + selected + wrap + text.slice(end);
    setText(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + wrap.length, end + wrap.length);
    }, 0);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/channels/${channelId}/messages`, {
        content: trimmed,
        priority,
      });
      onMessageSent(res.data as Message);
      setText('');
      setPriority('Standard');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch {
      // silently fail — in production show toast
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="shrink-0 px-5 pb-5 pt-2">
      <div className="bg-[#252540] border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5 px-3 pt-2.5 pb-1.5 border-b border-white/[0.04]">
          <button
            onClick={() => insertFormat('**')}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormat('*')}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertFormat('`')}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
            title="Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
            title="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
            title="Emoji"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
            title="GIF"
          >
            <Image className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          rows={2}
          className="w-full bg-transparent px-4 py-3 text-[13px] text-slate-200 placeholder-slate-600 outline-none resize-none leading-relaxed"
          style={{ minHeight: '60px', maxHeight: '200px' }}
        />

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-2">
          <PriorityDropdown value={priority} onChange={setPriority} />

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-700 hidden sm:block">⏎ send · ⇧⏎ newline</span>
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer
                ${text.trim() && !sending
                  ? 'bg-[#5B5FC7] hover:bg-[#4f52b2] text-white'
                  : 'bg-white/5 text-slate-600 cursor-not-allowed'
                }`}
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="relative bg-[#252540] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-slate-100 font-bold text-base">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── New Team Modal ────────────────────────────────────────────────────────────

function NewTeamModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (team: Team) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Team name is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/teams', { name: name.trim(), description: description.trim() });
      onCreated(res.data as Team);
      onClose();
    } catch {
      setError('Failed to create team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create a new team" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Team Name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. Engineering, Design, Marketing"
            className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-[#5B5FC7]/50 transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Description <span className="text-slate-700 normal-case font-normal">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this team about?"
            className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-[#5B5FC7]/50 transition-colors"
          />
        </div>
        {error && (
          <p className="text-red-400 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl px-3 py-1.5 text-sm cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="bg-[#5B5FC7] hover:bg-[#4f52b2] text-white font-semibold rounded-xl px-4 py-2 text-sm cursor-pointer transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Create Team'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Add Channel Modal ─────────────────────────────────────────────────────────

function AddChannelModal({
  team,
  onClose,
  onCreated,
}: {
  team: Team;
  onClose: () => void;
  onCreated: (channel: Channel) => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Channel name is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/teams/${team.id}/channels`, {
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      });
      onCreated(res.data as Channel);
      onClose();
    } catch {
      setError('Failed to create channel. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Add channel to ${team.name}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Channel Name
          </label>
          <div className="flex items-center gap-2 bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2 focus-within:border-[#5B5FC7]/50 transition-colors">
            <Hash className="w-4 h-4 text-slate-600 shrink-0" />
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="general, announcements, random"
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            />
          </div>
          <p className="text-slate-700 text-[11px] mt-1.5">Spaces will be replaced with hyphens.</p>
        </div>
        {error && (
          <p className="text-red-400 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl px-3 py-1.5 text-sm cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="bg-[#5B5FC7] hover:bg-[#4f52b2] text-white font-semibold rounded-xl px-4 py-2 text-sm cursor-pointer transition-colors disabled:opacity-60"
          >
            {loading ? 'Adding…' : 'Add Channel'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Team Row ─────────────────────────────────────────────────────────────────

function TeamRow({
  team,
  channels,
  selectedChannelId,
  onSelectChannel,
  onAddChannel,
  loadingChannels,
}: {
  team: Team;
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (channel: Channel) => void;
  onAddChannel: (team: Team) => void;
  loadingChannels: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      {/* Team header row */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.04] rounded-xl cursor-pointer group transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <ChevronRight
          className={`w-3.5 h-3.5 text-slate-600 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
        {/* Avatar initials */}
        <div className="w-6 h-6 rounded-md bg-[#5B5FC7]/30 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-black text-[#818cf8]">{getInitials(team.name)}</span>
        </div>
        <span className="text-slate-300 text-[13px] font-medium truncate flex-1">{team.name}</span>
        {/* Add channel button (appears on hover) */}
        <button
          onClick={(e) => { e.stopPropagation(); onAddChannel(team); }}
          className="w-5 h-5 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/10 opacity-0 group-hover:opacity-100 cursor-pointer transition-all"
          title="Add channel"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Channels */}
      {expanded && (
        <div className="ml-5 mt-0.5 mb-1">
          {loadingChannels ? (
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-3 h-3 rounded-full border border-[#5B5FC7]/50 border-t-transparent animate-spin" />
              <span className="text-slate-600 text-xs">Loading…</span>
            </div>
          ) : channels.length === 0 ? (
            <button
              onClick={() => onAddChannel(team)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate-600 hover:text-[#818cf8] cursor-pointer transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add a channel
            </button>
          ) : (
            channels.map((channel) => {
              const isActive = selectedChannelId === channel.id;
              return (
                <div
                  key={channel.id}
                  onClick={() => onSelectChannel(channel)}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors
                    ${isActive
                      ? 'bg-[#5B5FC7]/15 text-[#818cf8]'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                    }`}
                >
                  {/* Active left accent bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#818cf8] rounded-full" />
                  )}
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[13px] font-medium truncate">{channel.name}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { user } = useAuth();

  // Teams & channels state
  const [teams, setTeams] = useState<Team[]>([]);
  const [channelsByTeam, setChannelsByTeam] = useState<Record<string, Channel[]>>({});
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState<Record<string, boolean>>({});

  // Selection
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<ChannelTab>('Posts');

  // Modals
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [addChannelForTeam, setAddChannelForTeam] = useState<Team | null>(null);

  // ── Fetch teams on mount ──
  useEffect(() => {
    let cancelled = false;
    async function fetchTeams() {
      setLoadingTeams(true);
      try {
        const res = await api.get('/teams');
        if (!cancelled) {
          const data = res.data as Team[];
          setTeams(data);
          // Fetch channels for each team
          data.forEach((team) => fetchChannels(team.id));
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    }
    fetchTeams();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Fetch channels for a team ──
  const fetchChannels = useCallback(async (teamId: string) => {
    setLoadingChannels((p) => ({ ...p, [teamId]: true }));
    try {
      const res = await api.get(`/teams/${teamId}/channels`);
      setChannelsByTeam((p) => ({ ...p, [teamId]: res.data as Channel[] }));
    } catch {
      setChannelsByTeam((p) => ({ ...p, [teamId]: [] }));
    } finally {
      setLoadingChannels((p) => ({ ...p, [teamId]: false }));
    }
  }, []);

  // ── Fetch messages when channel changes ──
  useEffect(() => {
    if (!selectedChannel) return;
    let cancelled = false;
    async function fetchMessages() {
      setLoadingMessages(true);
      setMessages([]);
      try {
        const res = await api.get(`/channels/${selectedChannel!.id}/messages`);
        if (!cancelled) setMessages(res.data as Message[]);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }
    fetchMessages();
    return () => { cancelled = true; };
  }, [selectedChannel]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setActiveTab('Posts');
    const team = teams.find((t) => t.id === channel.teamId);
    if (team) setSelectedTeam(team);
  };

  const handleTeamCreated = (team: Team) => {
    setTeams((p) => [...p, team]);
    setChannelsByTeam((p) => ({ ...p, [team.id]: [] }));
  };

  const handleChannelCreated = (channel: Channel) => {
    setChannelsByTeam((p) => ({
      ...p,
      [channel.teamId]: [...(p[channel.teamId] ?? []), channel],
    }));
  };

  const handleMessageSent = (msg: Message) => {
    setMessages((p) => [...p, msg]);
  };

  const TABS: ChannelTab[] = ['Posts', 'Files', 'Notes'];

  return (
    <div className="flex h-full bg-[#1e1e35] overflow-hidden">
      {/* ── Left Sub-Panel ── */}
      <div className="w-[260px] shrink-0 bg-[#1a1a2e] border-r border-white/[0.06] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 shrink-0 border-b border-white/[0.06]">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Teams</span>
          <button
            onClick={() => setShowNewTeam(true)}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl px-2 py-1.5 text-[11px] font-medium cursor-pointer transition-colors"
            title="New Team"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Teams list */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {loadingTeams ? (
            <div className="flex flex-col gap-2 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-white/5 animate-pulse" />
                  <div className="h-3 rounded-full bg-white/5 animate-pulse flex-1" />
                </div>
              ))}
            </div>
          ) : teams.length === 0 ? (
            <NoTeams onCreateTeam={() => setShowNewTeam(true)} />
          ) : (
            teams.map((team) => (
              <TeamRow
                key={team.id}
                team={team}
                channels={channelsByTeam[team.id] ?? []}
                selectedChannelId={selectedChannel?.id ?? null}
                onSelectChannel={handleSelectChannel}
                onAddChannel={(t) => setAddChannelForTeam(t)}
                loadingChannels={loadingChannels[team.id] ?? false}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t border-white/[0.06]">
          <button
            onClick={() => setShowNewTeam(true)}
            className="text-[12px] text-slate-500 hover:text-[#818cf8] cursor-pointer transition-colors w-full text-left"
          >
            + Join or create a team
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selectedChannel ? (
          <NoTeamSelected />
        ) : (
          <>
            {/* Channel header */}
            <div className="h-14 flex items-center gap-3 px-5 bg-[#1a1a2e] border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Hash className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-slate-100 font-semibold text-sm truncate">{selectedChannel.name}</span>
                {selectedTeam && (
                  <>
                    <span className="text-slate-700 text-xs hidden sm:block">·</span>
                    <span className="text-slate-600 text-xs truncate hidden sm:block">{selectedTeam.name}</span>
                  </>
                )}
              </div>
              {/* Tab bar */}
              <div className="flex items-center gap-0.5">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-colors
                      ${activeTab === tab
                        ? 'bg-[#5B5FC7]/15 text-[#818cf8]'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            {activeTab === 'Posts' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Messages area */}
                <div className="flex-1 overflow-y-auto py-4">
                  {loadingMessages ? (
                    <div className="flex flex-col gap-4 px-5 py-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse shrink-0" />
                          <div className="flex-1 flex flex-col gap-2">
                            <div className="h-3 w-24 rounded-full bg-white/5 animate-pulse" />
                            <div className="h-3 w-48 rounded-full bg-white/5 animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <NoMessages channelName={selectedChannel.name} />
                  ) : (
                    <>
                      {messages.map((msg) => (
                        <MessageItem key={msg.id} message={msg} />
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Compose box */}
                <ComposeBox
                  channelId={selectedChannel.id}
                  channelName={selectedChannel.name}
                  onMessageSent={handleMessageSent}
                />
              </div>
            )}

            {activeTab === 'Files' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <FilesEmptyState />
              </div>
            )}

            {activeTab === 'Notes' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <NotesEmptyState />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {showNewTeam && (
        <NewTeamModal
          onClose={() => setShowNewTeam(false)}
          onCreated={handleTeamCreated}
        />
      )}
      {addChannelForTeam && (
        <AddChannelModal
          team={addChannelForTeam}
          onClose={() => setAddChannelForTeam(null)}
          onCreated={handleChannelCreated}
        />
      )}
    </div>
  );
}
