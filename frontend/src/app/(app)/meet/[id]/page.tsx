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
  PhoneOff,
  UserPlus,
  Plus,
  MessageCircle,
  ChevronDown,
  Pencil,
  Check,
  Zap,
  AlertTriangle,
  CornerDownRight,
  Hand,
  FileText,
  Radio
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';
import Whiteboard from '@/components/meeting/Whiteboard';
import { useSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import api from '@/lib/api';

// LiveKit Imports
import {
  LiveKitRoom,
  VideoTrack,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useTracks,
  useRoomContext
} from '@livekit/components-react';
import { Track } from 'livekit-client';

// ─── Types ───────────────────────────────────────────────────────────────────
type SidebarTab = 'People' | 'Chat' | 'Q&A' | 'Notes' | 'Backstage';

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

// ─── L I V E K I T   M E E T I N G   R O O M   I N N E R ──────────────────────
function LiveKitMeetingRoomInner({ 
  meetingId, 
  socket, 
  userId, 
  userName, 
  avatarUrl, 
  router 
}: { 
  meetingId: string; 
  socket: any; 
  userId: string; 
  userName: string; 
  avatarUrl: string | null; 
  router: any;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useParticipants();

  const micOn = localParticipant.isMicrophoneEnabled;
  const cameraOn = localParticipant.isCameraEnabled;
  const sharing = localParticipant.isScreenShareEnabled;

  const toggleMute = () => {
    localParticipant.setMicrophoneEnabled(!micOn);
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };
  const toggleCamera = () => {
    localParticipant.setCameraEnabled(!cameraOn);
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };
  const toggleScreenShare = () => {
    localParticipant.setScreenShareEnabled(!sharing);
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleLeaveMeeting = () => {
    if (socket) {
      socket.emit('user-leave', { roomId: meetingId, userId });
    }
    room.disconnect();
    router.push('/dashboard');
  };

  // 1. Tracks (Camera + ScreenShare)
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false }
    ],
    { onlySubscribed: true }
  );

  // 2. UI panel states (Chat, Breakouts, etc. synced via Socket)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('People');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Collaborative document states
  const [documentText, setDocumentText] = useState<string>('');

  // Backstage states
  const [meetingHostId, setMeetingHostId] = useState<string>('');
  const [backstageActive, setBackstageActive] = useState<boolean>(false);
  const [backstageMessages, setBackstageMessages] = useState<any[]>([]);
  const [backstageDraft, setBackstageDraft] = useState<string>('');

  // Battery & Data Saver state
  const [dataSaverActive, setDataSaverActive] = useState<boolean>(false);

  // Fetch meeting host details
  useEffect(() => {
    async function fetchMeetingDetails() {
      try {
        const res = await api.get(`/meetings/${meetingId}`);
        if (res.data?.success && res.data?.meeting) {
          setMeetingHostId(res.data.meeting.hostId);
        }
      } catch (err) {
        console.warn("Failed to fetch meeting details:", err);
      }
    }
    fetchMeetingDetails();
  }, [meetingId]);

  // Socket sync listeners for notes and backstage whispers
  useEffect(() => {
    if (!socket) return;

    const handleDocSync = (text: string) => {
      setDocumentText(text);
    };

    const handleDocChange = (text: string) => {
      setDocumentText(text);
    };

    const handleBackstageRecv = (msg: any) => {
      setBackstageMessages(prev => [...prev, msg]);
    };

    socket.on('document-sync', handleDocSync);
    socket.on('document-change', handleDocChange);
    socket.on('backstage-msg-recv', handleBackstageRecv);

    return () => {
      socket.off('document-sync', handleDocSync);
      socket.off('document-change', handleDocChange);
      socket.off('backstage-msg-recv', handleBackstageRecv);
    };
  }, [socket]);

  // Adjust camera constraints dynamically for Battery & Data Saver
  useEffect(() => {
    try {
      const pub = localParticipant.getTrackPublication(Track.Source.Camera);
      const track = pub?.videoTrack?.mediaStreamTrack;
      if (track) {
        if (dataSaverActive) {
          track.applyConstraints({ width: 320, height: 180, frameRate: 15 }).catch(err => {
            console.warn("Could not apply low bandwidth constraints:", err);
          });
        } else {
          track.applyConstraints({ width: 640, height: 360, frameRate: 24 }).catch(err => {
            console.warn("Could not apply standard bandwidth constraints:", err);
          });
        }
      }
    } catch (err) {
      console.warn("Could not adjust LiveKit video constraints:", err);
    }
  }, [dataSaverActive, localParticipant]);

  const handleDocumentChange = (text: string) => {
    setDocumentText(text);
    socket?.emit('document-change', { roomId: meetingId, text });
  };

  const handleToggleBackstage = () => {
    if (!socket) return;
    const nextActive = !backstageActive;
    setBackstageActive(nextActive);
    if (nextActive) {
      socket.emit('join-backstage', { roomId: meetingId, userId, userName });
    } else {
      socket.emit('leave-backstage', { roomId: meetingId });
    }
  };

  const handleSendBackstageWhisper = () => {
    if (!socket || !backstageDraft.trim()) return;
    socket.emit('backstage-msg-send', {
      roomId: meetingId,
      userId,
      userName,
      content: backstageDraft.trim()
    });
    setBackstageDraft('');
  };
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);

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

  const [breakoutStep, setBreakoutStep] = useState<1 | 2>(1);
  const [roomCount, setRoomCount] = useState(2);
  const [assignmentMode, setAssignmentMode] = useState<'auto' | 'manual' | 'choose'>('auto');
  const [autoCloseMinutes, setAutoCloseMinutes] = useState(15);
  const [roomsActive, setRoomsActive] = useState(false);
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

  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [qaDraft, setQaDraft] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [localHandRaised, setLocalHandRaised] = useState(false);
  const [handRaises, setHandRaises] = useState<Record<string, boolean>>({});

  const channelRef = useRef<any>(null);

  // ─── Swipe-to-Paginate grid states ───
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 6;
  const totalPages = Math.ceil(tracks.length / pageSize);
  const touchStartRef = useRef<number>(0);

  // Ensure current page is valid when track count changes
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [tracks.length, totalPages, currentPage]);

  const handleGridTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleGridTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current;
    if (deltaX < -60) {
      if (currentPage < totalPages - 1) {
        setCurrentPage(prev => prev + 1);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(40);
        }
      }
    } else if (deltaX > 60) {
      if (currentPage > 0) {
        setCurrentPage(prev => prev - 1);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(40);
        }
      }
    }
  };

  // ─── Auto Picture-in-Picture on browser tab background ───
  useEffect(() => {
    if (typeof document === 'undefined' || !document.pictureInPictureEnabled) return;

    const handleVisibilityChange = async () => {
      try {
        if (document.visibilityState === 'hidden') {
          const video = document.querySelector('video');
          if (video && video.readyState >= 2 && !document.pictureInPictureElement) {
            await video.requestPictureInPicture();
          }
        } else if (document.visibilityState === 'visible') {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          }
        }
      } catch (err) {
        console.warn('Failed to toggle Picture-in-Picture state:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ─── Register W3C MediaSession Actions ───
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Meeting stage: ${meetingId}`,
        artist: 'AeroMeet',
        album: 'Video Conferencing Stage'
      });

      navigator.mediaSession.setActionHandler('togglemicrophone' as any, () => {
        toggleMute();
      });

      navigator.mediaSession.setActionHandler('togglecamera' as any, () => {
        toggleCamera();
      });

      navigator.mediaSession.setActionHandler('hangup' as any, () => {
        handleLeaveMeeting();
      });
    } catch (e) {
      console.warn('MediaSession action registration failed:', e);
    }

    return () => {
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('togglemicrophone' as any, null);
        navigator.mediaSession.setActionHandler('togglecamera' as any, null);
        navigator.mediaSession.setActionHandler('hangup' as any, null);
      }
    };
  }, [meetingId, localParticipant, handleLeaveMeeting]);

  // Fetch Q&A questions from database
  const fetchQuestions = useCallback(async () => {
    if (!meetingId) return;
    try {
      const res = await api.get(`/meetings/${meetingId}/questions`);
      if (res.data && res.data.success) {
        const mapped = res.data.questions.map((q: any) => ({
          id: q.id,
          author: q.authorName,
          text: q.text,
          upvotes: q.upvotes ? q.upvotes.length : 0,
          upvoted: q.upvotes ? q.upvotes.includes(userId) : false,
          createdAt: q.createdAt
        }));
        setQuestions(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch meeting questions:', err);
    }
  }, [meetingId, userId]);

  // Meeting duration timer
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const micMenuRef = useRef<HTMLDivElement>(null);
  const cameraMenuRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (micMenuRef.current && !micMenuRef.current.contains(e.target as Node)) setShowMicMenu(false);
      if (cameraMenuRef.current && !cameraMenuRef.current.contains(e.target as Node)) setShowCameraMenu(false);
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Listen to Socket Signaling updates for Chat/Sync
  useEffect(() => {
    if (!socket) return;

    socket.emit('join-room', { roomId: meetingId, userId, userName });

    socket.on('chat-message', (msg: any) => {
      setChatMessages(prev => [...prev, {
        id: `${msg.userId}-${Date.now()}-${Math.random()}`,
        sender: msg.userName,
        text: msg.content,
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    });

    if (userId) {
      fetchQuestions();
    }

    return () => {
      socket.off('chat-message');
    };
  }, [socket, meetingId, userId, userName, fetchQuestions]);

  // Connect to Supabase Realtime channel for ephemeral states (reactions & hand raises)
  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase.channel(`meet-ephemeral:${meetingId}`, {
      config: {
        broadcast: { self: false }
      }
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        triggerReaction(payload.emoji);
      })
      .on('broadcast', { event: 'hand-raise' }, ({ payload }) => {
        const { userId: peerUserId, isHandRaised } = payload;
        setHandRaises(prev => ({ ...prev, [peerUserId]: isHandRaised }));
      })
      .on('broadcast', { event: 'qa-update' }, () => {
        fetchQuestions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [meetingId, fetchQuestions]);

  // Refresh Q&A when sidebar becomes active
  useEffect(() => {
    if (activeTab === 'Q&A' && meetingId) {
      fetchQuestions();
    }
  }, [activeTab, meetingId, fetchQuestions]);

  // Floating reaction emitter
  const triggerReaction = (emoji: string) => {
    const id = crypto.randomUUID();
    const left = 15 + Math.random() * 70;
    setReactions(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2600);
  };

  const handleBroadcastReaction = (emoji: string) => {
    triggerReaction(emoji);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji, userId, userName }
      });
    }
  };

  const toggleHandRaise = () => {
    const nextState = !localHandRaised;
    setLocalHandRaised(nextState);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'hand-raise',
        payload: { userId, isHandRaised: nextState }
      });
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeTab === 'Chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Send Chat message
  const handleSendChatMessage = () => {
    if (!chatDraft.trim()) return;
    const timestamp = new Date().toISOString();
    
    if (socket) {
      socket.emit('chat-message', {
        roomId: meetingId,
        userId,
        userName,
        content: chatDraft.trim(),
        timestamp
      });
    }

    setChatMessages(prev => [...prev, {
      id: `self-${Date.now()}`,
      sender: userName,
      text: chatDraft.trim(),
      time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }

    setChatDraft('');
  };

  // Submit Q&A Question
  const handleSendQuestion = async () => {
    if (!qaDraft.trim() || !meetingId) return;
    
    const draftText = qaDraft.trim();
    setQaDraft('');

    const tempId = `qa-temp-${Date.now()}`;
    const tempQ: QAQuestion = {
      id: tempId,
      author: userName,
      text: draftText,
      upvotes: 0,
      upvoted: false,
      createdAt: new Date().toISOString()
    };
    setQuestions(prev => [tempQ, ...prev]);

    try {
      const res = await api.post(`/meetings/${meetingId}/questions`, { text: draftText });
      if (res.data && res.data.success) {
        const realQ = res.data.question;
        const mappedQ: QAQuestion = {
          id: realQ.id,
          author: realQ.authorName,
          text: realQ.text,
          upvotes: realQ.upvotes ? realQ.upvotes.length : 0,
          upvoted: realQ.upvotes ? realQ.upvotes.includes(userId) : false,
          createdAt: realQ.createdAt
        };
        setQuestions(prev => prev.map(q => q.id === tempId ? mappedQ : q));

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'qa-update',
            payload: {}
          });
        }
      }
    } catch (err) {
      console.error('Failed to submit question:', err);
      setQuestions(prev => prev.filter(q => q.id !== tempId));
    }
  };

  const handleUpvoteQuestion = async (id: string) => {
    if (!meetingId) return;

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

    try {
      const res = await api.post(`/meetings/${meetingId}/questions/${id}/upvote`);
      if (res.data && res.data.success) {
        const realQ = res.data.question;
        const mappedQ: QAQuestion = {
          id: realQ.id,
          author: realQ.authorName,
          text: realQ.text,
          upvotes: realQ.upvotes ? realQ.upvotes.length : 0,
          upvoted: realQ.upvotes ? realQ.upvotes.includes(userId) : false,
          createdAt: realQ.createdAt
        };
        setQuestions(prev => prev.map(q => q.id === id ? mappedQ : q));

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'qa-update',
            payload: {}
          });
        }
      }
    } catch (err) {
      console.error('Failed to toggle upvote:', err);
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
    }
  };

  const handleToggleSidebar = (tab: SidebarTab) => {
    if (sidebarOpen && activeTab === tab) {
      setSidebarOpen(false);
    } else {
      setActiveTab(tab);
      setSidebarOpen(true);
    }
  };



  return (
    <div className="h-screen bg-slate-955 flex flex-col overflow-hidden text-slate-200 font-outfit relative">
      <RoomAudioRenderer />

      {/* ── 1. CALL TOP APP BAR ── */}
      <div className="h-14 bg-slate-905/30 border-b border-slate-900 flex items-center justify-between px-6 shrink-0 z-20 select-none">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-405">Live Stage</span>
          <div className="h-4 w-[1px] bg-slate-900" />
          <code className="font-mono text-xs text-cyan-400 bg-cyan-500/5 px-2.5 py-1 rounded-lg border border-cyan-500/10 tracking-widest truncate uppercase">
            {meetingId}
          </code>
        </div>

        {/* Clock Timer */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#00f0ff]" />
          <span className="font-mono text-xs font-bold text-slate-350 tabular-nums uppercase tracking-widest">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Remote count summary */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-full shadow-inner select-none shrink-0">
            <Users className="w-3.5 h-3.5 text-slate-450" />
            <span className="text-[10px] font-black text-slate-300">{remoteParticipants.length + 1} Connected</span>
          </div>
        </div>
      </div>

      {/* ── 2. DYNAMIC STAGE ── */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* VIDEO GRID */}
        <div className="flex-1 flex flex-col justify-center p-6 min-w-0 transition-all duration-300 relative bg-slate-950/20 select-none">
          
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
            {reactions.map(r => (
              <FloatingReactionItem key={r.id} emoji={r.emoji} left={r.left} />
            ))}
          </div>

          {whiteboardActive ? (
            <div className="flex-1 w-full h-full p-2 min-h-0 relative select-none">
              <Whiteboard />
              
              {/* PIP participants overlay */}
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 max-w-[200px] pointer-events-none">
                <div className="bg-slate-900/90 border border-slate-805 p-2.5 rounded-xl flex items-center gap-2 backdrop-blur-md shadow-2xl pointer-events-auto">
                  <Avatar name={userName} src={avatarUrl} size="sm" className="border border-slate-700" />
                  <span className="text-[9px] font-bold text-slate-350 truncate max-w-[100px]">{userName} (You)</span>
                </div>
                {remoteParticipants.slice(0, 2).map(p => (
                  <div key={p.sid} className="bg-slate-900/90 border border-slate-805 p-2.5 rounded-xl flex items-center gap-2 backdrop-blur-md shadow-2xl pointer-events-auto">
                    <Avatar name={p.identity} size="sm" className="border border-slate-800" />
                    <span className="text-[9px] font-bold text-slate-350 truncate max-w-[100px]">{p.identity}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (() => {
            const screenShareTracks = tracks.filter(t => t.source === Track.Source.ScreenShare);
            const isPresenterMode = screenShareTracks.length > 0;

            if (isPresenterMode) {
              return (
                <div className="flex-1 flex flex-col md:flex-row gap-4 w-full h-full max-h-[600px] select-none text-left">
                  {/* Big Main Screen Share */}
                  <div className="flex-[4] relative bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl">
                    <VideoTrack trackRef={screenShareTracks[0] as any} className="w-full h-full object-contain" />
                    <div className="absolute bottom-3 left-3 backdrop-blur-md bg-slate-955/60 border border-slate-850 px-2.5 py-1 rounded-lg z-10 select-none">
                      <span className="text-[10px] text-slate-200 font-semibold">
                        {screenShareTracks[0].participant.identity}'s Screen
                      </span>
                    </div>
                  </div>
                  
                  {/* Filmstrip Camera Tiles */}
                  <div className="flex-1 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[140px] md:max-h-none md:w-56 shrink-0 scrollbar-thin">
                    {tracks.filter(t => t.source === Track.Source.Camera).map(track => {
                      const p = track.participant;
                      const cameraEnabled = p.isCameraEnabled;
                      const isSpeaking = p.isSpeaking;
                      const isLocal = p.isLocal;
                      const meta = p.metadata ? JSON.parse(p.metadata) : null;
                      const pAvatar = isLocal ? avatarUrl : (meta?.avatarUrl || null);
                      const isHandRaised = isLocal ? localHandRaised : (handRaises[p.identity] || handRaises[meta?.userId] || false);

                      return (
                        <div key={p.sid} className={cn("relative bg-slate-900 border rounded-xl overflow-hidden aspect-video w-36 md:w-full shrink-0", isSpeaking ? "border-cyan-400" : "border-slate-850")}>
                          {cameraEnabled ? (
                            <VideoTrack trackRef={track as any} className="w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-slate-955 gap-1.5">
                              <Avatar name={p.identity || 'User'} src={pAvatar} size="sm" className="border border-slate-800" />
                              <span className="text-[8px] text-slate-600 font-black uppercase tracking-wider">Off</span>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 backdrop-blur-md bg-slate-950/60 border border-slate-850 px-1.5 py-0.5 rounded text-[8px] z-10 select-none">
                            {p.identity} {isLocal ? '(You)' : ''}
                          </div>
                          {isHandRaised && (
                            <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 p-1 rounded-full z-10 shadow-lg animate-bounce">
                              <Hand size={12} className="stroke-[2.5]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const paginatedTracks = tracks.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

            return (
              <div 
                className="flex-1 flex flex-col justify-center min-h-0 select-none relative"
                onTouchStart={handleGridTouchStart}
                onTouchEnd={handleGridTouchEnd}
              >
                {/* LiveKit Grid Maps */}
                <div className={cn(
                  "grid gap-4 w-full h-full max-w-6xl mx-auto content-center justify-center flex-grow",
                  paginatedTracks.length === 1 
                    ? "grid-cols-1 md:grid-cols-1 max-h-[480px]" 
                    : paginatedTracks.length === 2 
                    ? "grid-cols-1 md:grid-cols-2 max-h-[480px]" 
                    : paginatedTracks.length === 3 
                    ? "grid-cols-1 md:grid-cols-3 max-h-[380px]" 
                    : "grid-cols-2 md:grid-cols-3 lg:grid-cols-3 max-h-[500px]"
                )}>
                  {paginatedTracks.map(track => {
                    const p = track.participant;
                    const isLocal = p.isLocal;
                    const isSpeaking = p.isSpeaking;
                    const cameraEnabled = p.isCameraEnabled;
                    const micEnabled = p.isMicrophoneEnabled;
                    const isScreenShare = track.source === Track.Source.ScreenShare;

                    // Load custom avatar meta details if applicable
                    const meta = p.metadata ? JSON.parse(p.metadata) : null;
                    const pAvatar = isLocal ? avatarUrl : (meta?.avatarUrl || null);
                    const isHandRaised = isLocal ? localHandRaised : (handRaises[p.identity] || handRaises[meta?.userId] || false);

                    return (
                      <div 
                        key={track.publication?.trackSid || p.sid + '-' + track.source} 
                        className={cn(
                          "relative bg-slate-900 border rounded-2xl overflow-hidden aspect-video shadow-lg transition-all duration-300",
                          isSpeaking ? "border-cyan-400 ring-2 ring-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)] scale-[1.01]" : "border-slate-850"
                        )}
                      >
                        {cameraEnabled || isScreenShare ? (
                          <VideoTrack 
                            trackRef={track as any} 
                            className="w-full h-full object-cover"
                            style={isLocal && !isScreenShare ? { transform: 'scaleX(-1)' } : undefined}
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-slate-955 gap-3">
                            <Avatar name={p.identity || 'Aero User'} src={pAvatar} size="lg" className="border border-slate-800" />
                            <span className="text-[9px] text-slate-555 font-black uppercase tracking-widest font-mono">Camera is off</span>
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 backdrop-blur-md bg-slate-955/60 border border-slate-850 px-2.5 py-1 rounded-lg z-10 flex items-center gap-1.5 select-none">
                          <span className="text-[10px] text-slate-202 font-semibold">
                            {p.identity} {isLocal ? '(You)' : ''} {isScreenShare ? '(Screen)' : ''}
                          </span>
                          {!micEnabled && !isScreenShare && <MicOff size={10} className="text-rose-400 shrink-0" />}
                        </div>
                        {isHandRaised && !isScreenShare && (
                          <div className="absolute top-3 right-3 bg-amber-500 text-slate-955 p-1 rounded-full z-10 shadow-lg animate-bounce">
                            <Hand size={14} className="stroke-[2.5]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Grid Pagination Dots */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4 z-20">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentPage(idx);
                          if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(30);
                        }}
                        className={cn(
                          "w-2.5 h-2.5 rounded-full transition-all duration-150 border border-transparent min-h-[12px] min-w-[12px]",
                          currentPage === idx ? "bg-cyan-400 w-5 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-slate-700 hover:bg-slate-650"
                        )}
                        title={`Go to grid page ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── 3. CONTROL DOCK ── */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-full px-5 py-3 flex items-center gap-4.5 z-30 shadow-2xl shadow-slate-950/60 select-none">
            
            {/* Mic toggle */}
            <div className="flex items-center relative" ref={micMenuRef}>
              <button
                onClick={toggleMute}
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                  micOn 
                    ? "bg-slate-800/60 hover:bg-slate-800 text-slate-200" 
                    : "bg-rose-500 text-slate-955 font-bold"
                )}
                style={{ minWidth: '44px', minHeight: '44px' }}
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

            {/* Video toggle */}
            <div className="flex items-center relative" ref={cameraMenuRef}>
              <button
                onClick={toggleCamera}
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                  cameraOn 
                    ? "bg-slate-800/60 hover:bg-slate-800 text-slate-200" 
                    : "bg-rose-500 text-slate-955 font-bold"
                )}
                style={{ minWidth: '44px', minHeight: '44px' }}
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
                <div className="absolute bottom-12 left-0 bg-slate-900 border border-slate-855 rounded-xl shadow-2xl p-1.5 z-50 w-44 flex flex-col gap-0.5 animate-fadeIn">
                  <p className="text-[8px] font-black text-slate-555 uppercase tracking-widest px-2 py-1">Camera Properties</p>
                  <button onClick={() => setShowCameraMenu(false)} className="w-full text-left px-2 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800 rounded-lg">HD FaceCam Studio</button>
                  <button onClick={() => setShowCameraMenu(false)} className="w-full text-left px-2 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800 rounded-lg mt-0.5">Virtual Screen Cam</button>
                </div>
              )}
            </div>

            {/* Screen share */}
            <button
              onClick={toggleScreenShare}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                sharing 
                  ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:scale-[1.02]" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-emerald-450"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title={sharing ? "Stop Sharing Screen" : "Share Screen"}
            >
              <Monitor size={16} className="stroke-[2.5]" />
            </button>

            {/* Separator */}
            <div className="w-[1px] h-6 bg-slate-800" />

            {/* Whiteboard */}
            <button
              onClick={() => setWhiteboardActive(!whiteboardActive)}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                whiteboardActive 
                  ? "bg-cyan-500 text-slate-955 font-black shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-[1.02]" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-cyan-400"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title={whiteboardActive ? "Close Whiteboard Stage" : "Open Collaboration Whiteboard"}
            >
              <Pencil size={16} className="stroke-[2.5]" />
            </button>

            {/* Breakout Manager */}
            <button
              onClick={() => { setBreakoutStep(1); setShowBreakoutModal(true); }}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                showBreakoutModal 
                  ? "bg-indigo-500/20 text-indigo-400 border-indigo-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-indigo-400"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="Manage Breakout Rooms"
            >
              <Grid size={16} />
            </button>

            {/* Host Shield Security */}
            <button
              onClick={() => setShowSecurityModal(true)}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                showSecurityModal 
                  ? "bg-rose-500/15 text-rose-455 border-rose-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-rose-455"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="Host Security Settings"
            >
              <Shield size={16} />
            </button>

            {/* Reactions Picker */}
            <div className="relative" ref={emojiRef}>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                  showEmojiPicker 
                    ? "bg-slate-800 text-cyan-400 border-slate-850" 
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
                )}
                style={{ minWidth: '44px', minHeight: '44px' }}
                title="Send Reaction"
              >
                <Smile size={16} />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-855 rounded-xl p-2 shadow-2xl z-50 flex gap-1.5 animate-fadeIn">
                  {['👍', '❤️', '😂', '😮', '🎉', '🔥'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { handleBroadcastReaction(emoji); setShowEmojiPicker(false); }}
                      className="w-8 h-8 rounded-lg hover:bg-slate-850 flex items-center justify-center text-sm cursor-pointer hover:scale-110 active:scale-95 transition-all select-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hand Raise toggle */}
            {/* Hand Raise toggle */}
            <button
              onClick={toggleHandRaise}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                localHandRaised 
                  ? "bg-amber-500 text-slate-955 font-black shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:scale-[1.02]" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-amber-400"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title={localHandRaised ? "Lower Hand" : "Raise Hand"}
            >
              <Hand size={16} className={cn("transition-transform duration-200", localHandRaised && "scale-110")} />
            </button>

            {/* Battery & Data Saver */}
            <button
              onClick={() => setDataSaverActive(!dataSaverActive)}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                dataSaverActive 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-black shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:scale-[1.02]" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-emerald-400"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title={dataSaverActive ? "Disable Battery & Data Saver" : "Enable Battery & Data Saver (Cap FPS & Resolution)"}
            >
              <Zap size={16} className={cn(dataSaverActive && "animate-bounce")} />
            </button>

            {/* Sidebar Triggers */}
            <button
              onClick={() => handleToggleSidebar('People')}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                sidebarOpen && activeTab === 'People'
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="Participants list"
            >
              <Users size={16} />
            </button>

            <button
              onClick={() => handleToggleSidebar('Chat')}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                sidebarOpen && activeTab === 'Chat'
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="Channel Chat feed"
            >
              <MessageSquare size={16} />
            </button>

            <button
              onClick={() => handleToggleSidebar('Q&A')}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                sidebarOpen && activeTab === 'Q&A'
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="Questions & Answers"
            >
              <HelpCircle size={16} />
            </button>

            <button
              onClick={() => handleToggleSidebar('Notes')}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                sidebarOpen && activeTab === 'Notes'
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="Shared Notes Pad"
            >
              <FileText size={16} />
            </button>

            {(userId === meetingHostId || meetingHostId === '') && (
              <button
                onClick={() => handleToggleSidebar('Backstage')}
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                  sidebarOpen && activeTab === 'Backstage'
                    ? "bg-rose-500/10 text-rose-400 border-rose-550/20" 
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
                )}
                style={{ minWidth: '44px', minHeight: '44px' }}
                title="Virtual Backstage Room"
              >
                <Radio size={16} className={cn(backstageActive && "text-rose-500 animate-pulse")} />
              </button>
            )}

            <div className="w-[1px] h-6 bg-slate-800" />

            {/* Leave button */}
            <button
              onClick={handleLeaveMeeting}
              className="px-5 h-11 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-slate-955 font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/10 transition-all cursor-pointer border-0 shrink-0"
              style={{ minWidth: '80px', minHeight: '44px' }}
              title="Leave call room"
            >
              <PhoneOff size={13} className="text-slate-955 stroke-[2.5]" />
              Leave
            </button>
          </div>
        </div>

        {/* ── 4. RIGHT SIDEBAR ── */}
        <aside className={cn(
          "bg-slate-905 border-slate-900 flex flex-col h-full z-20 transition-all duration-300 select-none overflow-hidden shrink-0",
          sidebarOpen ? "w-80 md:w-88 border-l" : "w-0 border-l-0"
        )}>
          
          <div className="h-16 border-b border-slate-900 flex flex-col justify-end px-4 shrink-0 select-none bg-slate-905">
            <div className="flex justify-between items-center flex-1 py-1">
              <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Engagement Panel</span>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-505 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-900">
                <X size={15} />
              </button>
            </div>
            
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
              {([
                'People',
                'Chat',
                'Q&A',
                'Notes',
                ...(userId === meetingHostId || meetingHostId === '' ? ['Backstage'] : [])
              ] as SidebarTab[]).map(tab => {
                const isTabActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "pb-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap",
                      isTabActive ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-500 hover:text-slate-350"
                    )}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: People */}
          {activeTab === 'People' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20 select-none text-left">
              <div className="px-4 py-3.5 border-b border-slate-900/60 shrink-0">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2">
                  <Search size={13} className="text-slate-550 shrink-0" />
                  <input
                    value={peopleSearch}
                    onChange={e => setPeopleSearch(e.target.value)}
                    placeholder="Search participants..."
                    className="flex-1 bg-transparent text-xs text-slate-205 placeholder-slate-700 outline-none font-outfit"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5 scrollbar-thin">
                <p className="text-[9px] font-black text-slate-550 uppercase tracking-widest mb-2 px-1">Meeting Active ({remoteParticipants.length + 1})</p>
                
                {/* Local user */}
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-slate-900/20 border border-slate-900/40">
                  <Avatar name={userName} src={avatarUrl} size="sm" className="border border-slate-800" />
                  <div className="flex-1 leading-none text-left min-w-0">
                    <span className="text-xs font-bold text-slate-200 block truncate">{userName}</span>
                    <span className="text-[8px] font-bold text-indigo-400 tracking-wider uppercase mt-1 block">Host</span>
                  </div>
                  {localHandRaised && (
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 text-[8px] font-bold flex items-center gap-1 shrink-0 mr-1">
                      ✋ Raised
                    </span>
                  )}
                  <span className="text-[9px] text-slate-600 pr-1">(You)</span>
                </div>

                {/* Remote users */}
                {remoteParticipants
                  .filter(p => p.identity.toLowerCase().includes(peopleSearch.toLowerCase()))
                  .map(p => {
                    const meta = p.metadata ? JSON.parse(p.metadata) : null;
                    const isHandRaised = handRaises[p.identity] || handRaises[meta?.userId] || false;
                    return (
                      <div key={p.sid} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-900/20 transition-all border border-transparent hover:border-slate-900/30">
                        <Avatar name={p.identity} size="sm" className="border border-slate-855" />
                        <div className="flex-1 leading-none text-left min-w-0">
                          <span className="text-xs font-bold text-slate-300 block truncate">{p.identity}</span>
                          <span className="text-[8px] font-bold text-slate-500 tracking-wider uppercase mt-1 block">Caller</span>
                        </div>
                        {isHandRaised && (
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 text-[8px] font-bold flex items-center gap-1 shrink-0 mr-1">
                            ✋ Raised
                          </span>
                        )}
                        {!p.isMicrophoneEnabled && <MicOff size={11} className="text-rose-455 pr-1 shrink-0" />}
                      </div>
                    );
                  })}
              </div>

              <div className="p-4 border-t border-slate-900 shrink-0 select-none">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Meeting room link copied to clipboard.");
                  }}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-550 hover:to-cyan-450 text-slate-955 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center justify-center gap-1.5 cursor-pointer border-0"
                >
                  <UserPlus size={13} className="stroke-[2.5]" />
                  Invite Teammates
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Chat */}
          {activeTab === 'Chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20 text-left">
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none h-full">
                    <MessageSquare size={26} className="text-slate-655 mb-3 opacity-40" />
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

              <div className="p-4 border-t border-slate-900 bg-slate-905 shrink-0 select-none font-outfit">
                <div className="flex items-end gap-2 bg-slate-950 border border-slate-855 rounded-xl px-3 py-2.5 focus-within:border-cyan-500/40 transition-colors">
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

          {/* TAB 3: Q&A */}
          {activeTab === 'Q&A' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20 text-left select-none">
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin select-none">
                {questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center h-full">
                    <HelpCircle size={28} className="text-slate-655 mb-3 opacity-40 stroke-[2.5]" />
                    <p className="text-xs font-bold text-slate-455">No questions yet</p>
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
                            : "bg-slate-950/40 text-slate-500 hover:text-slate-350 hover:border-slate-850"
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

              <div className="p-4 border-t border-slate-900 bg-slate-905 shrink-0 select-none">
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={2}
                    value={qaDraft}
                    onChange={e => setQaDraft(e.target.value)}
                    placeholder="Ask a question..."
                    className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-slate-202 placeholder:text-slate-700 outline-none resize-none transition-all font-outfit select-text"
                  />
                  <button
                    onClick={handleSendQuestion}
                    disabled={!qaDraft.trim()}
                    className={cn(
                      "self-end px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border",
                      qaDraft.trim()
                        ? "bg-cyan-500 text-slate-955 border-transparent shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:scale-[1.02]"
                        : "bg-slate-900 text-slate-655 border-slate-850/50 cursor-not-allowed"
                    )}
                  >
                    Submit Question
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Notes */}
          {activeTab === 'Notes' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20 text-left">
              <div className="p-3 bg-slate-900/40 border-b border-slate-900 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">Real-Time Shared Document</span>
                <p className="text-[9px] text-slate-500 mt-0.5">Collab edits sync instantly to everyone in room.</p>
              </div>
              <div className="flex-1 p-3.5 flex flex-col min-h-0">
                <textarea
                  value={documentText}
                  onChange={e => handleDocumentChange(e.target.value)}
                  placeholder="Collaborate on meeting notes, outline, or code snippet here..."
                  className="flex-1 w-full bg-slate-950 border border-slate-855 rounded-xl p-3 text-xs text-slate-202 placeholder-slate-700 outline-none resize-none font-mono focus:border-cyan-500/40 transition-colors"
                />
              </div>
            </div>
          )}

          {/* TAB 5: Backstage whispers */}
          {activeTab === 'Backstage' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20 text-left">
              <div className="p-3 bg-rose-950/20 border-b border-rose-900/30 shrink-0 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Virtual Backstage</span>
                  <p className="text-[9px] text-slate-500 mt-0.5">Whisper and chat privately with co-hosts.</p>
                </div>
                <button
                  onClick={handleToggleBackstage}
                  className={cn(
                    "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-wider border cursor-pointer transition-colors",
                    backstageActive 
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300"
                  )}
                >
                  {backstageActive ? "Active" : "Go Backstage"}
                </button>
              </div>

              {backstageActive ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                    {backstageMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none h-full">
                        <Radio size={24} className="text-rose-500 mb-3 opacity-40 animate-pulse" />
                        <p className="text-xs font-bold text-rose-455">Backstage room is silent</p>
                        <p className="text-[9px] text-slate-600 mt-1 max-w-[170px] leading-relaxed">
                          Send a co-host whisper below. Only backstage active users see this.
                        </p>
                      </div>
                    ) : (
                      backstageMessages.map((msg, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5 leading-tight select-text text-left">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold text-rose-400">{msg.userName}</span>
                            <span className="text-[8px] text-slate-600 font-semibold">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs leading-normal mt-1 break-words bg-rose-955/10 border border-rose-900/10 rounded-lg p-2">{msg.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t border-slate-900 bg-slate-905 shrink-0 select-none font-outfit">
                    <div className="flex items-end gap-2 bg-slate-950 border border-slate-855 rounded-xl px-3 py-2.5 focus-within:border-rose-500/40 transition-colors">
                      <textarea
                        rows={1}
                        value={backstageDraft}
                        onChange={e => setBackstageDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendBackstageWhisper(); } }}
                        placeholder="Send private backstage whisper..."
                        className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-700 outline-none resize-none max-h-24 leading-normal select-text font-outfit"
                        style={{ minHeight: '18px' }}
                      />
                      <button
                        onClick={handleSendBackstageWhisper}
                        disabled={!backstageDraft.trim()}
                        className={cn(
                          "shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer",
                          backstageDraft.trim() ? "text-rose-400 hover:bg-slate-900" : "text-slate-800 cursor-not-allowed"
                        )}
                      >
                        <Send size={13} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center select-none text-left h-full">
                  <Radio size={28} className="text-slate-700 mb-3 opacity-40" />
                  <p className="text-xs font-bold text-slate-450">Backstage is currently inactive</p>
                  <p className="text-[9px] text-slate-600 mt-1 max-w-[170px] leading-relaxed">
                    Click "Go Backstage" to connect to the private communication frequency.
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Security Modals & Breakouts */}
      {showSecurityModal && (
        <SecurityModal meetingId={meetingId} setSecuritySettings={setSecuritySettings} securitySettings={securitySettings} setShowSecurityModal={setShowSecurityModal} />
      )}
      {showBreakoutModal && (
        <BreakoutModal 
          breakoutStep={breakoutStep} 
          setBreakoutStep={setBreakoutStep} 
          roomCount={roomCount} 
          setRoomCount={setRoomCount}
          assignmentMode={assignmentMode} 
          setAssignmentMode={setAssignmentMode} 
          autoCloseMinutes={autoCloseMinutes} 
          setAutoCloseMinutes={setAutoCloseMinutes}
          breakoutRoomsData={breakoutRoomsData} 
          setBreakoutRoomsData={setBreakoutRoomsData} 
          roomsActive={roomsActive} 
          setRoomsActive={setRoomsActive} 
          setShowBreakoutModal={setShowBreakoutModal}
          userName={userName}
        />
      )}
    </div>
  );
}

// ─── W E B R T C   M E E T I N G   R O O M   I N N E R ────────────────────────
function WebRTCMeetingRoomInner({ 
  meetingId, 
  socket, 
  userId, 
  userName, 
  avatarUrl, 
  router 
}: { 
  meetingId: string; 
  socket: any; 
  userId: string; 
  userName: string; 
  avatarUrl: string | null; 
  router: any;
}) {
  const [currentRoomId, setCurrentRoomId] = useState(meetingId);
  const [breakoutExpiresAt, setBreakoutExpiresAt] = useState<number | null>(null);
  const [breakoutMyRoom, setBreakoutMyRoom] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

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
  } = useWebRTC(currentRoomId, socket, userId, userName);

  const micOn = !isMuted;
  const cameraOn = !isCameraOff;
  const sharing = isScreenSharing;

  const handleToggleMute = () => {
    toggleMute();
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleToggleCamera = () => {
    toggleCamera();
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleLeaveMeeting = () => {
    if (socket) {
      socket.emit('user-leave', { roomId: meetingId, userId });
    }
    router.push('/dashboard');
  };

  // 2. UI panel states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('People');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Collaborative document states
  const [documentText, setDocumentText] = useState<string>('');

  // Backstage states
  const [meetingHostId, setMeetingHostId] = useState<string>('');
  const [backstageActive, setBackstageActive] = useState<boolean>(false);
  const [backstageMessages, setBackstageMessages] = useState<any[]>([]);
  const [backstageDraft, setBackstageDraft] = useState<string>('');

  // Battery & Data Saver state
  const [dataSaverActive, setDataSaverActive] = useState<boolean>(false);

  // Fetch meeting host details
  useEffect(() => {
    async function fetchMeetingDetails() {
      try {
        const res = await api.get(`/meetings/${meetingId}`);
        if (res.data?.success && res.data?.meeting) {
          setMeetingHostId(res.data.meeting.hostId);
        }
      } catch (err) {
        console.warn("Failed to fetch meeting details:", err);
      }
    }
    fetchMeetingDetails();
  }, [meetingId]);

  // Socket sync listeners for notes and backstage whispers
  useEffect(() => {
    if (!socket) return;

    const handleDocSync = (text: string) => {
      setDocumentText(text);
    };

    const handleDocChange = (text: string) => {
      setDocumentText(text);
    };

    const handleBackstageRecv = (msg: any) => {
      setBackstageMessages(prev => [...prev, msg]);
    };

    socket.on('document-sync', handleDocSync);
    socket.on('document-change', handleDocChange);
    socket.on('backstage-msg-recv', handleBackstageRecv);

    return () => {
      socket.off('document-sync', handleDocSync);
      socket.off('document-change', handleDocChange);
      socket.off('backstage-msg-recv', handleBackstageRecv);
    };
  }, [socket]);

  // Adjust camera constraints dynamically for Battery & Data Saver
  useEffect(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      try {
        if (dataSaverActive) {
          videoTrack.applyConstraints({ width: 320, height: 180, frameRate: 15 }).catch(err => {
            console.warn("Could not apply low bandwidth constraints:", err);
          });
        } else {
          videoTrack.applyConstraints({ width: 640, height: 360, frameRate: 24 }).catch(err => {
            console.warn("Could not apply standard bandwidth constraints:", err);
          });
        }
      } catch (err) {
        console.warn("Could not adjust WebRTC video constraints:", err);
      }
    }
  }, [dataSaverActive, localStream]);

  const handleDocumentChange = (text: string) => {
    setDocumentText(text);
    socket?.emit('document-change', { roomId: meetingId, text });
  };

  const handleToggleBackstage = () => {
    if (!socket) return;
    const nextActive = !backstageActive;
    setBackstageActive(nextActive);
    if (nextActive) {
      socket.emit('join-backstage', { roomId: meetingId, userId, userName });
    } else {
      socket.emit('leave-backstage', { roomId: meetingId });
    }
  };

  const handleSendBackstageWhisper = () => {
    if (!socket || !backstageDraft.trim()) return;
    socket.emit('backstage-msg-send', {
      roomId: meetingId,
      userId,
      userName,
      content: backstageDraft.trim()
    });
    setBackstageDraft('');
  };
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

  // Custom mock assignment lists for breakout step 2
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

  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [qaDraft, setQaDraft] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [localHandRaised, setLocalHandRaised] = useState(false);
  const [handRaises, setHandRaises] = useState<Record<string, boolean>>({});
  const [captions, setCaptions] = useState<{ id: string; speakerName: string; text: string; timestamp: number }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const channelRef = useRef<any>(null);

  // ─── Swipe-to-Paginate grid states ───
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 6;
  const totalPages = Math.ceil(participants.length / pageSize); // Note: WebRTC renders participants in a grid, local user is first, then remote participants.
  const touchStartRef = useRef<number>(0);

  // Ensure current page is valid when participant count changes
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [participants.length, totalPages, currentPage]);

  const handleGridTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleGridTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current;
    if (deltaX < -60) {
      if (currentPage < totalPages - 1) {
        setCurrentPage(prev => prev + 1);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(40);
        }
      }
    } else if (deltaX > 60) {
      if (currentPage > 0) {
        setCurrentPage(prev => prev - 1);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(40);
        }
      }
    }
  };

  // ─── Auto Picture-in-Picture on browser tab background ───
  useEffect(() => {
    if (typeof document === 'undefined' || !document.pictureInPictureEnabled) return;

    const handleVisibilityChange = async () => {
      try {
        if (document.visibilityState === 'hidden') {
          const video = document.querySelector('video');
          if (video && video.readyState >= 2 && !document.pictureInPictureElement) {
            await video.requestPictureInPicture();
          }
        } else if (document.visibilityState === 'visible') {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          }
        }
      } catch (err) {
        console.warn('Failed to toggle Picture-in-Picture state:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ─── Register W3C MediaSession Actions ───
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Meeting fallback: ${meetingId}`,
        artist: 'AeroMeet',
        album: 'Video Conferencing Stage'
      });

      navigator.mediaSession.setActionHandler('togglemicrophone' as any, () => {
        handleToggleMute();
      });

      navigator.mediaSession.setActionHandler('togglecamera' as any, () => {
        handleToggleCamera();
      });

      navigator.mediaSession.setActionHandler('hangup' as any, () => {
        handleLeaveMeeting();
      });
    } catch (e) {
      console.warn('MediaSession action registration failed:', e);
    }

    return () => {
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('togglemicrophone' as any, null);
        navigator.mediaSession.setActionHandler('togglecamera' as any, null);
        navigator.mediaSession.setActionHandler('hangup' as any, null);
      }
    };
  }, [meetingId, isMuted, isCameraOff, handleLeaveMeeting]);

  // Fetch Q&A questions from database
  const fetchQuestions = useCallback(async () => {
    if (!meetingId) return;
    try {
      const res = await api.get(`/meetings/${meetingId}/questions`);
      if (res.data && res.data.success) {
        const mapped = res.data.questions.map((q: any) => ({
          id: q.id,
          author: q.authorName,
          text: q.text,
          upvotes: q.upvotes ? q.upvotes.length : 0,
          upvoted: q.upvotes ? q.upvotes.includes(userId) : false,
          createdAt: q.createdAt
        }));
        setQuestions(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch meeting questions:', err);
    }
  }, [meetingId, userId]);

  // Timer duration
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const startRecording = () => {
    // 1. Gather all active audio tracks
    const audioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    let mixedAudioTrack: MediaStreamTrack | null = null;
    let audioContext: AudioContext | null = null;
    let audioDest: MediaStreamAudioDestinationNode | null = null;
    const audioSources: any[] = [];

    try {
      const audioStreams: MediaStream[] = [];
      if (localStream && localStream.getAudioTracks().length > 0 && !isMuted) {
        audioStreams.push(localStream);
      }
      Object.values(remoteStreams).forEach((rStream: any) => {
        if (rStream && rStream.getAudioTracks().length > 0) {
          audioStreams.push(rStream);
        }
      });

      if (audioStreams.length > 0) {
        audioContext = new audioContextClass();
        audioDest = audioContext.createMediaStreamDestination();
        audioStreams.forEach(stream => {
          try {
            const source = audioContext!.createMediaStreamSource(stream);
            source.connect(audioDest!);
            audioSources.push(source);
          } catch (e) {
            console.warn("Failed to connect audio stream source:", e);
          }
        });
        mixedAudioTrack = audioDest.stream.getAudioTracks()[0];
      }
    } catch (err) {
      console.warn("Could not mix audio streams for recording:", err);
    }

    // 2. Gather active video track
    let videoTrack: MediaStreamTrack | null = null;
    let dummyIntervalId: any = null;

    // A. Local screen share
    if (isScreenSharing && localStream) {
      videoTrack = localStream.getVideoTracks()[0] || null;
    }
    // B. Remote screen share
    if (!videoTrack) {
      const presenter = participants.find(p => p.isScreenSharing);
      if (presenter && remoteStreams[presenter.socketId]) {
        videoTrack = remoteStreams[presenter.socketId].getVideoTracks()[0] || null;
      }
    }
    // C. Local webcam
    if (!videoTrack && localStream && localStream.getVideoTracks().length > 0) {
      videoTrack = localStream.getVideoTracks()[0] || null;
    }
    // D. Remote webcam
    if (!videoTrack) {
      const remoteWithVideo = Object.values(remoteStreams).find(s => s && s.getVideoTracks().length > 0);
      if (remoteWithVideo) {
        videoTrack = remoteWithVideo.getVideoTracks()[0] || null;
      }
    }
    // E. Fallback dummy black canvas
    if (!videoTrack) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = '#64748b';
          ctx.font = '16px sans-serif';
          ctx.fillText('Recording Active (No Video)', 220, 180);
        }
        dummyIntervalId = setInterval(() => {
          if (ctx) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 640, 360);
            ctx.fillStyle = '#64748b';
            ctx.font = '16px sans-serif';
            ctx.fillText('Recording Active (No Video)', 220, 180);
          }
        }, 1000);
        const canvasStream = (canvas as any).captureStream(10);
        videoTrack = canvasStream.getVideoTracks()[0];
      } catch (err) {
        console.warn("Failed to create dummy video track:", err);
      }
    }

    const tracksToRecord: MediaStreamTrack[] = [];
    if (videoTrack) tracksToRecord.push(videoTrack);
    if (mixedAudioTrack) tracksToRecord.push(mixedAudioTrack);

    if (tracksToRecord.length === 0) {
      alert("No audio/video streams available to record.");
      return;
    }

    const streamToRecord = new MediaStream(tracksToRecord);
    recordedChunksRef.current = [];
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamToRecord, options);
    } catch (e) {
      try {
        recorder = new MediaRecorder(streamToRecord, { mimeType: 'video/webm' });
      } catch (e2) {
        try {
          recorder = new MediaRecorder(streamToRecord, { mimeType: 'video/mp4' });
        } catch (e3) {
          recorder = new MediaRecorder(streamToRecord);
        }
      }
    }
    
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      if (dummyIntervalId) {
        clearInterval(dummyIntervalId);
      }
      try {
        audioSources.forEach(src => src.disconnect());
        if (audioContext) {
          audioContext.close();
        }
      } catch (err) {
        console.warn("Error cleaning up audio mixer context:", err);
      }

      console.log("🎥 MediaRecorder stopped. Compiling blob...");
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });

      // Trigger local browser download
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
        a.download = `meeting-recording-${meetingId}-${Date.now()}.${extension}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 150);
      } catch (err) {
        console.warn("Failed to trigger local recording download:", err);
      }
      
      setIsUploadingRecording(true);
      try {
        const file = new File([blob], `${meetingId}-${Date.now()}.webm`, { type: 'video/webm' });
        const filePath = `${meetingId}/${file.name}`;
        
        console.log("🎥 Uploading recording to Supabase Storage:", filePath);
        const { data, error } = await supabase.storage
          .from('meeting_recordings')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('meeting_recordings')
          .getPublicUrl(filePath);

        console.log("🎥 Recording uploaded. Syncing database record...");
        await api.put(`/meetings/${meetingId}/recording`, { recordingUrl: publicUrl });
        
        alert("Meeting recording uploaded to cloud and saved to your device successfully!");
      } catch (err) {
        console.error("❌ Failed to upload meeting recording:", err);
        alert("Could not upload meeting recording.");
      } finally {
        setIsUploadingRecording(false);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000);
    setIsRecording(true);
    console.log("🎥 Meeting recording started.");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log("🎥 Meeting recording stopped.");
    }
  };

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

  // Connect to Supabase Realtime channel for ephemeral states (reactions & hand raises)
  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase.channel(`meet-ephemeral:${meetingId}`, {
      config: {
        broadcast: { self: false }
      }
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        triggerReaction(payload.emoji);
      })
      .on('broadcast', { event: 'hand-raise' }, ({ payload }) => {
        const { userId: peerUserId, isHandRaised } = payload;
        setHandRaises(prev => ({ ...prev, [peerUserId]: isHandRaised }));
      })
      .on('broadcast', { event: 'caption' }, ({ payload }) => {
        console.log('🎙️ Caption event received:', payload);
        const newCap = {
          id: `${payload.speakerId}-${payload.timestamp}-${Math.random()}`,
          speakerName: payload.speakerName,
          text: payload.text,
          timestamp: payload.timestamp
        };
        setCaptions(prev => [...prev.slice(-4), newCap]);
      })
      .on('broadcast', { event: 'qa-update' }, () => {
        fetchQuestions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [meetingId, fetchQuestions]);

  // ─── Breakout Room Routing handlers ───
  const handleToggleRoomsActive = (active: boolean) => {
    setRoomsActive(active);
    if (active) {
      if (socket) {
        socket.emit('start-breakout-rooms', {
          roomId: meetingId,
          rooms: breakoutRoomsData,
          durationMinutes: autoCloseMinutes
        });
      }
    } else {
      if (socket) {
        socket.emit('close-breakout-rooms', {
          roomId: meetingId
        });
      }
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('breakout-rooms-started', ({ rooms, expiresAt }: { rooms: Record<string, string[]>; expiresAt: number }) => {
      console.log('📡 Breakout rooms started:', rooms, expiresAt);
      setBreakoutExpiresAt(expiresAt);
      setRoomsActive(true);

      // Find my assigned room
      const myAssignedRoomEntry = Object.entries(rooms).find(([rName, members]) => {
        return members.some(mName => mName.toLowerCase() === userName.toLowerCase());
      });

      if (myAssignedRoomEntry) {
        const roomName = myAssignedRoomEntry[0];
        setBreakoutMyRoom(roomName);
        const subRoomId = `${meetingId}-breakout-${roomName.replace(/\s+/g, '-').toLowerCase()}`;
        console.log(`➡️ Routing to breakout sub-room: ${roomName} (${subRoomId})`);
        setCurrentRoomId(subRoomId);
      } else {
        console.log('ℹ️ Local user not assigned to any breakout room. Staying in Main Room.');
        setBreakoutMyRoom(null);
        setCurrentRoomId(meetingId);
      }
    });

    socket.on('breakout-rooms-ended', () => {
      console.log('📡 Breakout rooms ended. Returning to Main Room.');
      setBreakoutExpiresAt(null);
      setBreakoutMyRoom(null);
      setRoomsActive(false);
      setCurrentRoomId(meetingId);
    });

    return () => {
      socket.off('breakout-rooms-started');
      socket.off('breakout-rooms-ended');
    };
  }, [socket, userName, meetingId, breakoutRoomsData, autoCloseMinutes]);

  useEffect(() => {
    if (!breakoutExpiresAt) {
      setTimeRemaining('');
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = breakoutExpiresAt - Date.now();
      if (remainingMs <= 0) {
        setTimeRemaining('00:00');
        setCurrentRoomId(meetingId);
        setBreakoutExpiresAt(null);
        setBreakoutMyRoom(null);
        setRoomsActive(false);
        clearInterval(interval);
      } else {
        const totalSecs = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeRemaining(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [breakoutExpiresAt, meetingId]);

  // Speech Recognition hook for live captions
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("⚠️ Web Speech API is not supported in this browser.");
      return;
    }

    if (!micOn) return;

    console.log("🎙️ Initializing Speech Recognition for live captions...");
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const resultIndex = event.resultIndex;
      const transcript = event.results[resultIndex][0].transcript.trim();
      
      if (transcript && channelRef.current) {
        console.log(`🎙️ Local caption: "${transcript}"`);
        
        channelRef.current.send({
          type: 'broadcast',
          event: 'caption',
          payload: {
            speakerId: userId,
            speakerName: userName,
            text: transcript,
            timestamp: Date.now()
          }
        });

        const newCap = {
          id: `${userId}-${Date.now()}-${Math.random()}`,
          speakerName: userName,
          text: transcript,
          timestamp: Date.now()
        };
        setCaptions(prev => [...prev.slice(-4), newCap]);
      }
    };

    recognition.onerror = (err: any) => {
      console.warn("🎙️ Speech Recognition error:", err);
      if (micOn && err.error !== 'not-allowed') {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognition.onend = () => {
      console.log("🎙️ Speech Recognition ended.");
      if (micOn) {
        try { recognition.start(); } catch (e) {}
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start Speech Recognition:", e);
    }

    return () => {
      recognition.abort();
    };
  }, [micOn, userId, userName]);

  // Captions auto-fadeout timer (silence cleanup after 5s)
  useEffect(() => {
    const interval = setInterval(() => {
      setCaptions(prev => prev.filter(c => Date.now() - c.timestamp < 5000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial questions on mount
  useEffect(() => {
    if (userId) {
      fetchQuestions();
    }
  }, [userId, fetchQuestions]);

  // Refresh Q&A when sidebar becomes active
  useEffect(() => {
    if (activeTab === 'Q&A' && meetingId) {
      fetchQuestions();
    }
  }, [activeTab, meetingId, fetchQuestions]);

  // Floating reaction emitter
  const triggerReaction = (emoji: string) => {
    const id = crypto.randomUUID();
    const left = 15 + Math.random() * 70;
    setReactions(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2600);
  };

  const handleBroadcastReaction = (emoji: string) => {
    triggerReaction(emoji);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji, userId, userName }
      });
    }
  };

  const toggleHandRaise = () => {
    const nextState = !localHandRaised;
    setLocalHandRaised(nextState);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'hand-raise',
        payload: { userId, isHandRaised: nextState }
      });
    }
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
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
    setChatDraft('');
  };

  // Direct Q&A Submitting
  const handleSendQuestion = async () => {
    if (!qaDraft.trim() || !meetingId) return;
    
    const draftText = qaDraft.trim();
    setQaDraft('');

    const tempId = `qa-temp-${Date.now()}`;
    const tempQ: QAQuestion = {
      id: tempId,
      author: userName,
      text: draftText,
      upvotes: 0,
      upvoted: false,
      createdAt: new Date().toISOString()
    };
    setQuestions(prev => [tempQ, ...prev]);

    try {
      const res = await api.post(`/meetings/${meetingId}/questions`, { text: draftText });
      if (res.data && res.data.success) {
        const realQ = res.data.question;
        const mappedQ: QAQuestion = {
          id: realQ.id,
          author: realQ.authorName,
          text: realQ.text,
          upvotes: realQ.upvotes ? realQ.upvotes.length : 0,
          upvoted: realQ.upvotes ? realQ.upvotes.includes(userId) : false,
          createdAt: realQ.createdAt
        };
        setQuestions(prev => prev.map(q => q.id === tempId ? mappedQ : q));

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'qa-update',
            payload: {}
          });
        }
      }
    } catch (err) {
      console.error('Failed to submit question:', err);
      setQuestions(prev => prev.filter(q => q.id !== tempId));
    }
  };

  const handleUpvoteQuestion = async (id: string) => {
    if (!meetingId) return;

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

    try {
      const res = await api.post(`/meetings/${meetingId}/questions/${id}/upvote`);
      if (res.data && res.data.success) {
        const realQ = res.data.question;
        const mappedQ: QAQuestion = {
          id: realQ.id,
          author: realQ.authorName,
          text: realQ.text,
          upvotes: realQ.upvotes ? realQ.upvotes.length : 0,
          upvoted: realQ.upvotes ? realQ.upvotes.includes(userId) : false,
          createdAt: realQ.createdAt
        };
        setQuestions(prev => prev.map(q => q.id === id ? mappedQ : q));

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'qa-update',
            payload: {}
          });
        }
      }
    } catch (err) {
      console.error('Failed to toggle upvote:', err);
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
    }
  };

  const handleToggleSidebar = (tab: SidebarTab) => {
    if (sidebarOpen && activeTab === tab) {
      setSidebarOpen(false);
    } else {
      setActiveTab(tab);
      setSidebarOpen(true);
    }
  };



  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-200 font-outfit relative">
      
      {/* ── 1. CALL TOP APP BAR ── */}
      <div className="h-14 bg-slate-905/30 border-b border-slate-900 flex items-center justify-between px-6 shrink-0 z-20 select-none">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sync Active</span>
          <div className="h-4 w-[1px] bg-slate-900" />
          <code className="font-mono text-xs text-cyan-400 bg-cyan-500/5 px-2.5 py-1 rounded-lg border border-cyan-500/10 tracking-widest truncate uppercase">
            {meetingId}
          </code>
        </div>

        {/* Clock Timer */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]" />
          <span className="font-mono text-xs font-bold text-slate-350 tabular-nums uppercase tracking-widest">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Right participants summary & recording */}
        <div className="flex items-center gap-3">
          {/* Host Recording Action */}
          {isUploadingRecording ? (
            <div className="flex items-center gap-1.5 bg-slate-905 border border-slate-800 px-3 py-1.5 rounded-full select-none shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-spin" />
              <span className="text-[10px] font-bold text-cyan-400">Uploading...</span>
            </div>
          ) : isRecording ? (
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/30 px-3 py-1.5 rounded-full shadow-lg transition-all shrink-0 cursor-pointer text-rose-455 font-bold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">Recording</span>
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3 py-1.5 rounded-full shadow-inner transition-all shrink-0 cursor-pointer text-slate-400 hover:text-white"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              <span className="text-[10px] font-black uppercase tracking-wider">Record</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-full shadow-inner select-none shrink-0">
            <Users className="w-3.5 h-3.5 text-slate-450" />
            <span className="text-[10px] font-black text-slate-300">{participants.length + 1} Online</span>
          </div>
        </div>
      </div>

      {/* ── 2. DYNAMIC STAGE ── */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* VIDEO GRID */}
        <div className="flex-1 flex flex-col justify-center p-6 min-w-0 transition-all duration-300 relative bg-slate-950/20 select-none">
          
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
            {reactions.map(r => (
              <FloatingReactionItem key={r.id} emoji={r.emoji} left={r.left} />
            ))}
          </div>

          {breakoutExpiresAt && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-35 flex items-center gap-3 bg-indigo-950/85 border border-indigo-550/30 backdrop-blur-xl px-5 py-2.5 rounded-2xl shadow-2xl">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200">
                {breakoutMyRoom ? `Joined Breakout: ${breakoutMyRoom}` : 'Breakout Session Active (Host / Lobby)'}
              </span>
              <div className="h-4 w-px bg-indigo-500/30" />
              <span className="font-mono text-xs font-black text-indigo-400 tabular-nums">
                {timeRemaining}
              </span>
            </div>
          )}

          {/* Live Captions Floating Overlay */}
          {captions.length > 0 && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-35 flex flex-col items-center gap-2 max-w-[80%] md:max-w-2xl pointer-events-none">
              <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-black/65 border border-white/5 backdrop-blur-md shadow-2xl">
                {captions.map(c => (
                  <div key={c.id} className="text-left text-xs leading-relaxed animate-fadeIn">
                    <span className="font-extrabold text-cyan-400 mr-2 uppercase tracking-wide text-[10px] bg-cyan-950/40 border border-cyan-500/10 px-1.5 py-0.5 rounded-md">
                      {c.speakerName}:
                    </span>
                    <span className="text-slate-100 font-medium font-outfit">{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {whiteboardActive ? (
            <div className="flex-1 w-full h-full p-2 min-h-0 relative select-none">
              <Whiteboard />
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 max-w-[200px] pointer-events-none">
                <div className="bg-slate-900/90 border border-slate-805 p-2.5 rounded-xl flex items-center gap-2 backdrop-blur-md shadow-2xl pointer-events-auto">
                  <Avatar name={userName} src={avatarUrl} size="sm" className="border border-slate-700" />
                  <span className="text-[9px] font-bold text-slate-350 truncate max-w-[100px]">{userName} (You)</span>
                </div>
                {participants.slice(0, 2).map(p => (
                  <div key={p.socketId} className="bg-slate-900/90 border border-slate-805 p-2.5 rounded-xl flex items-center gap-2 backdrop-blur-md shadow-2xl pointer-events-auto">
                    <Avatar name={p.userName} size="sm" className="border border-slate-800" />
                    <span className="text-[9px] font-bold text-slate-350 truncate max-w-[100px]">{p.userName}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : participants.length === 0 ? (
            <div className="w-full max-w-2xl mx-auto aspect-video bg-slate-900/25 border border-slate-900 rounded-3xl flex flex-col items-center justify-center p-10 text-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
              <div className="relative mb-5 select-none">
                <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl scale-75 animate-pulse" />
                <div className="w-24 h-24 rounded-full border border-slate-800 bg-slate-900/60 flex items-center justify-center shadow-2xl relative z-10">
                  <Avatar name={userName} src={avatarUrl} size="lg" className="border border-slate-700 shadow-xl" />
                </div>
              </div>
              <h3 className="text-slate-200 font-bold text-base tracking-tight">You are the only one here</h3>
              <p className="text-slate-550 text-xs mt-2 max-w-[280px] leading-relaxed">
                Waiting for others to join... Invite teammates by sharing the meeting room code in the panel.
              </p>
            </div>
          ) : (() => {
            const screenSharingUser = participants.find(p => p.isScreenSharing) || (sharing ? { socketId: 'local', userName } : null);
            const isPresenterMode = !!screenSharingUser;

            if (isPresenterMode) {
              return (
                <div className="flex-1 flex flex-col md:flex-row gap-4 w-full h-full max-h-[600px] select-none text-left">
                  {/* Big Main Screen Share */}
                  <div className="flex-[4] relative bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl">
                    {screenSharingUser.socketId === 'local' ? (
                      localStream && (
                        <video
                          ref={el => { if (el && localStream) el.srcObject = localStream; }}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      )
                    ) : (
                      remoteStreams[screenSharingUser.socketId] && (
                        <video
                          ref={el => { if (el && remoteStreams[screenSharingUser.socketId]) el.srcObject = remoteStreams[screenSharingUser.socketId]; }}
                          autoPlay
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      )
                    )}
                    <div className="absolute bottom-3 left-3 backdrop-blur-md bg-slate-955/60 border border-slate-850 px-2.5 py-1 rounded-lg z-10 select-none">
                      <span className="text-[10px] text-slate-200 font-semibold">
                        {screenSharingUser.userName}'s Screen
                      </span>
                    </div>
                  </div>
                  
                  {/* Filmstrip Camera Tiles */}
                  <div className="flex-1 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[140px] md:max-h-none md:w-56 shrink-0 scrollbar-thin">
                    {screenSharingUser.socketId !== 'local' && (
                      <div className="relative bg-slate-900 border border-slate-850 rounded-xl overflow-hidden aspect-video w-36 md:w-full shrink-0">
                        {cameraOn && localStream ? (
                          <video
                            ref={el => { if (el && localStream) el.srcObject = localStream; }}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                            style={{ transform: 'scaleX(-1)' }}
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-955">
                            <Avatar name={userName} src={avatarUrl} size="sm" />
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 backdrop-blur-md bg-slate-950/60 border border-slate-850 px-1.5 py-0.5 rounded text-[8px] z-10 select-none">
                          {userName} (You)
                        </div>
                        {localHandRaised && (
                          <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 p-1 rounded-full z-10 shadow-lg animate-bounce">
                            <Hand size={12} className="stroke-[2.5]" />
                          </div>
                        )}
                      </div>
                    )}

                    {participants.map(p => {
                      if (p.socketId === screenSharingUser.socketId) return null;
                      const stream = remoteStreams[p.socketId];
                      const pCameraOn = !p.isCameraOff;
                      const isHandRaised = handRaises[p.userId] || false;

                      return (
                        <div key={p.socketId} className="relative bg-slate-900 border border-slate-850 rounded-xl overflow-hidden aspect-video w-36 md:w-full shrink-0">
                          {pCameraOn && stream ? (
                            <video
                              ref={el => { if (el && stream) el.srcObject = stream; }}
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-955">
                              <Avatar name={p.userName} size="sm" />
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 backdrop-blur-md bg-slate-950/60 border border-slate-850 px-1.5 py-0.5 rounded text-[8px] z-10 select-none">
                            {p.userName}
                          </div>
                          {isHandRaised && (
                            <div className="absolute top-2 right-2 bg-amber-500 text-slate-955 p-1 rounded-full z-10 shadow-lg animate-bounce">
                              <Hand size={12} className="stroke-[2.5]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const tiles: Array<{ isLocal: boolean; key: string; participant?: any }> = [
              { isLocal: true, key: 'local-tile' },
              ...participants.map(p => ({ isLocal: false, key: p.socketId, participant: p }))
            ];
            
            const paginatedTiles = tiles.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
            const totalPages = Math.ceil(tiles.length / pageSize);

            return (
              <div 
                className="flex-1 flex flex-col justify-center min-h-0 select-none relative"
                onTouchStart={handleGridTouchStart}
                onTouchEnd={handleGridTouchEnd}
              >
                {/* Fallback WebRTC Grid Maps */}
                <div className={cn(
                  "grid gap-4 w-full h-full max-w-6xl mx-auto content-center justify-center flex-grow",
                  paginatedTiles.length === 1 
                    ? "grid-cols-1 md:grid-cols-1 max-h-[480px]" 
                    : paginatedTiles.length === 2 
                    ? "grid-cols-1 md:grid-cols-2 max-h-[480px]" 
                    : paginatedTiles.length === 3 
                    ? "grid-cols-1 md:grid-cols-3 max-h-[380px]" 
                    : "grid-cols-2 md:grid-cols-3 lg:grid-cols-3 max-h-[500px]"
                )}>
                  {paginatedTiles.map(tile => {
                    if (tile.isLocal) {
                      return (
                        <div key={tile.key} className="relative bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden aspect-video shadow-lg">
                          {cameraOn && localStream ? (
                            <video
                              ref={el => { if (el && localStream) el.srcObject = localStream; }}
                              autoPlay
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                              style={{ transform: 'scaleX(-1)' }}
                            />
                          ) : (
                            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-slate-955 gap-3">
                              <Avatar name={userName} src={avatarUrl} size="lg" className="border border-slate-800" />
                              <span className="text-[9px] text-slate-550 font-black uppercase tracking-widest font-mono">Camera is off</span>
                            </div>
                          )}
                          <div className="absolute bottom-3 left-3 backdrop-blur-md bg-slate-950/60 border border-slate-850 px-2.5 py-1 rounded-lg z-10 flex items-center gap-1.5 select-none">
                            <span className="text-[10px] text-slate-200 font-semibold">{userName} (You)</span>
                            {!micOn && <MicOff size={10} className="text-rose-400 shrink-0" />}
                          </div>
                          {localHandRaised && (
                            <div className="absolute top-3 right-3 bg-amber-500 text-slate-955 p-1 rounded-full z-10 shadow-lg animate-bounce">
                              <Hand size={14} className="stroke-[2.5]" />
                            </div>
                          )}
                        </div>
                      );
                    }

                    const p = tile.participant!;
                    const stream = remoteStreams[p.socketId];
                    const pCameraOn = !p.isCameraOff;
                    const isHandRaised = handRaises[p.userId] || false;

                    return (
                      <div key={tile.key} className="relative bg-slate-900 border border-slate-855 rounded-2xl overflow-hidden aspect-video shadow-lg">
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
                            <span className="text-[9px] text-slate-555 font-black uppercase tracking-widest font-mono">Camera is off</span>
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 backdrop-blur-md bg-slate-950/60 border border-slate-850 px-2.5 py-1 rounded-lg z-10 flex items-center gap-1.5 select-none">
                          <span className="text-[10px] text-slate-252 font-semibold">{p.userName}</span>
                          {p.isMuted && <MicOff size={10} className="text-rose-400 shrink-0" />}
                        </div>
                        {isHandRaised && (
                          <div className="absolute top-3 right-3 bg-amber-500 text-slate-955 p-1 rounded-full z-10 shadow-lg animate-bounce">
                            <Hand size={14} className="stroke-[2.5]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Grid Pagination Dots */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4 z-20">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentPage(idx);
                          if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(30);
                        }}
                        className={cn(
                          "w-2.5 h-2.5 rounded-full transition-all duration-150 border border-transparent min-h-[12px] min-w-[12px]",
                          currentPage === idx ? "bg-cyan-400 w-5 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-slate-700 hover:bg-slate-650"
                        )}
                        title={`Go to grid page ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── 3. FLOATING LOWER CONTROL DOCK ── */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-full px-5 py-3 flex items-center gap-4.5 z-30 shadow-2xl shadow-slate-950/60 select-none">
            
            <div className="flex items-center relative" ref={micMenuRef}>
              <button
                onClick={handleToggleMute}
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                  micOn 
                    ? "bg-slate-800/60 hover:bg-slate-800 text-slate-202" 
                    : "bg-rose-500 text-slate-955 font-bold"
                )}
                style={{ minWidth: '44px', minHeight: '44px' }}
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

            <div className="flex items-center relative" ref={cameraMenuRef}>
              <button
                onClick={handleToggleCamera}
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                  cameraOn 
                    ? "bg-slate-800/60 hover:bg-slate-800 text-slate-202" 
                    : "bg-rose-500 text-slate-955 font-bold"
                )}
                style={{ minWidth: '44px', minHeight: '44px' }}
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
                  <p className="text-[8px] font-black text-slate-555 uppercase tracking-widest px-2 py-1">Camera Properties</p>
                  <button onClick={() => setShowCameraMenu(false)} className="w-full text-left px-2 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800 rounded-lg">HD FaceCam Studio</button>
                  <button onClick={() => setShowCameraMenu(false)} className="w-full text-left px-2 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800 rounded-lg mt-0.5">Virtual Screen Cam</button>
                </div>
              )}
            </div>

            <button
              onClick={sharing ? stopScreenShare : startScreenShare}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                sharing 
                  ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:scale-[1.02]" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-emerald-455"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title={sharing ? "Stop Sharing Screen" : "Share Screen"}
            >
              <Monitor size={16} className="stroke-[2.5]" />
            </button>

            <div className="w-[1px] h-6 bg-slate-800" />

            <button
              onClick={() => setWhiteboardActive(!whiteboardActive)}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                whiteboardActive 
                  ? "bg-cyan-500 text-slate-955 font-black shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-[1.02]" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-cyan-400"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title={whiteboardActive ? "Close Whiteboard Stage" : "Open Collaboration Whiteboard"}
            >
              <Pencil size={16} className="stroke-[2.5]" />
            </button>

            <button
              onClick={() => { setBreakoutStep(1); setShowBreakoutModal(true); }}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                showBreakoutModal 
                  ? "bg-indigo-500/20 text-indigo-400 border-indigo-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-indigo-400"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="Manage Breakout Rooms"
            >
              <Grid size={16} />
            </button>

            <button
              onClick={() => setShowSecurityModal(true)}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                showSecurityModal 
                  ? "bg-rose-500/15 text-rose-455 border-rose-550/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-202 hover:text-rose-455"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="Host Security Settings"
            >
              <Shield size={16} />
            </button>

            <div className="relative" ref={emojiRef}>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                  showEmojiPicker 
                    ? "bg-slate-800 text-cyan-400 border-slate-850" 
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
                )}
                style={{ minWidth: '44px', minHeight: '44px' }}
                title="Send Reaction"
              >
                <Smile size={16} />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-855 rounded-xl p-2 shadow-2xl z-50 flex gap-1.5 animate-fadeIn">
                  {['👍', '❤️', '😂', '😮', '🎉', '🔥'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { handleBroadcastReaction(emoji); setShowEmojiPicker(false); }}
                      className="w-8 h-8 rounded-lg hover:bg-slate-855 flex items-center justify-center text-sm cursor-pointer hover:scale-110 active:scale-95 transition-all select-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hand Raise toggle */}
            <button
              onClick={toggleHandRaise}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                localHandRaised 
                  ? "bg-amber-500 text-slate-955 font-black shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:scale-[1.02]" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-amber-400"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title={localHandRaised ? "Lower Hand" : "Raise Hand"}
            >
              <Hand size={16} className={cn("transition-transform duration-200", localHandRaised && "scale-110")} />
            </button>

            {/* Battery & Data Saver */}
            <button
              onClick={() => setDataSaverActive(!dataSaverActive)}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                dataSaverActive 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-black shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:scale-[1.02]" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-emerald-400"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title={dataSaverActive ? "Disable Battery & Data Saver" : "Enable Battery & Data Saver (Cap FPS & Resolution)"}
            >
              <Zap size={16} className={cn(dataSaverActive && "animate-bounce")} />
            </button>

            {/* Sidebar Triggers */}
            <button
              onClick={() => handleToggleSidebar('People')}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                sidebarOpen && activeTab === 'People'
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-555/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="Participants list"
            >
              <Users size={16} />
            </button>

            <button
              onClick={() => handleToggleSidebar('Chat')}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                sidebarOpen && activeTab === 'Chat'
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-555/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="Channel Chat feed"
            >
              <MessageSquare size={16} />
            </button>

            <button
              onClick={() => handleToggleSidebar('Q&A')}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                sidebarOpen && activeTab === 'Q&A'
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-555/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="Questions & Answers"
            >
              <HelpCircle size={16} />
            </button>

            <button
              onClick={() => handleToggleSidebar('Notes')}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                sidebarOpen && activeTab === 'Notes'
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-555/20" 
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
              )}
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="Shared Notes Pad"
            >
              <FileText size={16} />
            </button>

            {(userId === meetingHostId || meetingHostId === '') && (
              <button
                onClick={() => handleToggleSidebar('Backstage')}
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border border-transparent shadow-sm shrink-0",
                  sidebarOpen && activeTab === 'Backstage'
                    ? "bg-rose-500/10 text-rose-400 border-rose-555/20" 
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-255"
                )}
                style={{ minWidth: '44px', minHeight: '44px' }}
                title="Virtual Backstage Room"
              >
                <Radio size={16} className={cn(backstageActive && "text-rose-500 animate-pulse")} />
              </button>
            )}

            <div className="w-[1px] h-6 bg-slate-800" />

            <button
              onClick={handleLeaveMeeting}
              className="px-5 h-11 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-slate-955 font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/10 transition-all cursor-pointer border-0 shrink-0"
              style={{ minWidth: '80px', minHeight: '44px' }}
              title="Leave call room"
            >
              <PhoneOff size={13} className="text-slate-955 stroke-[2.5]" />
              Leave
            </button>
          </div>
        </div>

        {/* Engagement sidebar */}
        <aside className={cn(
          "bg-slate-905 border-slate-900 flex flex-col h-full z-20 transition-all duration-305 select-none overflow-hidden shrink-0",
          sidebarOpen ? "w-80 md:w-88 border-l" : "w-0 border-l-0"
        )}>
          <div className="h-16 border-b border-slate-900 flex flex-col justify-end px-4 shrink-0 bg-slate-905">
            <div className="flex justify-between items-center flex-1 py-1">
              <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Engagement Panel</span>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-505 hover:text-slate-350 p-1.5 rounded-lg hover:bg-slate-900">
                <X size={15} />
              </button>
            </div>
            
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
              {([
                'People',
                'Chat',
                'Q&A',
                'Notes',
                ...(userId === meetingHostId || meetingHostId === '' ? ['Backstage'] : [])
              ] as SidebarTab[]).map(tab => {
                const isTabActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "pb-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap",
                      isTabActive ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-505 hover:text-slate-355"
                    )}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: People */}
          {activeTab === 'People' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20 text-left select-none">
              <div className="px-4 py-3.5 border-b border-slate-900/60 shrink-0">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2">
                  <Search size={13} className="text-slate-550 shrink-0" />
                  <input
                    value={peopleSearch}
                    onChange={e => setPeopleSearch(e.target.value)}
                    placeholder="Search participants..."
                    className="flex-1 bg-transparent text-xs text-slate-205 placeholder-slate-700 outline-none font-outfit"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5 scrollbar-thin">
                <p className="text-[9px] font-black text-slate-550 uppercase tracking-widest mb-2 px-1">Meeting Active ({participants.length + 1})</p>
                
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-slate-900/20 border border-slate-900/40">
                  <Avatar name={userName} src={avatarUrl} size="sm" className="border border-slate-800" />
                  <div className="flex-1 leading-none text-left min-w-0">
                    <span className="text-xs font-bold text-slate-200 block truncate">{userName}</span>
                    <span className="text-[8px] font-bold text-indigo-400 tracking-wider uppercase mt-1 block">Host</span>
                  </div>
                  {localHandRaised && (
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 text-[8px] font-bold flex items-center gap-1 shrink-0 mr-1">
                      ✋ Raised
                    </span>
                  )}
                  <span className="text-[9px] text-slate-600 pr-1">(You)</span>
                </div>

                {participants
                  .filter(p => p.userName.toLowerCase().includes(peopleSearch.toLowerCase()))
                  .map(p => {
                    const isHandRaised = handRaises[p.userId] || false;
                    return (
                      <div key={p.socketId} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-900/20 transition-all border border-transparent hover:border-slate-900/30">
                        <Avatar name={p.userName} size="sm" className="border border-slate-850" />
                        <div className="flex-1 leading-none text-left min-w-0">
                          <span className="text-xs font-bold text-slate-300 block truncate">{p.userName}</span>
                          <span className="text-[8px] font-bold text-slate-500 tracking-wider uppercase mt-1 block">Caller</span>
                        </div>
                        {isHandRaised && (
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 text-[8px] font-bold flex items-center gap-1 shrink-0 mr-1">
                            ✋ Raised
                          </span>
                        )}
                        {p.isMuted && <MicOff size={11} className="text-rose-455 pr-1 shrink-0" />}
                      </div>
                    );
                  })}
              </div>

              <div className="p-4 border-t border-slate-900 shrink-0 select-none">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Meeting room link copied to clipboard.");
                  }}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-555 hover:to-cyan-450 text-slate-955 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center justify-center gap-1.5 cursor-pointer border-0"
                >
                  <UserPlus size={13} className="stroke-[2.5]" />
                  Invite Teammates
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Chat */}
          {activeTab === 'Chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20 text-left">
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none h-full">
                    <MessageSquare size={26} className="text-slate-655 mb-3 opacity-40" />
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
                      chatDraft.trim() ? "text-cyan-400 hover:bg-slate-900" : "text-slate-800"
                    )}
                  >
                    <Send size={13} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Q&A */}
          {activeTab === 'Q&A' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20 text-left select-none">
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin select-none">
                {questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center h-full">
                    <HelpCircle size={28} className="text-slate-655 mb-3 opacity-40 stroke-[2.5]" />
                    <p className="text-xs font-bold text-slate-455">No questions yet</p>
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
                            : "bg-slate-950/40 text-slate-500 hover:text-slate-350 hover:border-slate-850"
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

              <div className="p-4 border-t border-slate-900 bg-slate-905 shrink-0 select-none">
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={2}
                    value={qaDraft}
                    onChange={e => setQaDraft(e.target.value)}
                    placeholder="Ask a question..."
                    className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-slate-202 placeholder:text-slate-700 outline-none resize-none transition-all font-outfit select-text"
                  />
                  <button
                    onClick={handleSendQuestion}
                    disabled={!qaDraft.trim()}
                    className={cn(
                      "self-end px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border",
                      qaDraft.trim()
                        ? "bg-cyan-500 text-slate-955 border-transparent shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:scale-[1.02]"
                        : "bg-slate-900 text-slate-655 border-slate-850/50 cursor-not-allowed"
                    )}
                  >
                    Submit Question
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Notes */}
          {activeTab === 'Notes' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20 text-left">
              <div className="p-3 bg-slate-900/40 border-b border-slate-900 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">Real-Time Shared Document</span>
                <p className="text-[9px] text-slate-500 mt-0.5">Collab edits sync instantly to everyone in room.</p>
              </div>
              <div className="flex-1 p-3.5 flex flex-col min-h-0">
                <textarea
                  value={documentText}
                  onChange={e => handleDocumentChange(e.target.value)}
                  placeholder="Collaborate on meeting notes, outline, or code snippet here..."
                  className="flex-1 w-full bg-slate-950 border border-slate-855 rounded-xl p-3 text-xs text-slate-202 placeholder-slate-700 outline-none resize-none font-mono focus:border-cyan-500/40 transition-colors"
                />
              </div>
            </div>
          )}

          {/* TAB 5: Backstage whispers */}
          {activeTab === 'Backstage' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-905/20 text-left">
              <div className="p-3 bg-rose-950/20 border-b border-rose-900/30 shrink-0 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Virtual Backstage</span>
                  <p className="text-[9px] text-slate-500 mt-0.5">Whisper and chat privately with co-hosts.</p>
                </div>
                <button
                  onClick={handleToggleBackstage}
                  className={cn(
                    "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-wider border cursor-pointer transition-colors",
                    backstageActive 
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300"
                  )}
                >
                  {backstageActive ? "Active" : "Go Backstage"}
                </button>
              </div>

              {backstageActive ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                    {backstageMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none h-full">
                        <Radio size={24} className="text-rose-500 mb-3 opacity-40 animate-pulse" />
                        <p className="text-xs font-bold text-rose-455">Backstage room is silent</p>
                        <p className="text-[9px] text-slate-600 mt-1 max-w-[170px] leading-relaxed">
                          Send a co-host whisper below. Only backstage active users see this.
                        </p>
                      </div>
                    ) : (
                      backstageMessages.map((msg, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5 leading-tight select-text text-left">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold text-rose-400">{msg.userName}</span>
                            <span className="text-[8px] text-slate-600 font-semibold">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs leading-normal mt-1 break-words bg-rose-955/10 border border-rose-900/10 rounded-lg p-2">{msg.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t border-slate-900 bg-slate-905 shrink-0 select-none font-outfit">
                    <div className="flex items-end gap-2 bg-slate-950 border border-slate-855 rounded-xl px-3 py-2.5 focus-within:border-rose-500/40 transition-colors">
                      <textarea
                        rows={1}
                        value={backstageDraft}
                        onChange={e => setBackstageDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendBackstageWhisper(); } }}
                        placeholder="Send private backstage whisper..."
                        className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-700 outline-none resize-none max-h-24 leading-normal select-text font-outfit"
                        style={{ minHeight: '18px' }}
                      />
                      <button
                        onClick={handleSendBackstageWhisper}
                        disabled={!backstageDraft.trim()}
                        className={cn(
                          "shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer",
                          backstageDraft.trim() ? "text-rose-400 hover:bg-slate-900" : "text-slate-800 cursor-not-allowed"
                        )}
                      >
                        <Send size={13} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center select-none text-left h-full">
                  <Radio size={28} className="text-slate-700 mb-3 opacity-40" />
                  <p className="text-xs font-bold text-slate-455">Backstage is currently inactive</p>
                  <p className="text-[9px] text-slate-600 mt-1 max-w-[170px] leading-relaxed">
                    Click "Go Backstage" to connect to the private communication frequency.
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {showSecurityModal && (
        <SecurityModal meetingId={meetingId} setSecuritySettings={setSecuritySettings} securitySettings={securitySettings} setShowSecurityModal={setShowSecurityModal} />
      )}
      {showBreakoutModal && (
        <BreakoutModal 
          breakoutStep={breakoutStep} 
          setBreakoutStep={setBreakoutStep} 
          roomCount={roomCount} 
          setRoomCount={setRoomCount}
          assignmentMode={assignmentMode} 
          setAssignmentMode={setAssignmentMode} 
          autoCloseMinutes={autoCloseMinutes} 
          setAutoCloseMinutes={setAutoCloseMinutes}
          breakoutRoomsData={breakoutRoomsData} 
          setBreakoutRoomsData={setBreakoutRoomsData} 
          roomsActive={roomsActive} 
          setRoomsActive={handleToggleRoomsActive} 
          setShowBreakoutModal={setShowBreakoutModal}
          userName={userName}
          participantsList={[userName, ...participants.map(p => p.userName)]}
        />
      )}
    </div>
  );
}

// ─── S H A R E D   S E C U R I T Y   M O D A L ───────────────────────────────
function SecurityModal({ meetingId, securitySettings, setSecuritySettings, setShowSecurityModal }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6.5 shadow-2xl relative">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        <button 
          onClick={() => setShowSecurityModal(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-505 hover:text-slate-350 hover:bg-slate-850 transition-colors cursor-pointer"
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

        <div className="space-y-4 select-none">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1.5 text-left">Global Protections</p>
          <div className="flex items-center justify-between">
            <div className="text-left">
              <span className="text-xs font-bold text-slate-200 block">Lock Meeting</span>
              <span className="text-[10px] text-slate-500 leading-normal block">Prevent new participants from joining this call stage</span>
            </div>
            <button
              onClick={async () => {
                const nextVal = !securitySettings.lockMeeting;
                setSecuritySettings((prev: any) => ({ ...prev, lockMeeting: nextVal }));
                if (nextVal) {
                  try {
                    await api.post('/admin/audit-logs', { action: 'meeting_locked', targetId: meetingId });
                  } catch (e) {
                    console.warn('Failed to audit log lock meeting:', e);
                  }
                }
              }}
              className={cn("w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer relative shrink-0", securitySettings.lockMeeting ? "bg-rose-500" : "bg-slate-800")}
            >
              <div className={cn("w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-md", securitySettings.lockMeeting ? "translate-x-5" : "translate-x-0")} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-left">
              <span className="text-xs font-bold text-slate-200 block">Enable Waiting Room</span>
              <span className="text-[10px] text-slate-500 leading-normal block">Place new entrants in lobby until admitted by host</span>
            </div>
            <button
              onClick={() => setSecuritySettings((prev: any) => ({ ...prev, enableWaitingRoom: !prev.enableWaitingRoom }))}
              className={cn("w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer relative shrink-0", securitySettings.enableWaitingRoom ? "bg-cyan-500" : "bg-slate-800")}
            >
              <div className={cn("w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-md", securitySettings.enableWaitingRoom ? "translate-x-5" : "translate-x-0")} />
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
                  <span className="text-[10px] text-slate-505 leading-normal block">{item.desc}</span>
                </div>
                <button
                  onClick={() => setSecuritySettings((prev: any) => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                  className={cn("w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer relative shrink-0", isActive ? "bg-cyan-500" : "bg-slate-800")}
                >
                  <div className={cn("w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-md", isActive ? "translate-x-5" : "translate-x-0")} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BreakoutModal({ 
  breakoutStep, setBreakoutStep, 
  roomCount, setRoomCount, 
  assignmentMode, setAssignmentMode, 
  autoCloseMinutes, setAutoCloseMinutes, 
  breakoutRoomsData, setBreakoutRoomsData, 
  roomsActive, setRoomsActive, 
  setShowBreakoutModal, userName,
  participantsList
}: any) {
  const allNames = participantsList || ['Sarah Chen', 'David Miller', 'Alex Mercer', 'Marcus Aurelius', userName];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6.5 shadow-2xl relative flex flex-col max-h-[90vh]">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-550/20 to-transparent" />
        <button 
          onClick={() => setShowBreakoutModal(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-505 hover:text-slate-300 hover:bg-slate-850 transition-colors cursor-pointer"
        >
          <X size={15} />
        </button>

        <div className="flex items-center gap-2.5 mb-5.5 shrink-0 select-none">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Grid className="w-4.5 h-4.5" />
          </div>
          <div className="text-left">
            <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">Breakout Rooms Manager</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Divide calls into separate stages</p>
          </div>
        </div>

        {breakoutStep === 1 ? (
          <div className="space-y-6 flex-1 overflow-y-auto pr-1 select-none text-left">
            <div className="bg-slate-955 border border-slate-850 p-5 rounded-2xl">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">How many rooms do you need?</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setRoomCount((prev: any) => Math.max(1, prev - 1))} className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-lg font-bold flex items-center justify-center cursor-pointer transition-colors">—</button>
                <span className="text-xl font-black text-white font-mono w-8 text-center">{roomCount}</span>
                <button onClick={() => setRoomCount((prev: any) => Math.min(10, prev + 1))} className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-300 text-lg font-bold flex items-center justify-center cursor-pointer transition-colors">+</button>
                <span className="text-[10px] text-slate-505 uppercase tracking-wider font-bold">Rooms (Max 10)</span>
              </div>
            </div>

            <div className="space-y-3.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Distribution Mode</span>
              {[
                { id: 'auto', title: 'Assign Automatically', desc: 'Randomly split all callers evenly into rooms' },
                { id: 'manual', title: 'Assign Manually', desc: 'Individually place callers into specific rooms' },
                { id: 'choose', title: 'Let participants choose', desc: 'Allow callers to select their own rooms' }
              ].map(option => {
                const isSelected = assignmentMode === option.id;
                return (
                  <div key={option.id} onClick={() => setAssignmentMode(option.id as any)} className={cn("p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3.5", isSelected ? "bg-cyan-500/5 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.05)]" : "bg-slate-900/40 border-slate-855 hover:bg-slate-900/70")}>
                    <div className={cn("w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0", isSelected ? "border-cyan-405" : "border-slate-700")}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block leading-tight">{option.title}</span>
                      <span className="text-[10px] text-slate-505 mt-1 block">{option.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-850 pt-5 flex gap-3 select-none">
              <button onClick={() => setShowBreakoutModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-855 hover:bg-slate-850 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-350 transition-all cursor-pointer">Cancel</button>
              <button onClick={() => setBreakoutStep(2)} className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-550 text-[10px] font-black uppercase tracking-widest text-slate-950 transition-all cursor-pointer shadow-lg shadow-cyan-550/10 border border-cyan-500/10">Configure Rooms</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 select-none text-left">
            <div className="flex-1 flex gap-4 min-h-[220px] overflow-hidden mb-5">
              <div className="flex-1 border border-slate-850 bg-slate-950/40 rounded-2xl p-4 overflow-y-auto scrollbar-thin flex flex-col gap-3">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1.5">Rooms Grid ({roomCount})</span>
                {Object.entries(breakoutRoomsData).map(([roomName, assignedNames]: any) => (
                  <div key={roomName} className="bg-slate-900/60 border border-slate-855 p-3 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-slate-855/50 pb-1">
                      <span className="text-xs font-bold text-cyan-400">{roomName}</span>
                      <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">{assignedNames.length} Assigned</span>
                    </div>
                    {assignedNames.length === 0 ? (
                      <div className="py-3 text-center">
                        <span className="text-[9px] text-slate-655 font-bold uppercase tracking-widest text-center block">No participants assigned yet</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {assignedNames.map((name: any) => (
                          <div key={name} className="flex items-center gap-1 bg-slate-955 border border-slate-850 px-2 py-0.5 rounded-lg text-[9px] font-bold text-slate-300">
                            {name}
                            <button onClick={() => setBreakoutRoomsData((prev: any) => ({ ...prev, [roomName]: prev[roomName].filter((n: any) => n !== name) }))} className="text-slate-650 hover:text-rose-455 p-0.5 font-bold">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="w-56 border border-slate-850 bg-slate-950/20 rounded-2xl p-4 overflow-y-auto scrollbar-thin flex flex-col gap-3">
                <span className="text-[8px] font-black text-slate-555 uppercase tracking-widest border-b border-slate-850/60 pb-1.5">Lobby Caller List</span>
                {(() => {
                  const allAssigned = Object.values(breakoutRoomsData).flat();
                  const lobbyTeammates = allNames.filter((name: string) => !allAssigned.includes(name));

                  if (lobbyTeammates.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-10 text-center select-none">
                        <Check className="w-5 h-5 text-emerald-450 mb-1" />
                        <span className="text-[9px] text-slate-555 font-black uppercase tracking-wider leading-relaxed">All Assigned</span>
                      </div>
                    );
                  }

                  return lobbyTeammates.map((name: string) => (
                    <div key={name} className="bg-slate-905 border border-slate-850 p-2 rounded-xl flex items-center justify-between gap-1.5">
                      <span className="text-[11px] text-slate-350 font-semibold truncate leading-tight flex-1">{name}</span>
                      <div className="flex gap-0.5">
                        {Object.keys(breakoutRoomsData).map((roomName, idx) => (
                          <button key={roomName} onClick={() => setBreakoutRoomsData((prev: any) => ({ ...prev, [roomName]: [...prev[roomName], name] }))} className="px-1 py-0.5 rounded bg-slate-950 border border-slate-800 text-[8px] font-black text-cyan-455 hover:bg-cyan-500 hover:text-slate-950 transition-colors uppercase cursor-pointer">R{idx + 1}</button>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="bg-slate-955 border border-slate-850 p-4.5 rounded-2xl mb-5 shrink-0 select-none">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Auto-close rooms duration</span>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">{autoCloseMinutes} Minutes</span>
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min="5" max="60" step="5" value={autoCloseMinutes} onChange={e => setAutoCloseMinutes(parseInt(e.target.value))} className="flex-1 h-1 bg-slate-900 rounded-full appearance-none cursor-pointer accent-cyan-400" />
              </div>
            </div>

            <div className="border-t border-slate-850 pt-5 flex gap-3 shrink-0 select-none">
              <button onClick={() => setBreakoutStep(1)} className="px-4 py-2.5 rounded-xl border border-slate-850 hover:bg-slate-850 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-200 transition-all cursor-pointer">Back</button>
              <button onClick={() => {
                const newRooms: Record<string, string[]> = {};
                for (let i = 1; i <= roomCount; i++) {
                  newRooms[`Room ${i}`] = [];
                }
                allNames.forEach((name: string, idx: number) => {
                  const roomIdx = (idx % roomCount) + 1;
                  newRooms[`Room ${roomIdx}`].push(name);
                });
                setBreakoutRoomsData(newRooms);
              }} className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-850 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer">Auto Distribute</button>
              <button onClick={() => { setRoomsActive(!roomsActive); setShowBreakoutModal(false); }} className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent cursor-pointer shadow-lg", roomsActive ? "bg-rose-500 text-slate-955 font-black hover:bg-rose-600 shadow-rose-500/10" : "bg-cyan-500 text-slate-955 font-black hover:bg-cyan-455 shadow-cyan-550/10")}>
                {roomsActive ? 'Close All Rooms' : 'Open All Rooms'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── M E E T I N G   R O O M   I N N E R (W R A P P E R) ─────────────────────
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

  const [useLiveKitState, setUseLiveKitState] = useState<boolean | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);

  // Fetch token and detect LiveKit config status
  useEffect(() => {
    if (!meetingId || !userName) return;

    let active = true;

    async function checkLiveKit() {
      try {
        const res = await fetch(`/api/livekit?room=${meetingId}&username=${encodeURIComponent(userName)}`);
        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();
        
        if (active) {
          if (data.fallback || !data.token) {
            setUseLiveKitState(false);
          } else {
            setLivekitToken(data.token);
            setLivekitUrl(data.wsUrl);
            setUseLiveKitState(true);
          }
        }
      } catch (err) {
        console.warn('LiveKit API error, falling back to WebRTC room stream:', err);
        if (active) {
          setUseLiveKitState(false);
        }
      }
    }

    checkLiveKit();

    return () => {
      active = false;
    };
  }, [meetingId, userName]);

  if (useLiveKitState === null) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center font-outfit">
        <div className="flex flex-col items-center gap-4 animate-pulse select-none">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Securing Meeting Stage...</span>
        </div>
      </div>
    );
  }

  if (useLiveKitState && livekitToken && livekitUrl) {
    return (
      <LiveKitRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        connect={true}
        video={searchParams.get('video') === 'true'}
        audio={searchParams.get('audio') === 'true'}
      >
        <LiveKitMeetingRoomInner
          meetingId={meetingId}
          socket={socket}
          userId={userId}
          userName={userName}
          avatarUrl={avatarUrl}
          router={router}
        />
      </LiveKitRoom>
    );
  }

  // Fallback WebRTC Full-Mesh connection
  return (
    <WebRTCMeetingRoomInner
      meetingId={meetingId}
      socket={socket}
      userId={userId}
      userName={userName}
      avatarUrl={avatarUrl}
      router={router}
    />
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
