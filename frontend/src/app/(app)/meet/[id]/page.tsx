'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  Suspense,
} from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Users,
  MessageSquare,
  Shield,
  Smile,
  Grid,
  LayoutList,
  MoreHorizontal,
  PhoneOff,
  ChevronUp,
  HelpCircle,
  BarChart3,
  X,
  Send,
  Search,
  Lock,
  Signal,
  ArrowLeft,
  Plus,
  UserPlus,
  Maximize2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';
import { useSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
type ActivePanel = null | 'chat' | 'participants' | 'qa' | 'poll';
type ViewMode = 'gallery' | 'speaker';

interface FloatingReaction {
  id: string;
  emoji: string;
  left: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

interface QAQuestion {
  id: string;
  author: string;
  text: string;
  upvotes: number;
  upvoted: boolean;
}

interface ParticipantInfo {
  userId: string;
  userName: string;
  socketId: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function nowTimeString(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ═══════════════════════════════════════════════════════════════
   FLOATING REACTION ITEM
   ═══════════════════════════════════════════════════════════════ */
function FloatingReactionItem({ emoji, left }: { emoji: string; left: number }) {
  const [opacity, setOpacity] = useState(1);
  const [bottom, setBottom] = useState(80);

  useEffect(() => {
    const start = Date.now();
    const duration = 2800;
    const raf = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setBottom(80 + progress * 220);
      setOpacity(1 - progress);
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, []);

  return (
    <div
      className="absolute pointer-events-none text-3xl select-none"
      style={{ left: `${left}%`, bottom: `${bottom}px`, opacity, transition: 'none' }}
    >
      {emoji}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EMOJI POPOVER
   ═══════════════════════════════════════════════════════════════ */
const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '🎉', '🎊', '✋', '🙏'];

function EmojiPopover({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#252540] border border-white/[0.06] rounded-2xl p-3 shadow-2xl z-50"
    >
      <div className="grid grid-cols-4 gap-2">
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MORE MENU
   ═══════════════════════════════════════════════════════════════ */
function MoreMenu({
  onBreakout,
  onClose,
}: {
  onBreakout: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    { label: 'Breakout Rooms', icon: Users, action: onBreakout },
    { label: 'Live Captions', icon: MessageSquare, action: onClose },
    { label: 'Record Meeting', icon: Maximize2, action: onClose },
    { label: 'Meeting Info', icon: HelpCircle, action: onClose },
  ];

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#252540] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl z-50 min-w-[180px]"
    >
      {items.map(({ label, icon: Icon, action }) => (
        <button
          key={label}
          onClick={() => { action(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-slate-100 transition-colors cursor-pointer text-left"
        >
          <Icon className="w-4 h-4 text-slate-500" />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MOBILE MORE MENU
   ═══════════════════════════════════════════════════════════════ */
function MobileMoreMenu({
  onClose,
  sharing,
  startScreenShare,
  stopScreenShare,
  togglePanel,
  showEmojiPicker,
  setShowEmojiPicker,
  viewMode,
  setViewMode,
}: {
  onClose: () => void;
  sharing: boolean;
  startScreenShare: () => void;
  stopScreenShare: () => void;
  togglePanel: (panel: ActivePanel) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-3 right-0 bg-[#252540] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl z-50 min-w-[200px]"
    >
      {/* Screen Share */}
      <button
        onClick={() => {
          if (sharing) stopScreenShare();
          else startScreenShare();
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-slate-100 transition-colors text-left cursor-pointer"
      >
        <Monitor className="w-4 h-4 text-slate-500" />
        <span>{sharing ? 'Stop Sharing' : 'Share Screen'}</span>
      </button>

      {/* Q&A */}
      <button
        onClick={() => {
          togglePanel('qa');
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-slate-100 transition-colors text-left cursor-pointer"
      >
        <HelpCircle className="w-4 h-4 text-slate-500" />
        <span>Q&amp;A</span>
      </button>

      {/* View Toggle */}
      <button
        onClick={() => {
          setViewMode(viewMode === 'gallery' ? 'speaker' : 'gallery');
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-slate-100 transition-colors text-left cursor-pointer"
      >
        <Grid className="w-4 h-4 text-slate-500" />
        <span>{viewMode === 'gallery' ? 'Speaker View' : 'Gallery View'}</span>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BREAKOUT ROOMS MODAL
   ═══════════════════════════════════════════════════════════════ */
function BreakoutRoomsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#252540] border border-white/[0.06] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-bold text-slate-100">Breakout Rooms</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg p-1.5 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <div className="w-14 h-14 bg-[#5B5FC7]/10 rounded-2xl flex items-center justify-center border border-[#5B5FC7]/20">
              <Users className="w-6 h-6 text-[#818cf8]" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No breakout rooms created</p>
            <p className="text-xs text-slate-500 text-center max-w-[200px]">
              Create breakout rooms to split participants into smaller groups.
            </p>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#5B5FC7] hover:bg-[#4f52b2] text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer">
              <Plus className="w-4 h-4" />
              Create Rooms
            </button>
            <button
              disabled
              className="flex-1 py-2.5 border border-white/[0.06] text-slate-600 rounded-xl text-sm font-medium cursor-not-allowed"
            >
              Open All Rooms
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PARTICIPANTS PANEL
   ═══════════════════════════════════════════════════════════════ */
function ParticipantsPanel({
  userName,
  avatarUrl,
  participants,
  onClose,
}: {
  userName: string;
  avatarUrl: string | null;
  participants: ParticipantInfo[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const filteredParticipants = participants.filter((p) =>
    p.userName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#818cf8]" />
          <span className="text-sm font-semibold text-slate-100">Participants</span>
          <span className="bg-[#5B5FC7]/20 text-[#818cf8] text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            {participants.length + 1}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg p-1.5 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participants..."
            className="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
            In meeting · {filteredParticipants.length + 1}
          </span>
        </div>

        {/* You entry */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group">
          <Avatar name={userName} src={avatarUrl} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-200 font-medium truncate">{userName}</span>
              <span className="text-[9px] bg-[#5B5FC7]/20 text-[#818cf8] px-1.5 py-0.5 rounded font-bold">Host</span>
              <span className="text-[9px] text-slate-600">(You)</span>
            </div>
          </div>
        </div>

        {/* Remote entries */}
        {filteredParticipants.map((p) => (
          <div
            key={p.socketId}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
          >
            <Avatar name={p.userName} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-200 font-medium truncate">{p.userName}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {p.isMuted ? (
                <MicOff className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-slate-500" />
              )}
            </div>
          </div>
        ))}

        {/* Empty state for other participants */}
        {participants.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 mt-2">
            <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/[0.06]">
              <UserPlus className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-xs text-slate-600 text-center">
              Waiting for others to join
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/[0.06] shrink-0">
        <button
          onClick={() => {
            const link = window.location.href;
            navigator.clipboard.writeText(link);
            alert('Meeting link copied to clipboard!');
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#5B5FC7] hover:bg-[#4f52b2] text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer border border-transparent"
        >
          <UserPlus className="w-4 h-4" />
          Copy Meet Link
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHAT PANEL
   ═══════════════════════════════════════════════════════════════ */
function ChatPanel({
  messages,
  onSend,
  onClose,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#818cf8]" />
          <span className="text-sm font-semibold text-slate-100">Meeting Chat</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg p-1.5 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/[0.06]">
              <MessageSquare className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No messages yet</p>
            <p className="text-xs text-slate-600 text-center">Say hello! Messages are visible to everyone.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-slate-300">{msg.sender}</span>
                <span className="text-[10px] text-slate-600">{msg.time}</span>
              </div>
              <p className="text-[13px] text-slate-400 leading-relaxed">{msg.text}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-white/[0.06] shrink-0">
        <div className="flex items-end gap-2 bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2">
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Send a message to everyone..."
            className="flex-1 bg-transparent text-[13px] text-slate-200 placeholder-slate-600 outline-none resize-none max-h-32 leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className="shrink-0 text-[#5B5FC7] hover:text-[#818cf8] disabled:text-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed p-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Q&A PANEL
   ═══════════════════════════════════════════════════════════════ */
function QAPanel({
  questions,
  onAsk,
  onUpvote,
  onClose,
  userName,
}: {
  questions: QAQuestion[];
  onAsk: (text: string) => void;
  onUpvote: (id: string) => void;
  onClose: () => void;
  userName: string;
}) {
  const [draft, setDraft] = useState('');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#818cf8]" />
          <span className="text-sm font-semibold text-slate-100">Q&amp;A</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg p-1.5 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ask input */}
      <div className="p-4 border-b border-white/[0.06] shrink-0">
        <div className="flex flex-col gap-2">
          <textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your question here..."
            className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-[#5B5FC7]/50 resize-none transition-colors"
          />
          <button
            onClick={() => { if (draft.trim()) { onAsk(draft.trim()); setDraft(''); } }}
            disabled={!draft.trim()}
            className="self-end px-4 py-2 bg-[#5B5FC7] hover:bg-[#4f52b2] disabled:bg-white/5 disabled:text-slate-600 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </div>

      {/* questions list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/[0.06]">
              <HelpCircle className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No questions yet</p>
            <p className="text-xs text-slate-600 text-center">Be the first to ask!</p>
          </div>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="bg-[#2a2a4a] rounded-xl p-3 flex gap-3 border border-white/[0.06]">
              <button
                onClick={() => onUpvote(q.id)}
                className={`flex flex-col items-center gap-0.5 shrink-0 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  q.upvoted ? 'text-[#818cf8] bg-[#5B5FC7]/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">{q.upvotes}</span>
              </button>
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-[13px] text-slate-300 leading-relaxed">{q.text}</p>
                <span className="text-[10px] text-slate-600">— {q.author}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POLLS PANEL
   ═══════════════════════════════════════════════════════════════ */
function PollsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#818cf8]" />
          <span className="text-sm font-semibold text-slate-100">Polls</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg p-1.5 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center border border-white/[0.06]">
          <BarChart3 className="w-7 h-7 text-slate-600" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-slate-400">No active polls</p>
          <p className="text-xs text-slate-600 text-center max-w-[180px]">
            The host can launch polls during the meeting.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOCAL VIDEO TILE (YOU)
   ═══════════════════════════════════════════════════════════════ */
function LocalVideoTile({
  cameraOn,
  userName,
  avatarUrl,
  isSpeakerView,
  isActive,
  stream,
}: {
  cameraOn: boolean;
  userName: string;
  avatarUrl: string | null;
  isSpeakerView: boolean;
  isActive: boolean;
  stream: MediaStream | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative bg-[#252540] rounded-2xl overflow-hidden border transition-all duration-200 ${
        isActive ? 'ring-2 ring-[#2D8CFF] ring-offset-1 ring-offset-[#1a1a2e] border-transparent' : 'border-white/[0.06]'
      } aspect-video`}
    >
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${cameraOn ? 'block' : 'hidden'}`}
          style={{ transform: 'scaleX(-1)' }}
        />
      )}
      {(!cameraOn || !stream) && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#1e1e35] z-0">
          <Avatar name={userName} src={avatarUrl} size="lg" />
        </div>
      )}
      {/* name label */}
      <div className="absolute bottom-2 left-2 bg-black/50 rounded-lg px-2 py-0.5 z-10">
        <span className="text-[11px] text-white font-medium">{userName} (You)</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REMOTE VIDEO TILE (PARTICIPANTS)
   ═══════════════════════════════════════════════════════════════ */
function RemoteVideoTile({
  participant,
  stream,
  isSpeakerView,
}: {
  participant: ParticipantInfo;
  stream: MediaStream | null;
  isSpeakerView: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const cameraOn = !participant.isCameraOff;

  return (
    <div className="relative bg-[#252540] rounded-2xl overflow-hidden border border-white/[0.06] aspect-video">
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${cameraOn ? 'block' : 'hidden'}`}
        />
      )}
      {(!cameraOn || !stream) && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#1e1e35] z-0">
          <Avatar name={participant.userName} size="lg" />
        </div>
      )}
      {/* name label */}
      <div className="absolute bottom-2 left-2 bg-black/50 rounded-lg px-2 py-0.5 z-10">
        <span className="text-[11px] text-white font-medium">
          {participant.userName} {participant.isMuted ? '🎤❌' : ''}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EMPTY PARTICIPANT TILE
   ═══════════════════════════════════════════════════════════════ */
function WaitingTile() {
  return (
    <div className="relative bg-[#1e1e35] rounded-2xl overflow-hidden border border-white/[0.06] aspect-video flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/[0.06]">
        <Users className="w-5 h-5 text-slate-700" />
      </div>
      <p className="text-[11px] text-slate-700 text-center px-4">Waiting for others to join</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INNER MEETING COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function MeetingRoomInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const socket = useSocket();

  const meetingId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const userName = user?.name ?? 'Guest';
  const avatarUrl = user?.avatarUrl ?? null;
  const userId = user?.id ?? '';

  /* ── search params ── */
  const initVideo = searchParams.get('video') !== 'false';
  const initAudio = searchParams.get('audio') !== 'false';

  /* ── WebRTC hook integration ── */
  const {
    localStream,
    remoteStreams,
    participants,
    chatMessages: webrtcChatMessages,
    isMuted,
    isCameraOff,
    isScreenSharing,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
  } = useWebRTC(meetingId, socket, userId, userName);

  const micOn = !isMuted;
  const cameraOn = !isCameraOff;
  const sharing = isScreenSharing;

  /* ── UI states ── */
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showBreakout, setShowBreakout] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [recording, setRecording] = useState(false);

  /* ── unread chat sync ── */
  const [prevMessagesCount, setPrevMessagesCount] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);

  useEffect(() => {
    if (webrtcChatMessages.length > prevMessagesCount) {
      if (activePanel !== 'chat') {
        setUnreadChat((n) => n + (webrtcChatMessages.length - prevMessagesCount));
      }
      setPrevMessagesCount(webrtcChatMessages.length);
    }
  }, [webrtcChatMessages, activePanel, prevMessagesCount]);

  /* ── map chat messages to UI structure ── */
  const chatMessages = webrtcChatMessages.map((msg, idx) => ({
    id: `${msg.userId}-${idx}`,
    sender: msg.userName,
    text: msg.content,
    time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  /* ── duration timer ── */
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* ── floating reactions ── */
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const addReaction = useCallback((emoji: string) => {
    const id = crypto.randomUUID();
    const left = 10 + Math.random() * 80;
    setReactions((prev) => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3000);
  }, []);

  /* ── Q&A (local mockup) ── */
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const askQuestion = useCallback(
    (text: string) => {
      const q: QAQuestion = {
        id: crypto.randomUUID(),
        author: userName,
        text,
        upvotes: 1,
        upvoted: true,
      };
      setQuestions((prev) => [...prev, q]);
    },
    [userName]
  );
  const upvoteQuestion = useCallback((id: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, upvoted: !q.upvoted, upvotes: q.upvoted ? q.upvotes - 1 : q.upvotes + 1 }
          : q
      )
    );
  }, []);

  /* ── panel toggle helper ── */
  const togglePanel = (panel: ActivePanel) => {
    if (panel === 'chat') setUnreadChat(0);
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  /* ── leave ── */
  const handleLeave = () => {
    if (socket) {
      socket.emit('user-leave', { roomId: meetingId, userId });
    }
    router.push('/dashboard');
  };

  /* ── view toggle button dropdown ── */
  const [showViewMenu, setShowViewMenu] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) setShowViewMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="h-screen bg-[#1a1a2e] flex flex-col overflow-hidden">

      {/* ── top bar ── */}
      <div className="h-12 bg-[#141422]/90 flex items-center justify-between px-4 shrink-0 border-b border-white/[0.04] z-10">
        {/* left */}
        <div className="flex items-center gap-3 min-w-0">
          <code className="font-mono text-xs text-slate-400 tracking-widest truncate">{meetingId}</code>
          <div className="flex items-center gap-1 text-green-400">
            <Lock className="w-3 h-3" />
            <span className="text-[10px] font-medium text-green-400/70 hidden sm:block">Encrypted</span>
          </div>
        </div>

        {/* center: timer */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <span className="font-mono text-sm font-semibold text-slate-300 tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>

        {/* right */}
        <div className="flex items-center gap-3">
          {recording && (
            <div className="flex items-center gap-1.5 bg-red-600/20 border border-red-500/30 rounded-lg px-2 py-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-red-400">REC</span>
            </div>
          )}
          <button
            onClick={() => setRecording(!recording)}
            className="text-slate-600 hover:text-slate-300 transition-colors cursor-pointer"
            title="Toggle recording indicator (demo)"
          >
            <Signal className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/[0.06] rounded-lg px-2 py-1">
            <Users className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-semibold text-slate-400">{participants.length + 1}</span>
          </div>
        </div>
      </div>

      {/* ── main area ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── video area ── */}
        <div className="flex-1 flex flex-col min-w-0 relative">

          {/* hand raise banner */}
          {handRaised && (
            <div className="flex items-center justify-between bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 shrink-0">
              <span className="text-sm text-amber-400 font-medium">✋ You raised your hand</span>
              <button
                onClick={() => setHandRaised(false)}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer transition-colors"
              >
                Lower hand
              </button>
            </div>
          )}

          {/* video grid area */}
          <div className="flex-1 relative p-4 overflow-y-auto">

            {/* floating reactions */}
            {reactions.map((r) => (
              <FloatingReactionItem key={r.id} emoji={r.emoji} left={r.left} />
            ))}

            {viewMode === 'gallery' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr content-start">
                <LocalVideoTile
                  cameraOn={cameraOn}
                  userName={userName}
                  avatarUrl={avatarUrl}
                  isSpeakerView={false}
                  isActive={true}
                  stream={localStream}
                />
                {participants.map((p) => (
                  <RemoteVideoTile
                    key={p.socketId}
                    participant={p}
                    stream={remoteStreams[p.socketId] || null}
                    isSpeakerView={false}
                  />
                ))}
                {participants.length === 0 && <WaitingTile />}
              </div>
            ) : (
              /* speaker view */
              <div className="h-full flex flex-col gap-4">
                {/* large speaker tile */}
                <div className="flex-1 min-h-0">
                  {participants.length > 0 ? (
                    <RemoteVideoTile
                      participant={participants[0]}
                      stream={remoteStreams[participants[0].socketId] || null}
                      isSpeakerView={true}
                    />
                  ) : (
                    <LocalVideoTile
                      cameraOn={cameraOn}
                      userName={userName}
                      avatarUrl={avatarUrl}
                      isSpeakerView={true}
                      isActive={true}
                      stream={localStream}
                    />
                  )}
                </div>
                {/* strip of others */}
                <div className="h-32 flex gap-4 overflow-x-auto shrink-0 pb-2">
                  {participants.length > 0 && (
                    <div className="w-56 shrink-0">
                      <LocalVideoTile
                        cameraOn={cameraOn}
                        userName={userName}
                        avatarUrl={avatarUrl}
                        isSpeakerView={false}
                        isActive={false}
                        stream={localStream}
                      />
                    </div>
                  )}
                  {participants.slice(1).map((p) => (
                    <div key={p.socketId} className="w-56 shrink-0">
                      <RemoteVideoTile
                        participant={p}
                        stream={remoteStreams[p.socketId] || null}
                        isSpeakerView={false}
                      />
                    </div>
                  ))}
                  {participants.length === 0 && (
                    <div className="w-56 shrink-0">
                      <WaitingTile />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* live captions */}
          {captionsEnabled && (
            <div className="mx-4 mb-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-2xl shrink-0">
              <p className="text-sm text-slate-400 italic text-center">
                — Live captions will appear here when speaking —
              </p>
            </div>
          )}

          {/* ── bottom controls bar ── */}
          {/* ── bottom controls bar ── */}
          <div className="h-16 bg-[#141422]/95 backdrop-blur border-t border-white/[0.04] shrink-0 z-10">
            {/* Desktop Layout */}
            <div className="hidden md:flex h-full items-center justify-between px-4 relative w-full">
              {/* left group */}
              <div className="flex items-center gap-2">
                <button
                  title="Security"
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer border border-transparent"
                >
                  <Shield className="w-4 h-4" />
                  <span>Security</span>
                </button>
              </div>

              {/* center group */}
              <div className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
                {/* mic */}
                <button
                  onClick={toggleMute}
                  title={micOn ? 'Mute' : 'Unmute'}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border-0 ${
                    micOn
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-red-650 hover:bg-red-700 text-white'
                  }`}
                >
                  {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                {/* camera */}
                <button
                  onClick={toggleCamera}
                  title={cameraOn ? 'Stop Video' : 'Start Video'}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border-0 ${
                    cameraOn
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-red-650 hover:bg-red-700 text-white'
                  }`}
                >
                  {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                {/* screen share */}
                <button
                  onClick={sharing ? stopScreenShare : startScreenShare}
                  title={sharing ? 'Stop Sharing' : 'Share Screen'}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border-0 ${
                    sharing
                      ? 'bg-emerald-650 hover:bg-emerald-700 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Monitor className="w-5 h-5" />
                </button>

                {/* reactions */}
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Reactions"
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 cursor-pointer border-0"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  {showEmojiPicker && (
                    <EmojiPopover
                      onSelect={addReaction}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  )}
                </div>

                {/* more */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    title="More options"
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 cursor-pointer border-0"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {showMoreMenu && (
                    <MoreMenu
                      onBreakout={() => setShowBreakout(true)}
                      onClose={() => setShowMoreMenu(false)}
                    />
                  )}
                </div>
              </div>

              {/* right group */}
              <div className="flex items-center gap-2">
                {/* participants */}
                <button
                  onClick={() => togglePanel('participants')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 h-10 text-xs font-medium transition-all duration-200 cursor-pointer border-0 ${
                    activePanel === 'participants'
                      ? 'bg-[#5B5FC7]/20 text-[#818cf8]'
                      : 'bg-white/10 hover:bg-white/15 text-slate-300'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{participants.length + 1}</span>
                </button>

                {/* chat */}
                <button
                  onClick={() => togglePanel('chat')}
                  className={`relative flex items-center gap-1.5 rounded-xl px-3 h-10 text-xs font-medium transition-all duration-200 cursor-pointer border-0 ${
                    activePanel === 'chat'
                      ? 'bg-[#5B5FC7]/20 text-[#818cf8]'
                      : 'bg-white/10 hover:bg-white/15 text-slate-300'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat</span>
                  {unreadChat > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#5B5FC7] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadChat}
                    </span>
                  )}
                </button>

                {/* Q&A */}
                <button
                  onClick={() => togglePanel('qa')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 h-10 text-xs font-medium transition-all duration-200 cursor-pointer border-0 ${
                    activePanel === 'qa'
                      ? 'bg-[#5B5FC7]/20 text-[#818cf8]'
                      : 'bg-white/10 hover:bg-white/15 text-slate-300'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Q&amp;A</span>
                </button>

                {/* view toggle */}
                <div className="relative" ref={viewMenuRef}>
                  <button
                    onClick={() => setShowViewMenu(!showViewMenu)}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl px-3 h-10 text-xs font-medium transition-all duration-200 cursor-pointer border-0"
                  >
                    {viewMode === 'gallery' ? <Grid className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
                  </button>
                  {showViewMenu && (
                    <div className="absolute bottom-full mb-2 right-0 bg-[#252540] border border-white/[0.06] rounded-xl overflow-hidden shadow-2xl z-50 min-w-[140px]">
                      {([['gallery', 'Gallery View', Grid], ['speaker', 'Speaker View', LayoutList]] as const).map(
                        ([mode, label, Icon]) => (
                          <button
                            key={mode}
                            onClick={() => { setViewMode(mode); setShowViewMenu(false); }}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors cursor-pointer border-0 ${
                              viewMode === mode
                                ? 'bg-[#5B5FC7]/20 text-[#818cf8]'
                                : 'text-slate-300 hover:bg-white/[0.04]'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* leave */}
                <button
                  onClick={handleLeave}
                  title="Leave meeting"
                  className="w-12 h-12 rounded-full bg-red-650 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer border-0"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="flex md:hidden h-full items-center justify-around px-2 relative w-full">
              {/* mic */}
              <button
                onClick={toggleMute}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border-0 ${
                  micOn
                    ? 'bg-white/10 text-white'
                    : 'bg-red-650 text-white'
                }`}
              >
                {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              {/* camera */}
              <button
                onClick={toggleCamera}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border-0 ${
                  cameraOn
                    ? 'bg-white/10 text-white'
                    : 'bg-red-650 text-white'
                }`}
              >
                {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>

              {/* chat toggle */}
              <button
                onClick={() => togglePanel('chat')}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border-0 ${
                  activePanel === 'chat'
                    ? 'bg-[#5B5FC7]/20 text-[#818cf8]'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                {unreadChat > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#5B5FC7] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadChat}
                  </span>
                )}
              </button>

              {/* participants toggle */}
              <button
                onClick={() => togglePanel('participants')}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border-0 ${
                  activePanel === 'participants'
                    ? 'bg-[#5B5FC7]/20 text-[#818cf8]'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                <Users className="w-4 h-4" />
              </button>

              {/* mobile more options */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center transition-all duration-200 cursor-pointer border-0"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showMoreMenu && (
                  <MobileMoreMenu
                    onClose={() => setShowMoreMenu(false)}
                    sharing={sharing}
                    startScreenShare={startScreenShare}
                    stopScreenShare={stopScreenShare}
                    togglePanel={togglePanel}
                    showEmojiPicker={showEmojiPicker}
                    setShowEmojiPicker={setShowEmojiPicker}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                  />
                )}
              </div>

              {/* leave */}
              <button
                onClick={handleLeave}
                className="w-10 h-10 rounded-full bg-red-650 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer border-0"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── right side panel ── */}
        <div
          className={`bg-[#1a1a2e] flex flex-col transition-all duration-300 overflow-hidden ${
            activePanel
              ? 'fixed inset-x-0 bottom-16 top-12 z-20 md:relative md:inset-auto md:w-72 md:xl:w-80 md:flex-shrink-0 md:border-l md:border-white/[0.06]'
              : 'w-0 border-0'
          }`}
        >
          {activePanel === 'participants' && (
            <ParticipantsPanel
              userName={userName}
              avatarUrl={avatarUrl}
              participants={participants}
              onClose={() => setActivePanel(null)}
            />
          )}
          {activePanel === 'chat' && (
            <ChatPanel
              messages={chatMessages}
              onSend={sendChatMessage}
              onClose={() => setActivePanel(null)}
            />
          )}
          {activePanel === 'qa' && (
            <QAPanel
              questions={questions}
              onAsk={askQuestion}
              onUpvote={upvoteQuestion}
              onClose={() => setActivePanel(null)}
              userName={userName}
            />
          )}
          {activePanel === 'poll' && (
            <PollsPanel onClose={() => setActivePanel(null)} />
          )}
        </div>
      </div>

      {/* ── breakout rooms modal ── */}
      {showBreakout && <BreakoutRoomsModal onClose={() => setShowBreakout(false)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE EXPORT
   ═══════════════════════════════════════════════════════════════ */
export default function MeetingRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#1a1a2e] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-[#5B5FC7]/30 border-t-[#5B5FC7] rounded-full animate-spin" />
            <span className="text-sm text-slate-500">Joining meeting…</span>
          </div>
        </div>
      }
    >
      <MeetingRoomInner />
    </Suspense>
  );
}
