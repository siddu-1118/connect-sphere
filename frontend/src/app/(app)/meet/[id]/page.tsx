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
  ChevronUp,
  HelpCircle,
  X,
  Send,
  Search,
  Lock,
  Signal,
  PhoneOff,
  UserPlus,
  Plus,
  Tv,
  MessageCircle,
  HelpCircle as HelpIcon,
  ChevronDown,
  Pencil,
  Check
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';
import Whiteboard from '@/components/meeting/Whiteboard';
import { useSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────
type SidebarTab = 'People' | 'Chat' | 'Q&A';

interface FloatingReaction {
  id: string;
  emoji: string;
  left: number;
}

interface QAQuestion {
  id: string;
  author: string;
  text: string;
  upvotes: number;
  upvoted: boolean;
  createdAt: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

// ─── Floating Reactions Renderer ─────────────────────────────────────────────
function FloatingReactionItem({ emoji, left }: { emoji: string; left: number }) {
  const [opacity, setOpacity] = useState(1);
  const [bottom, setBottom] = useState(80);

  useEffect(() => {
    const start = Date.now();
    const duration = 2500;
    const raf = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setBottom(80 + progress * 240);
      setOpacity(1 - progress);
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, []);

  return (
    <div
      className="absolute pointer-events-none text-3xl select-none z-40 transition-all duration-75"
      style={{ left: `${left}%`, bottom: `${bottom}px`, opacity }}
    >
      {emoji}
    </div>
  );
}

// ─── Inner Meeting Component ─────────────────────────────────────────────────
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

  // 1. WebRTC stream connection hook
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

  // 2. UI panel states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('People');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  // Host settings and whiteboard states
  const [whiteboardActive, setWhiteboardActive] = useState(false);
  const [showBreakoutModal, setShowBreakoutModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    lockMeeting: false,
    enableWaitingRoom: true,
    allowScreenShare: true,
    allowChat: true,
    allowRename: true,
    allowUnmute: true,
    allowStartVideo: true
  });

  // Breakout rooms config states
  const [breakoutStep, setBreakoutStep] = useState<1 | 2>(1);
  const [roomCount, setRoomCount] = useState(2);
  const [assignmentMode, setAssignmentMode] = useState<'auto' | 'manual' | 'choose'>('auto');
  const [autoCloseMinutes, setAutoCloseMinutes] = useState(15);
  const [roomsActive, setRoomsActive] = useState(false);

  // Custom mock assignment lists for breakout step 2 (Premium interaction!)
  const [breakoutRoomsData, setBreakoutRoomsData] = useState<Record<string, string[]>>({
    'Room 1': [],
    'Room 2': [],
  });

  // Re-generate rooms list when count changes in Step 1
  useEffect(() => {
    const newRooms: Record<string, string[]> = {};
    for (let i = 1; i <= roomCount; i++) {
      newRooms[`Room ${i}`] = [];
    }
    setBreakoutRoomsData(newRooms);
  }, [roomCount]);

  // Lists and compose drafts
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [qaDraft, setQaDraft] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');

  // Timer duration
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const micMenuRef = useRef<HTMLDivElement>(null);
  const cameraMenuRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close popup menus on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (micMenuRef.current && !micMenuRef.current.contains(e.target as Node)) setShowMicMenu(false);
      if (cameraMenuRef.current && !cameraMenuRef.current.contains(e.target as Node)) setShowCameraMenu(false);
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Floating reaction emitter
  const triggerReaction = (emoji: string) => {
    const id = crypto.randomUUID();
    const left = 15 + Math.random() * 70;
    setReactions(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2600);
  };

  // Direct DM messages parsing
  const chatMessages = webrtcChatMessages.map((msg, idx) => ({
    id: `${msg.userId}-${idx}`,
    sender: msg.userName,
    text: msg.content,
    time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeTab === 'Chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Direct Message Sending
  const handleSendChatMessage = () => {
    if (!chatDraft.trim()) return;
    sendChatMessage(chatDraft.trim());
    setChatDraft('');
  };

  // Direct Q&A Submitting
  const handleSendQuestion = () => {
    if (!qaDraft.trim()) return;
    const newQ: QAQuestion = {
      id: `qa-${Date.now()}`,
      author: userName,
      text: qaDraft.trim(),
      upvotes: 0,
      upvoted: false,
      createdAt: new Date().toISOString()
    };
    setQuestions(prev => [newQ, ...prev]);
    setQaDraft('');
  };

  const handleUpvoteQuestion = (id: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return {
          ...q,
          upvotes: q.upvoted ? q.upvotes - 1 : q.upvotes + 1,
          upvoted: !q.upvoted
        };
      }
      return q;
    }));
  };

  const handleToggleSidebar = (tab: SidebarTab) => {
    if (sidebarOpen && activeTab === tab) {
      setSidebarOpen(false);
    } else {
      setActiveTab(tab);
      setSidebarOpen(true);
    }
  };

  const handleLeaveMeeting = () => {
    if (socket) {
      socket.emit('user-leave', { roomId: meetingId, userId });
    }
    router.push('/dashboard');
  };

  const videoStyle = (): React.CSSProperties => {
    return { transform: 'scaleX(-1)' };
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-200 font-outfit relative">
      
      {/* ── 1. CALL TOP APP BAR ── */}
      <div className="h-14 bg-slate-905/30 border-b border-slate-900 flex items-center justify-between px-6 shrink-0 z-20 select-none">
        
        {/* Left info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sync Active</span>
          <div className="h-4 w-[1px] bg-slate-900" />
          <code className="font-mono text-xs text-cyan-400 bg-cyan-500/5 px-2.5 py-1 rounded-lg border border-cyan-500/10 tracking-widest truncate uppercase">
            {meetingId}
          </code>
        </div>

        {/* Center Clock timer */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]" />
          <span className="font-mono text-xs font-bold text-slate-350 tabular-nums uppercase tracking-widest">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Right participants summary */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-full shadow-inner select-none shrink-0">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-black text-slate-300">{participants.length + 1} Online</span>
          </div>
        </div>

      </div>

      {/* ── 2. DYNAMIC WORKSPACE STAGE ── */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* VIDEO FEED GRID STAGE */}
        <div className="flex-1 flex flex-col justify-center p-6 min-w-0 transition-all duration-300 relative bg-slate-950/20 select-none">
          
          {/* Reaction bubbles overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
            {reactions.map(r => (
              <FloatingReactionItem key={r.id} emoji={r.emoji} left={r.left} />
            ))}
          </div>

          {/* Core Grid Switcher */}
          {whiteboardActive ? (
            <div className="flex-1 w-full h-full p-2 min-h-0 relative select-none">
              <Whiteboard />
              
              {/* Floating micro-participant-grid in top right corner for Zoom-like PIP feel */}
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 max-w-[200px] pointer-events-none">
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2 backdrop-blur-md shadow-2xl pointer-events-auto">
                  <Avatar name={userName} src={avatarUrl} size="sm" className="border border-slate-700" />
                  <span className="text-[9px] font-bold text-slate-350 truncate max-w-[100px]">{userName} (Host)</span>
                </div>
                {participants.slice(0, 2).map(p => (
                  <div key={p.socketId} className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2 backdrop-blur-md shadow-2xl pointer-events-auto">
                    <Avatar name={p.userName} size="sm" className="border border-slate-800" />
                    <span className="text-[9px] font-bold text-slate-350 truncate max-w-[100px]">{p.userName}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : participants.length === 0 ? (
            
            /* ILLUSTRATED WAITING SINGLE TILE EMPTY STATE */
            <div className="w-full max-w-2xl mx-auto aspect-video bg-slate-900/25 border border-slate-900 rounded-3xl flex flex-col items-center justify-center p-10 text-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
              
              <div className="relative mb-5 select-none">
                <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl scale-75 animate-pulse" />
                <div className="w-24 h-24 rounded-full border border-slate-800 bg-slate-900/60 flex items-center justify-center shadow-2xl relative z-10">
                  <Avatar name={userName} src={avatarUrl} size="lg" className="border border-slate-700 shadow-xl" />
                </div>
              </div>

              <h3 className="text-slate-200 font-bold text-base tracking-tight select-none">You are the only one here</h3>
              <p className="text-slate-550 text-xs mt-2 max-w-[280px] leading-relaxed select-none">
                Waiting for others to join... Invite teammates by sharing the meeting room code in the panel.
              </p>
            </div>

          ) : (
            
            /* DYNAMIC MULTI PARTICIPANTS GRID (UP TO 49 BLOCKS) */
            <div className={cn(
              "grid gap-4 w-full h-full max-w-6xl mx-auto content-center justify-center",
              participants.length === 1 
                ? "grid-cols-1 md:grid-cols-2 max-h-[480px]" 
                : participants.length === 2 
                ? "grid-cols-1 md:grid-cols-3 max-h-[380px]" 
                : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-h-[500px]"
            )}>
              {/* Local User Tile */}
              <div className="relative bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden aspect-video shadow-lg">
                {cameraOn && localStream ? (
                  <video
                    ref={el => { if (el && localStream) el.srcObject = localStream; }}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={videoStyle()}
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-slate-955 gap-3">
                    <Avatar name={userName} src={avatarUrl} size="lg" className="border border-slate-800" />
                    <span className="text-[9px] text-slate-550 font-black uppercase tracking-widest">Camera is off</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 backdrop-blur-md bg-slate-950/60 border border-slate-850 px-2.5 py-1 rounded-lg z-10 flex items-center gap-1.5 select-none">
                  <span className="text-[10px] text-slate-200 font-semibold">{userName} (You)</span>
                  {!micOn && <MicOff size={10} className="text-rose-400" />}
                </div>
              </div>

              {/* Remote Users Tiles */}
              {participants.map(p => {
                const stream = remoteStreams[p.socketId];
                const pCameraOn = !p.isCameraOff;

                return (
                  <div key={p.socketId} className="relative bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden aspect-video shadow-lg">
                    {pCameraOn && stream ? (
                      <video
                        ref={el => { if (el && stream) el.srcObject = stream; }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-slate-955 gap-3">
                        <Avatar name={p.userName} size="lg" className="border border-slate-800" />
                        <span className="text-[9px] text-slate-550 font-black uppercase tracking-widest">Camera is off</span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 backdrop-blur-md bg-slate-950/60 border border-slate-850 px-2.5 py-1 rounded-lg z-10 flex items-center gap-1.5 select-none">
                      <span className="text-[10px] text-slate-250 font-semibold">{p.userName}</span>
                      {p.isMuted && <MicOff size={10} className="text-rose-400" />}
                    </div>
                  </div>
                );
              })}
            </div>

          )}

          {/* ── 3. FLOATING LOWER CONTROL DOCK ── */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-full px-5 py-3 flex items-center gap-4.5 z-30 shadow-2xl shadow-slate-950/60 select-none">
            
            {/* Mic / Audio controls with setting popup */}
            <div className="flex items-center relative" ref={micMenuRef}>
              <button
                onClick={toggleMute}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm",
                  micOn 
                    ? "bg-slate-800/60 hover:bg-slate-800 text-slate-200" 
                    : "bg-rose-500 text-slate-950 font-bold"
                )}
                title={micOn ? "Mute Microphone" : "Unmute Microphone"}
              >
                {micOn ? <Mic size={16} className="stroke-[2.5]" /> : <MicOff size={16} />}
              </button>
              <button
                onClick={() => setShowMicMenu(!showMicMenu)}
                className="p-1 text-slate-500 hover:text-slate-350 cursor-pointer select-none"
              >
                <ChevronUp size={12} className={cn("transition-transform duration-250", showMicMenu && "rotate-180")} />
              </button>
              {showMicMenu && (
                <div className="absolute bottom-12 left-0 bg-slate-900 border border-slate-850 rounded-xl shadow-2xl p-1.5 z-50 w-44 flex flex-col gap-0.5 animate-fadeIn">
                  <p className="text-[8px] font-black text-slate-550 uppercase tracking-widest px-2 py-1">Mic Properties</p>
                  <button onClick={() => setShowMicMenu(false)} className="w-full text-left px-2 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800 rounded-lg">HD Condenser Input</button>
                  <button onClick={() => setShowMicMenu(false)} className="w-full text-left px-2 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800 rounded-lg mt-0.5">System Speaker Array</button>
                </div>
              )}
            </div>

            {/* Video / Camera controls with setting popup */}
            <div className="flex items-center relative" ref={cameraMenuRef}>
              <button
                onClick={toggleCamera}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm",
                  cameraOn 
                    ? "bg-slate-800/60 hover:bg-slate-800 text-slate-200" 
                    : "bg-rose-500 text-slate-950 font-bold"
                )}
                title={cameraOn ? "Disable Camera" : "Enable Camera"}
              >
                {cameraOn ? <Video size={16} className="stroke-[2.5]" /> : <VideoOff size={16} />}
              </button>
              <button
                onClick={() => setShowCameraMenu(!showCameraMenu)}
                className="p-1 text-slate-500 hover:text-slate-350 cursor-pointer select-none"
              >
                <ChevronUp size={12} className={cn("transition-transform duration-250", showCameraMenu && "rotate-180")} />
              </button>
              {showCameraMenu && (
                <div className="absolute bottom-12 left-0 bg-slate-900 border border-slate-850 rounded-xl shadow-2xl p-1.5 z-50 w-44 flex flex-col gap-0.5 animate-fadeIn">
                  <p className="text-[8px] font-black text-slate-550 uppercase tracking-widest px-2 py-1">Camera Properties</p>
                  <button onClick={() => setShowCameraMenu(false)} className="w-full text-left px-2 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800 rounded-lg">HD FaceCam Studio</button>
                  <button onClick={() => setShowCameraMenu(false)} className="w-full text-left px-2 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800 rounded-lg mt-0.5">Virtual Screen Cam</button>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="w-[1px] h-6 bg-slate-800" />

            {/* Screen share green button */}
            <button
              onClick={sharing ? stopScreenShare : startScreenShare}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm",
                sharing 
                  ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:scale-[1.02]" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-emerald-450"
              )}
              title={sharing ? "Stop Sharing Screen" : "Share Screen"}
            >
              <Monitor size={16} className="stroke-[2.5]" />
            </button>

            {/* Reusable Whiteboard Stage Toggle */}
            <button
              onClick={() => setWhiteboardActive(!whiteboardActive)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm",
                whiteboardActive 
                  ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-[1.02]" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-cyan-400"
              )}
              title={whiteboardActive ? "Close Whiteboard Stage" : "Open Collaboration Whiteboard"}
            >
              <Pencil size={16} className="stroke-[2.5]" />
            </button>

            {/* Host Breakout Rooms Manager Button */}
            <button
              onClick={() => { setBreakoutStep(1); setShowBreakoutModal(true); }}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm",
                showBreakoutModal 
                  ? "bg-indigo-500/20 text-indigo-400 border-indigo-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-indigo-400"
              )}
              title="Manage Breakout Rooms"
            >
              <Grid size={16} />
            </button>

            {/* Host Shield Security Settings Button */}
            <button
              onClick={() => setShowSecurityModal(true)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm",
                showSecurityModal 
                  ? "bg-rose-500/15 text-rose-455 border-rose-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-rose-455"
              )}
              title="Host Security Settings"
            >
              <Shield size={16} />
            </button>

            {/* Emoji Reactions smile popover */}
            <div className="relative" ref={emojiRef}>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm",
                  showEmojiPicker 
                    ? "bg-slate-800 text-cyan-400 border-slate-850" 
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
                )}
                title="Send Reaction"
              >
                <Smile size={16} />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-850 rounded-xl p-2 shadow-2xl z-50 flex gap-1.5 animate-fadeIn">
                  {['👍', '❤️', '😂', '😮', '🎉', '🔥'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { triggerReaction(emoji); setShowEmojiPicker(false); }}
                      className="w-8 h-8 rounded-lg hover:bg-slate-850 flex items-center justify-center text-sm cursor-pointer hover:scale-110 active:scale-95 transition-all select-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Engagement buttons triggers sidebar */}
            <button
              onClick={() => handleToggleSidebar('People')}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm",
                sidebarOpen && activeTab === 'People'
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
              )}
              title="Participants list"
            >
              <Users size={16} />
            </button>

            <button
              onClick={() => handleToggleSidebar('Chat')}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm",
                sidebarOpen && activeTab === 'Chat'
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
              )}
              title="Channel Chat feed"
            >
              <MessageSquare size={16} />
            </button>

            <button
              onClick={() => handleToggleSidebar('Q&A')}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm",
                sidebarOpen && activeTab === 'Q&A'
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
              )}
              title="Questions & Answers"
            >
              <HelpCircle size={16} />
            </button>

            {/* Separator */}
            <div className="w-[1px] h-6 bg-slate-800" />

            {/* Leave Call button (Elongated Red) */}
            <button
              onClick={handleLeaveMeeting}
              className="px-5 h-10 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/10 transition-all cursor-pointer border-0"
              title="Leave call room"
            >
              <PhoneOff size={13} className="text-slate-950 stroke-[2.5]" />
              Leave
            </button>

          </div>

        </div>

        {/* ── 4. COHESIVE RIGHT ENGAGEMENT SIDEBAR ── */}
        <aside className={cn(
          "bg-slate-905 border-slate-900 flex flex-col h-full z-20 transition-all duration-300 select-none overflow-hidden shrink-0",
          sidebarOpen ? "w-80 md:w-88 border-l" : "w-0 border-l-0"
        )}>
          
          {/* Unifed Tabs Header */}
          <div className="h-16 border-b border-slate-900 flex flex-col justify-end px-4 shrink-0 select-none bg-slate-905">
            <div className="flex justify-between items-center flex-1 py-1">
              <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Engagement Panel</span>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-900"
              >
                <X size={15} />
              </button>
            </div>
            
            {/* Tabs switcher row */}
            <div className="flex gap-4">
              {(['People', 'Chat', 'Q&A'] as SidebarTab[]).map(tab => {
                const isTabActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer",
                      isTabActive ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-500 hover:text-slate-350"
                    )}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: People / Participants Panel */}
          {activeTab === 'People' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20 select-none">
              
              {/* Search contacts filter input */}
              <div className="px-4 py-3.5 border-b border-slate-900/60 shrink-0">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2">
                  <Search size={13} className="text-slate-550 shrink-0" />
                  <input
                    value={peopleSearch}
                    onChange={e => setPeopleSearch(e.target.value)}
                    placeholder="Search participants..."
                    className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-700 outline-none font-outfit"
                  />
                </div>
              </div>

              {/* Participants listings */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5 scrollbar-thin">
                <p className="text-[9px] font-black text-slate-550 uppercase tracking-widest mb-2 px-1">Meeting Active ({participants.length + 1})</p>
                
                {/* Local user entry */}
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-slate-900/20 border border-slate-900/40">
                  <Avatar name={userName} src={avatarUrl} size="sm" className="border border-slate-800" />
                  <div className="flex-1 leading-none text-left min-w-0">
                    <span className="text-xs font-bold text-slate-200 block truncate">{userName}</span>
                    <span className="text-[8px] font-bold text-indigo-400 tracking-wider uppercase mt-1 block">Host</span>
                  </div>
                  <span className="text-[9px] text-slate-600 pr-1">(You)</span>
                </div>

                {/* Remote users entries */}
                {participants
                  .filter(p => p.userName.toLowerCase().includes(peopleSearch.toLowerCase()))
                  .map(p => (
                    <div key={p.socketId} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-900/20 transition-all border border-transparent hover:border-slate-900/30">
                      <Avatar name={p.userName} size="sm" className="border border-slate-850" />
                      <div className="flex-1 leading-none text-left min-w-0">
                        <span className="text-xs font-bold text-slate-300 block truncate">{p.userName}</span>
                        <span className="text-[8px] font-bold text-slate-550 tracking-wider uppercase mt-1 block">Caller</span>
                      </div>
                      {p.isMuted && <MicOff size={11} className="text-rose-455 pr-1 shrink-0" />}
                    </div>
                  ))}
              </div>

              {/* Bottom copy link action */}
              <div className="p-4 border-t border-slate-900 shrink-0 select-none">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Meeting room link copied to clipboard.");
                  }}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-550 hover:to-cyan-450 text-slate-950 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center justify-center gap-1.5 cursor-pointer border-0"
                >
                  <UserPlus size={13} className="stroke-[2.5]" />
                  Invite Teammates
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: Chat Panel */}
          {activeTab === 'Chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20">
              
              {/* Chat Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none h-full">
                    <MessageSquare size={26} className="text-slate-650 mb-3 opacity-40" />
                    <p className="text-xs font-bold text-slate-450">Room chat feed is empty</p>
                    <p className="text-[9px] text-slate-600 mt-1 max-w-[170px] leading-relaxed">
                      Send a message to start the room conversation thread.
                    </p>
                  </div>
                ) : (
                  chatMessages.map(msg => (
                    <div key={msg.id} className="flex flex-col gap-0.5 leading-tight select-text text-left">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-200">{msg.sender}</span>
                        <span className="text-[8px] text-slate-600 font-semibold">{msg.time}</span>
                      </div>
                      <p className="text-slate-350 text-xs leading-normal mt-1 break-words">{msg.text}</p>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Text Input Composer */}
              <div className="p-4 border-t border-slate-900 bg-slate-905 shrink-0 select-none">
                <div className="flex items-end gap-2 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 focus-within:border-cyan-500/40 transition-colors">
                  <textarea
                    rows={1}
                    value={chatDraft}
                    onChange={e => setChatDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChatMessage(); } }}
                    placeholder="Send message to everyone..."
                    className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-700 outline-none resize-none max-h-24 leading-normal select-text font-outfit"
                    style={{ minHeight: '18px' }}
                  />
                  <button
                    onClick={handleSendChatMessage}
                    disabled={!chatDraft.trim()}
                    className={cn(
                      "shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer",
                      chatDraft.trim() ? "text-cyan-400 hover:bg-slate-900" : "text-slate-800 cursor-not-allowed"
                    )}
                  >
                    <Send size={13} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: Q&A Panel */}
          {activeTab === 'Q&A' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20 select-none">
              
              {/* Question list feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin select-none">
                {questions.length === 0 ? (
                  /* Q&A Empty State */
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center h-full">
                    <HelpCircle size={28} className="text-slate-650 mb-3 opacity-40 stroke-[2.5]" />
                    <p className="text-xs font-bold text-slate-450">No questions yet</p>
                    <p className="text-[9px] text-slate-600 mt-1 max-w-[170px] leading-relaxed">
                      No questions yet. Be the first to ask! Use the composer box below.
                    </p>
                  </div>
                ) : (
                  questions.map(q => (
                    <div key={q.id} className="bg-slate-900/60 border border-slate-900 rounded-xl p-3 flex gap-3 select-none">
                      <button
                        onClick={() => handleUpvoteQuestion(q.id)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors cursor-pointer border border-transparent shrink-0",
                          q.upvoted 
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/10" 
                            : "bg-slate-950/40 text-slate-500 hover:text-slate-300 hover:border-slate-850"
                        )}
                        title="Upvote Question"
                      >
                        <ChevronUp size={12} className="stroke-[2.5]" />
                        <span className="text-[9px] font-black leading-none mt-0.5">{q.upvotes}</span>
                      </button>
                      <div className="flex flex-col text-left leading-tight min-w-0 select-text">
                        <p className="text-xs text-slate-300 font-medium break-words leading-relaxed select-text">{q.text}</p>
                        <span className="text-[8px] font-bold text-slate-600 mt-2 block">— {q.author}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Q&A Text Input Composer pinned to bottom */}
              <div className="p-4 border-t border-slate-900 bg-slate-905 shrink-0 select-none">
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={2}
                    value={qaDraft}
                    onChange={e => setQaDraft(e.target.value)}
                    placeholder="Ask a question..."
                    className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-700 outline-none resize-none transition-all font-outfit select-text"
                  />
                  <button
                    onClick={handleSendQuestion}
                    disabled={!qaDraft.trim()}
                    className={cn(
                      "self-end px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border",
                      qaDraft.trim()
                        ? "bg-cyan-500 text-slate-950 border-transparent shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:scale-[1.02]"
                        : "bg-slate-900 text-slate-650 border-slate-850/50 cursor-not-allowed"
                    )}
                  >
                    Submit Question
                  </button>
                </div>
              </div>

            </div>
          )}

        </aside>

      </div>

      {/* ── 5. HOST SECURITY CONTROL PANEL MODAL ── */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6.5 shadow-2xl relative">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            
            <button 
              onClick={() => setShowSecurityModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-350 hover:bg-slate-850 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>

            <div className="flex items-center gap-2.5 mb-5.5 select-none">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-455">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">Deep Security Panel</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Host Access Permissions</p>
              </div>
            </div>

            {/* List of Custom iOS Toggle Switches */}
            <div className="space-y-4 select-none">
              
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1.5 text-left">Global Protections</p>
              
              {/* Lock Meeting (Crimson Red switch) */}
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-200 block">Lock Meeting</span>
                  <span className="text-[10px] text-slate-500 leading-normal block">Prevent new participants from joining this call stage</span>
                </div>
                <button
                  onClick={() => setSecuritySettings(prev => ({ ...prev, lockMeeting: !prev.lockMeeting }))}
                  className={cn(
                    "w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer relative shrink-0",
                    securitySettings.lockMeeting ? "bg-rose-500" : "bg-slate-800"
                  )}
                >
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-md",
                      securitySettings.lockMeeting ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Enable Waiting Room (Cyan Switch) */}
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-200 block">Enable Waiting Room</span>
                  <span className="text-[10px] text-slate-500 leading-normal block">Place new entrants in lobby until admitted by host</span>
                </div>
                <button
                  onClick={() => setSecuritySettings(prev => ({ ...prev, enableWaitingRoom: !prev.enableWaitingRoom }))}
                  className={cn(
                    "w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer relative shrink-0",
                    securitySettings.enableWaitingRoom ? "bg-cyan-500" : "bg-slate-800"
                  )}
                >
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-md",
                      securitySettings.enableWaitingRoom ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-850 pt-2 pb-1.5 text-left">Participant Permissions</p>

              {[
                { key: 'allowScreenShare', label: 'Share Screen', desc: 'Allow callers to broadcast screen layers' },
                { key: 'allowChat', label: 'Send Chat Messages', desc: 'Allow callers to post in the room feed' },
                { key: 'allowRename', label: 'Rename Themselves', desc: 'Allow callers to change screen names' },
                { key: 'allowUnmute', label: 'Unmute Microphone', desc: 'Allow callers to unmute audio' },
                { key: 'allowStartVideo', label: 'Start Camera Video', desc: 'Allow callers to publish webcam feeds' }
              ].map(item => {
                const isActive = (securitySettings as any)[item.key];
                return (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-200 block">{item.label}</span>
                      <span className="text-[10px] text-slate-500 leading-normal block">{item.desc}</span>
                    </div>
                    <button
                      onClick={() => setSecuritySettings(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                      className={cn(
                        "w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer relative shrink-0",
                        isActive ? "bg-cyan-500" : "bg-slate-800"
                      )}
                    >
                      <div 
                        className={cn(
                          "w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-md",
                          isActive ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                );
              })}

            </div>

            <div className="mt-7 border-t border-slate-850 pt-4 flex select-none">
              <button
                onClick={() => setShowSecurityModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-[10px] font-black uppercase tracking-widest text-slate-350 transition-all cursor-pointer border border-slate-750"
              >
                Close Settings
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 6. BREAKOUT ROOMS MANAGER MODAL ── */}
      {showBreakoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6.5 shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-550/20 to-transparent" />
            
            <button 
              onClick={() => setShowBreakoutModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-850 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2.5 mb-5.5 shrink-0 select-none">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Grid className="w-4.5 h-4.5" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">Breakout Rooms Manager</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Divide calls into separate stages</p>
              </div>
            </div>

            {/* STEP 1: CONFIGURATION STEP */}
            {breakoutStep === 1 ? (
              <div className="space-y-6 flex-1 overflow-y-auto pr-1 select-none text-left">
                
                {/* Stepper Input */}
                <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">How many rooms do you need?</span>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setRoomCount(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-300 text-lg font-bold flex items-center justify-center cursor-pointer transition-colors"
                    >
                      —
                    </button>
                    <span className="text-xl font-black text-white font-mono w-8 text-center">{roomCount}</span>
                    <button
                      onClick={() => setRoomCount(prev => Math.min(10, prev + 1))}
                      className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-300 text-lg font-bold flex items-center justify-center cursor-pointer transition-colors"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-slate-550 uppercase tracking-wider font-bold">Rooms (Max 10)</span>
                  </div>
                </div>

                {/* Radio Options */}
                <div className="space-y-3.5">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Distribution Mode</span>
                  {[
                    { id: 'auto', title: 'Assign Automatically', desc: 'Randomly split all callers evenly into rooms' },
                    { id: 'manual', title: 'Assign Manually', desc: 'Individually place callers into specific rooms' },
                    { id: 'choose', title: 'Let participants choose', desc: 'Allow callers to select their own rooms' }
                  ].map(option => {
                    const isSelected = assignmentMode === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => setAssignmentMode(option.id as any)}
                        className={cn(
                          "p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3.5",
                          isSelected 
                            ? "bg-cyan-500/5 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.05)]" 
                            : "bg-slate-900/40 border-slate-855 hover:bg-slate-900/70"
                        )}
                      >
                        <div className={cn(
                          "w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0",
                          isSelected ? "border-cyan-405" : "border-slate-700"
                        )}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-200 block leading-tight">{option.title}</span>
                          <span className="text-[10px] text-slate-500 mt-1 block">{option.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-850 pt-5 flex gap-3 select-none">
                  <button
                    onClick={() => setShowBreakoutModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-855 hover:bg-slate-850 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-350 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setBreakoutStep(2)}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-550 text-[10px] font-black uppercase tracking-widest text-slate-950 transition-all cursor-pointer shadow-lg shadow-cyan-550/10 border border-cyan-500/10"
                  >
                    Configure Rooms
                  </button>
                </div>

              </div>
            ) : (
              /* STEP 2: MANAGER VIEW STEP */
              <div className="flex flex-col flex-1 min-h-0 select-none text-left">
                
                {/* Main Split Pane stage */}
                <div className="flex-1 flex gap-4 min-h-[220px] overflow-hidden mb-5">
                  
                  {/* Left Column: Rooms lists */}
                  <div className="flex-1 border border-slate-850 bg-slate-950/40 rounded-2xl p-4 overflow-y-auto scrollbar-thin flex flex-col gap-3">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1.5">Rooms Grid ({roomCount})</span>
                    
                    {Object.entries(breakoutRoomsData).map(([roomName, assignedNames]) => (
                      <div key={roomName} className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center justify-between border-b border-slate-855/50 pb-1">
                          <span className="text-xs font-bold text-cyan-400">{roomName}</span>
                          <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">{assignedNames.length} Assigned</span>
                        </div>
                        {assignedNames.length === 0 ? (
                          <div className="py-3 text-center">
                            <span className="text-[9px] text-slate-650 font-bold uppercase tracking-widest text-center block">No participants assigned yet</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {assignedNames.map(name => (
                              <div key={name} className="flex items-center gap-1 bg-slate-955 border border-slate-850 px-2 py-0.5 rounded-lg text-[9px] font-bold text-slate-300">
                                {name}
                                <button
                                  onClick={() => {
                                    // Remove assigned user
                                    setBreakoutRoomsData(prev => ({
                                      ...prev,
                                      [roomName]: prev[roomName].filter(n => n !== name)
                                    }));
                                  }}
                                  className="text-slate-650 hover:text-rose-455 p-0.5 font-bold"
                                  title="Unassign"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Right Column: Teammates to assign */}
                  <div className="w-56 border border-slate-850 bg-slate-950/20 rounded-2xl p-4 overflow-y-auto scrollbar-thin flex flex-col gap-3">
                    <span className="text-[8px] font-black text-slate-550 uppercase tracking-widest border-b border-slate-850/60 pb-1.5">Lobby Caller List</span>
                    
                    {/* Unassigned/Available callers */}
                    {(() => {
                      const allAssigned = Object.values(breakoutRoomsData).flat();
                      // Teammates in the call: standard fallback list
                      const lobbyTeammates = [
                        'Sarah Chen', 
                        'David Miller', 
                        'Alex Mercer', 
                        'Marcus Aurelius',
                        userName
                      ].filter(name => !allAssigned.includes(name));

                      if (lobbyTeammates.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-10 text-center select-none">
                            <Check className="w-5 h-5 text-emerald-450 mb-1" />
                            <span className="text-[9px] text-slate-555 font-black uppercase tracking-wider leading-relaxed">All Assigned</span>
                          </div>
                        );
                      }

                      return lobbyTeammates.map(name => (
                        <div key={name} className="bg-slate-905 border border-slate-850 p-2 rounded-xl flex items-center justify-between gap-1.5">
                          <span className="text-[11px] text-slate-350 font-semibold truncate leading-tight flex-1">{name}</span>
                          <div className="flex gap-0.5">
                            {/* Fast assigning buttons for each room */}
                            {Object.keys(breakoutRoomsData).map((roomName, idx) => (
                              <button
                                key={roomName}
                                onClick={() => {
                                  setBreakoutRoomsData(prev => ({
                                    ...prev,
                                    [roomName]: [...prev[roomName], name]
                                  }));
                                }}
                                className="px-1 py-0.5 rounded bg-slate-950 border border-slate-800 text-[8px] font-black text-cyan-455 hover:bg-cyan-500 hover:text-slate-950 transition-colors uppercase cursor-pointer"
                                title={`Assign to ${roomName}`}
                              >
                                R{idx + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                </div>

                {/* Bottom Settings Options (Auto-close slider) */}
                <div className="bg-slate-955 border border-slate-850 p-4.5 rounded-2xl mb-5 shrink-0 select-none">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Auto-close rooms duration</span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">{autoCloseMinutes} Minutes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={autoCloseMinutes}
                      onChange={e => setAutoCloseMinutes(parseInt(e.target.value))}
                      className="flex-1 h-1 bg-slate-900 rounded-full appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>

                {/* Step 2 Modals CTAs */}
                <div className="border-t border-slate-850 pt-5 flex gap-3 shrink-0 select-none">
                  <button
                    onClick={() => setBreakoutStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-slate-850 hover:bg-slate-850 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  >
                    Back
                  </button>
                  
                  <button
                    onClick={() => {
                      // Perform random auto assignments
                      const allNames = ['Sarah Chen', 'David Miller', 'Alex Mercer', 'Marcus Aurelius', userName];
                      const newRooms: Record<string, string[]> = {};
                      for (let i = 1; i <= roomCount; i++) {
                        newRooms[`Room ${i}`] = [];
                      }
                      allNames.forEach((name, idx) => {
                        const roomIdx = (idx % roomCount) + 1;
                        newRooms[`Room ${roomIdx}`].push(name);
                      });
                      setBreakoutRoomsData(newRooms);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-850 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer"
                  >
                    Auto Distribute
                  </button>

                  <button
                    onClick={() => {
                      setRoomsActive(!roomsActive);
                      setShowBreakoutModal(false);
                    }}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-transparent shadow-lg",
                      roomsActive 
                        ? "bg-rose-500 text-slate-950 font-black hover:bg-rose-600 shadow-rose-500/10" 
                        : "bg-cyan-500 text-slate-950 font-black hover:bg-cyan-400 shadow-cyan-550/10"
                    )}
                  >
                    {roomsActive ? 'Close All Rooms' : 'Open All Rooms'}
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default function MeetingRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-slate-950 flex items-center justify-center font-outfit">
          <div className="flex flex-col items-center gap-4 animate-pulse select-none">
            <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Entering Room...</span>
          </div>
        </div>
      }
    >
      <MeetingRoomInner />
    </Suspense>
  );
}
