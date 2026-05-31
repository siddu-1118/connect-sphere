'use client';

import { useState, useEffect, useRef } from 'react';
import Whiteboard from '@/components/meeting/Whiteboard';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ChevronRight,
  Hash,
  Users,
  FileText,
  StickyNote,
  Bold,
  Italic,
  List,
  Paperclip,
  Smile,
  Send,
  X,
  ChevronDown,
  Zap,
  AlertCircle,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  FolderOpen,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────
interface LocalWorkspace {
  id: string;
  name: string;
  description?: string;
  channels: LocalChannel[];
}

interface LocalChannel {
  id: string;
  name: string;
  description?: string;
}

interface LocalMessage {
  id: string;
  channelId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  createdAt: string;
  priority: 'Standard' | 'Important' | 'Urgent';
}

type TabType = 'Posts' | 'Files' | 'Notes' | 'Whiteboard';

export default function WorkspacePage() {
  const { user } = useAuth();
  const router = useRouter();

  // Workspaces, channels, active selection
  const [workspaces, setWorkspaces] = useState<LocalWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({});

  // Active tab in Main Stage
  const [activeTab, setActiveTab] = useState<TabType>('Posts');

  // Message list for the active channel
  const [messages, setMessages] = useState<LocalMessage[]>([]);

  // Compose text and toolbar states
  const [messageText, setMessageText] = useState('');
  const [priority, setPriority] = useState<'Standard' | 'Important' | 'Urgent'>('Standard');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);

  // Modal dialog states
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [newChannelName, setNewChannelName] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);

  // 1. Initial hydration from localStorage (or fallback mock setups)
  useEffect(() => {
    const savedWorkspaces = localStorage.getItem('cs_workspaces');
    if (savedWorkspaces) {
      try {
        const parsed = JSON.parse(savedWorkspaces) as LocalWorkspace[];
        setWorkspaces(parsed);
        if (parsed.length > 0) {
          setActiveWorkspaceId(parsed[0].id);
          if (parsed[0].channels.length > 0) {
            setActiveChannelId(parsed[0].channels[0].id);
          }
          // Expand the first workspace by default
          setExpandedWorkspaces({ [parsed[0].id]: true });
        }
      } catch (e) {
        console.error('Failed to parse saved workspaces:', e);
      }
    }
  }, []);

  // Save workspaces to localStorage
  const saveWorkspaces = (updated: LocalWorkspace[]) => {
    setWorkspaces(updated);
    localStorage.setItem('cs_workspaces', JSON.stringify(updated));
  };

  // 2. Load messages based on active channel selection
  useEffect(() => {
    if (activeChannelId) {
      const savedMessages = localStorage.getItem(`cs_msgs_${activeChannelId}`);
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [activeChannelId]);

  // Scroll to bottom when messages load/change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close menus on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiMenu(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setShowPriorityMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Toggle workspace accordion
  const toggleWorkspace = (id: string) => {
    setExpandedWorkspaces(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    setActiveWorkspaceId(id);
  };

  // Create workspace handler
  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;

    // Create a default #general channel for the workspace
    const newWorkspace: LocalWorkspace = {
      id: `ws-${Date.now()}`,
      name: newWorkspaceName.trim(),
      description: newWorkspaceDesc.trim(),
      channels: [
        { id: `ch-${Date.now()}-general`, name: 'general', description: 'General announcements and discussion' },
        { id: `ch-${Date.now()}-frontend`, name: 'frontend-dev', description: 'Frontend engineering sync' }
      ]
    };

    const updated = [...workspaces, newWorkspace];
    saveWorkspaces(updated);

    // Set as active
    setActiveWorkspaceId(newWorkspace.id);
    setActiveChannelId(newWorkspace.channels[0].id);
    setExpandedWorkspaces(prev => ({ ...prev, [newWorkspace.id]: true }));

    // Reset fields
    setNewWorkspaceName('');
    setNewWorkspaceDesc('');
    setShowWorkspaceModal(false);
  };

  // Create channel handler
  const handleCreateChannel = () => {
    if (!newChannelName.trim() || !activeWorkspaceId) return;

    const formattedName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    const newChannel: LocalChannel = {
      id: `ch-${Date.now()}`,
      name: formattedName
    };

    const updated = workspaces.map(ws => {
      if (ws.id === activeWorkspaceId) {
        return {
          ...ws,
          channels: [...ws.channels, newChannel]
        };
      }
      return ws;
    });

    saveWorkspaces(updated);
    setActiveChannelId(newChannel.id);

    setNewChannelName('');
    setShowChannelModal(false);
  };

  // Delete workspace utility (premium detail for interactivity)
  const handleDeleteWorkspace = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = workspaces.filter(ws => ws.id !== id);
    saveWorkspaces(updated);

    if (activeWorkspaceId === id) {
      if (updated.length > 0) {
        setActiveWorkspaceId(updated[0].id);
        if (updated[0].channels.length > 0) {
          setActiveChannelId(updated[0].channels[0].id);
        }
      } else {
        setActiveWorkspaceId(null);
        setActiveChannelId(null);
      }
    }
  };

  // Rich Text helpers
  const insertFormat = (wrap: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = messageText.slice(start, end);
    const newText = messageText.slice(0, start) + wrap + selected + wrap + messageText.slice(end);
    setMessageText(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + wrap.length, end + wrap.length);
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiMenu(false);
    textareaRef.current?.focus();
  };

  // Send Message
  const handleSendMessage = () => {
    if (!messageText.trim() || !activeChannelId) return;

    const newMessage: LocalMessage = {
      id: `msg-${Date.now()}`,
      channelId: activeChannelId,
      content: messageText.trim(),
      senderId: user?.id ?? 'user-offline',
      senderName: user?.name ?? 'Explorer',
      senderAvatar: user?.avatarUrl,
      createdAt: new Date().toISOString(),
      priority
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    localStorage.setItem(`cs_msgs_${activeChannelId}`, JSON.stringify(updatedMessages));

    // Clear compose box
    setMessageText('');
    setPriority('Standard');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format message rendering with basic styling Markdown
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(\*\*.+?\*\*|\*.+?\*|`.+?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic text-slate-350">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-mono text-xs">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const getWorkspaceInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId);
  const activeChannel = activeWorkspace?.channels.find(ch => ch.id === activeChannelId);

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 font-outfit h-full select-none relative">
      
      {/* ── SECONDARY SIDEBAR: Accordion Teams/Channels List ── */}
      <aside className="w-64 shrink-0 bg-slate-905 border-r border-slate-900 flex flex-col h-full select-none hidden sm:flex">
        
        {/* Sidebar Header */}
        <div className="h-16 px-5 border-b border-slate-900 flex items-center justify-between shrink-0 select-none">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workspace Channels</h2>
          <button
            onClick={() => setShowWorkspaceModal(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 border border-transparent hover:border-slate-850 transition-all cursor-pointer"
            title="Create Workspace"
          >
            <Plus size={15} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Channels Accordion list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 select-none scrollbar-thin">
          {workspaces.length === 0 ? (
            /* Sidebar Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center select-none h-full">
              <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="mb-4 text-slate-600 opacity-40">
                <rect x="12" y="12" width="40" height="40" rx="8" fill="#1e293b" opacity="0.1" stroke="#475569" strokeWidth="1.5" />
                <path d="M12 28H52" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="24" cy="20" r="3" fill="#6366f1" />
                <circle cx="40" cy="20" r="3" fill="#06b6d4" />
                <path d="M20 44L28 36L36 44L44 36" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-xs font-bold text-slate-400">No workspaces yet</p>
              <p className="text-[10px] text-slate-600 mt-1 max-w-[170px] leading-relaxed">
                You haven't joined any workspaces yet. Create one to start collaborating.
              </p>
              <button
                onClick={() => setShowWorkspaceModal(true)}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-650 to-indigo-500 hover:from-indigo-600 hover:to-indigo-400 text-slate-100 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-indigo-500/25"
              >
                Create Workspace
              </button>
            </div>
          ) : (
            workspaces.map(ws => {
              const isExpanded = !!expandedWorkspaces[ws.id];
              const isActiveWs = activeWorkspaceId === ws.id;

              return (
                <div key={ws.id} className="space-y-0.5 select-none">
                  {/* Workspace Accordion Header */}
                  <div
                    onClick={() => toggleWorkspace(ws.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer group transition-all duration-200",
                      isActiveWs ? "bg-slate-900/60 border border-slate-850/50" : "hover:bg-slate-900/20 border border-transparent"
                    )}
                  >
                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-slate-500 group-hover:text-slate-350 transition-transform duration-200 shrink-0",
                        isExpanded && "rotate-90 text-cyan-400"
                      )}
                    />
                    
                    {/* Workspace Initials Mark */}
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-[9px] flex items-center justify-center shrink-0">
                      {getWorkspaceInitials(ws.name)}
                    </div>
                    
                    <span className="text-slate-300 text-xs font-bold truncate flex-1">{ws.name}</span>
                    
                    {/* Workspace utility options (appears on hover) */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveWorkspaceId(ws.id); setShowChannelModal(true); }}
                        className="w-5 h-5 flex items-center justify-center rounded-md text-slate-500 hover:text-cyan-450 hover:bg-slate-800 transition-colors"
                        title="Add Channel"
                      >
                        <Plus size={12} className="stroke-[2.5]" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteWorkspace(e, ws.id)}
                        className="w-5 h-5 flex items-center justify-center rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Workspace"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Accordion Channels List */}
                  {isExpanded && (
                    <div className="pl-6 space-y-0.5 mt-0.5 select-none transition-all">
                      {ws.channels.length === 0 ? (
                        <button
                          onClick={() => { setActiveWorkspaceId(ws.id); setShowChannelModal(true); }}
                          className="w-full text-left px-3 py-1.5 text-[10px] text-slate-550 hover:text-cyan-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={10} />
                          Add channel
                        </button>
                      ) : (
                        ws.channels.map(ch => {
                          const isChanActive = activeChannelId === ch.id;
                          return (
                            <div
                              key={ch.id}
                              onClick={() => { setActiveChannelId(ch.id); setActiveWorkspaceId(ws.id); }}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors relative border border-transparent select-none",
                                isChanActive 
                                  ? "bg-cyan-500/10 text-cyan-450 border-cyan-500/5 shadow-[0_0_12px_rgba(6,182,212,0.05)]" 
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/10"
                              )}
                            >
                              {isChanActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-cyan-400 rounded-full shadow-[0_0_6px_#06b6d4]" />
                              )}
                              <Hash size={13} className="shrink-0 text-slate-500" />
                              <span className="text-[11px] font-semibold truncate leading-none mt-0.5">{ch.name}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer User Detail info */}
        <div className="p-3.5 border-t border-slate-900/60 bg-slate-905 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <Avatar name={user?.name ?? 'U'} src={user?.avatarUrl} size="sm" className="border border-slate-800" />
            <div className="leading-none text-left select-none">
              <p className="text-xs font-bold text-slate-350">{user?.name?.split(' ')[0] ?? 'Aero User'}</p>
              <span className="text-[8px] font-bold tracking-wider text-indigo-400 uppercase select-none mt-0.5 block">Enterprise Plan</span>
            </div>
          </div>
        </div>

      </aside>

      {/* ── MAIN CHAT CANVAS ── */}
      <main className="flex-1 flex flex-col h-full bg-slate-950/10 overflow-hidden relative">
        {!activeChannel ? (
          /* Canvas Select Channel Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-slate-950/40 relative">
            <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-cyan-500/5 rounded-full blur-[130px] pointer-events-none" />
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border border-slate-900 flex items-center justify-center bg-slate-900/60 shadow-2xl z-10 relative ring-1 ring-white/5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500/10 to-cyan-500/10 border border-indigo-500/25 flex items-center justify-center shadow-lg text-cyan-400">
                  <Hash size={24} className="text-cyan-450 stroke-[2.5]" />
                </div>
              </div>
            </div>
            <h3 className="text-slate-200 font-bold text-base tracking-tight">Select a channel to begin</h3>
            <p className="text-slate-500 text-xs mt-2 max-w-[280px] leading-relaxed">
              Choose a workspace and channel from the sidebar accordion, or click below to create a new collaborative space.
            </p>
            {workspaces.length === 0 && (
              <button
                onClick={() => setShowWorkspaceModal(true)}
                className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-650 to-indigo-500 hover:from-indigo-600 hover:to-indigo-400 text-slate-100 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:scale-[1.02] cursor-pointer"
              >
                Create Workspace
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 1. FIXED TABBED HEADER */}
            <header className="h-16 border-b border-slate-900 bg-slate-950/30 backdrop-blur-md flex flex-col justify-end px-6 shrink-0 select-none z-20">
              <div className="flex items-center justify-between flex-1 select-none">
                <div className="flex items-center gap-2 select-none">
                  <Hash size={18} className="text-slate-400 stroke-[2.5]" />
                  <h1 className="text-sm font-black text-slate-150 uppercase tracking-wide mt-0.5">{activeChannel.name}</h1>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-[10px] font-bold tracking-wider uppercase select-none">
                  {activeWorkspace?.name}
                </div>
              </div>

              {/* Horizontal Tabs: Posts, Files, Notes, Whiteboard */}
              <div className="flex gap-6 select-none shrink-0">
                {(['Posts', 'Files', 'Notes', 'Whiteboard'] as TabType[]).map(tab => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all relative",
                        isActive 
                          ? "border-cyan-400 text-cyan-400" 
                          : "border-transparent text-slate-500 hover:text-slate-350 cursor-pointer"
                      )}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </header>

            {/* 2. SCROLLABLE CENTRAL AREA */}
            <div className={cn(
              "flex-1 relative",
              activeTab === 'Posts' ? "overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin" : "overflow-hidden"
            )}>
              {activeTab === 'Posts' ? (
                messages.length === 0 ? (
                  /* Message Feed Empty State */
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none h-full">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900/50 border border-slate-850/80 flex items-center justify-center mb-5 ring-1 ring-white/5 shadow-2xl">
                      <MessageSquare size={24} className="text-indigo-400 stroke-[2.5]" />
                    </div>
                    <h3 className="text-slate-200 font-bold text-sm tracking-tight">Welcome to #{activeChannel.name}</h3>
                    <p className="text-slate-500 text-xs mt-2 max-w-[280px] leading-relaxed">
                      Welcome to the beginning of this channel. Send a message to start the thread.
                    </p>
                  </div>
                ) : (
                  /* Chronological Message Feed */
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {messages.map(msg => {
                      const isUrgent = msg.priority === 'Urgent';
                      const isImportant = msg.priority === 'Important';

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-4 p-4 rounded-2xl transition-all select-text",
                            isUrgent 
                              ? "bg-red-500/5 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]" 
                              : isImportant 
                              ? "bg-amber-500/5 border border-amber-500/15" 
                              : "bg-slate-900/15 border border-slate-900/40 hover:bg-slate-900/20 hover:border-slate-850/40"
                          )}
                        >
                          {/* Avatar */}
                          <Avatar name={msg.senderName} src={msg.senderAvatar} size="md" className="border border-slate-800" />
                          
                          {/* Body */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-100">{msg.senderName}</span>
                              <span className="text-[9px] font-medium text-slate-650">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              
                              {/* Priority Indicator Tags */}
                              {isUrgent && (
                                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-rose-500/10 text-rose-450 border border-rose-500/20 rounded-full text-[8px] font-black uppercase tracking-wider">
                                  <Zap size={8} className="fill-rose-500" /> Urgent
                                </span>
                              )}
                              {isImportant && (
                                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-amber-500/10 text-amber-450 border border-amber-500/20 rounded-full text-[8px] font-black uppercase tracking-wider">
                                  <AlertTriangle size={8} /> Important
                                </span>
                              )}
                            </div>
                            
                            {/* Render Markdown Content */}
                            <div className="text-slate-300 text-xs leading-relaxed break-words font-outfit select-text selection:bg-cyan-500/20">
                              {renderMessageContent(msg.content)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )
              ) : activeTab === 'Whiteboard' ? (
                <div className="absolute inset-0 p-6">
                  <Whiteboard />
                </div>
              ) : (
                /* Files & Notes empty states */
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none h-full bg-slate-950/20">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900/50 border border-slate-850/80 flex items-center justify-center mb-5 ring-1 ring-white/5 shadow-2xl">
                    {activeTab === 'Files' ? <FolderOpen className="text-indigo-400 stroke-[2.5]" /> : <StickyNote className="text-indigo-400 stroke-[2.5]" />}
                  </div>
                  <h3 className="text-slate-200 font-bold text-sm tracking-tight">{activeTab === 'Files' ? 'No files uploaded' : 'No notes written'}</h3>
                  <p className="text-slate-500 text-xs mt-2 max-w-[280px] leading-relaxed">
                    Collaborate with your team by sharing {activeTab === 'Files' ? 'files and documents' : 'notes and logs'} in this channel.
                  </p>
                </div>
              )}
            </div>

            {/* 3. RICH TEXT INPUT COMPONENT (FIXED AT THE BOTTOM) */}
            {activeTab === 'Posts' && (
              <div className="px-6 pb-6 pt-2 shrink-0 select-none z-10">
                <div className="max-w-4xl w-full mx-auto">
                  <div className="bg-slate-900/30 border border-slate-900 focus-within:border-cyan-500/40 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300 shadow-2xl">
                    
                    {/* Text Compose Area */}
                    <textarea
                      ref={textareaRef}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message #${activeChannel.name}...`}
                      rows={1}
                      className="w-full bg-transparent px-5 py-4 text-xs text-slate-200 placeholder-slate-600 outline-none resize-none leading-relaxed min-h-[52px] max-h-36 font-outfit select-text"
                    />

                    {/* Toolbar Panel (Inside Compose Card) */}
                    <div className="flex items-center justify-between px-4 pb-3.5 pt-2 border-t border-slate-900/60 select-none">
                      <div className="flex items-center gap-1.5 select-none">
                        
                        {/* Formats */}
                        <button
                          onClick={() => insertFormat('**')}
                          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 cursor-pointer transition-colors border border-transparent hover:border-slate-850"
                          title="Bold (**)"
                        >
                          <Bold size={13} className="stroke-[2.5]" />
                        </button>
                        <button
                          onClick={() => insertFormat('*')}
                          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 cursor-pointer transition-colors border border-transparent hover:border-slate-850"
                          title="Italic (*)"
                        >
                          <Italic size={13} className="stroke-[2.5]" />
                        </button>
                        <button
                          onClick={() => insertFormat('`')}
                          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 cursor-pointer transition-colors border border-transparent hover:border-slate-850"
                          title="Code inline (`)"
                        >
                          <Hash size={13} />
                        </button>
                        
                        <div className="h-4 w-[1px] bg-slate-900 mx-1" />

                        {/* Attachments */}
                        <button
                          onClick={() => alert("Simulated: File Attachment trigger.")}
                          className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-900 cursor-pointer transition-colors border border-transparent hover:border-slate-850"
                          title="Attach File"
                        >
                          <Paperclip size={13} />
                        </button>

                        {/* Emoji Popover */}
                        <div className="relative" ref={emojiRef}>
                          <button
                            onClick={() => setShowEmojiMenu(!showEmojiMenu)}
                            className={cn(
                              "p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-900 cursor-pointer transition-all border border-transparent hover:border-slate-850",
                              showEmojiMenu && "text-cyan-400 bg-slate-900 border-slate-850"
                            )}
                            title="Insert Emoji"
                          >
                            <Smile size={13} />
                          </button>
                          {showEmojiMenu && (
                            <div className="absolute bottom-10 left-0 bg-slate-900 border border-slate-850 rounded-xl shadow-2xl p-2 z-50 flex gap-1.5 animate-fadeIn">
                              {['👍', '❤️', '😂', '😮', '🔥', '🎉', '🚀'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => insertEmoji(emoji)}
                                  className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-sm cursor-pointer hover:scale-110 active:scale-95 transition-all"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Priority Tag Selector */}
                        <div className="relative" ref={priorityRef}>
                          <button
                            onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border",
                              priority === 'Urgent' 
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                                : priority === 'Important' 
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                                : "bg-slate-900/60 border-slate-850 text-slate-450 hover:text-slate-350 hover:bg-slate-900"
                            )}
                          >
                            <Zap size={11} className={cn(priority === 'Urgent' && "fill-rose-455")} />
                            {priority}
                            <ChevronDown size={10} className="text-slate-500" />
                          </button>
                          {showPriorityMenu && (
                            <div className="absolute bottom-10 left-0 bg-slate-900 border border-slate-850 rounded-xl shadow-2xl p-1.5 z-50 w-32 flex flex-col gap-0.5 animate-fadeIn">
                              {(['Standard', 'Important', 'Urgent'] as const).map(p => (
                                <button
                                  key={p}
                                  onClick={() => { setPriority(p); setShowPriorityMenu(false); }}
                                  className={cn(
                                    "w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-800 transition-colors",
                                    p === 'Urgent' ? "text-rose-400 hover:bg-rose-500/10" : p === 'Important' ? "text-amber-400 hover:bg-amber-500/10" : "text-slate-300"
                                  )}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Send Button */}
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim()}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                          messageText.trim()
                            ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-[1.02] active:scale-[0.98]"
                            : "bg-slate-900 text-slate-650 cursor-not-allowed border border-slate-850/50"
                        )}
                      >
                        <Send size={11} className={cn("stroke-[2.5]", messageText.trim() ? "text-slate-950" : "text-slate-650")} />
                        Send
                      </button>

                    </div>

                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── DIALOG MODALS ── */}

      {/* 1. Create Workspace Modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn select-none">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            
            <button 
              onClick={() => { setShowWorkspaceModal(false); setNewWorkspaceName(''); setNewWorkspaceDesc(''); }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-850 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest mb-5 flex items-center gap-2 select-none">
              <Users className="w-4 h-4 text-cyan-400" />
              Create Workspace
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Workspace Name</label>
                <input
                  value={newWorkspaceName}
                  onChange={e => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g., Engineering, Design Core"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-cyan-500/50 transition-all font-outfit"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Description</label>
                <input
                  value={newWorkspaceDesc}
                  onChange={e => setNewWorkspaceDesc(e.target.value)}
                  placeholder="Workspace focus areas (optional)..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-cyan-500/50 transition-all font-outfit"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 select-none">
              <button 
                onClick={() => { setShowWorkspaceModal(false); setNewWorkspaceName(''); setNewWorkspaceDesc(''); }} 
                className="flex-1 py-2.5 rounded-xl border border-slate-850 hover:bg-slate-850 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-300 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold uppercase tracking-wider text-slate-950 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)] border border-cyan-400/20 font-bold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Channel Modal */}
      {showChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn select-none">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            
            <button 
              onClick={() => { setShowChannelModal(false); setNewChannelName(''); }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-850 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest mb-5 flex items-center gap-2 select-none">
              <Hash className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
              Create Channel
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Channel Name</label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 focus-within:border-cyan-500/50 transition-all select-none">
                  <Hash size={14} className="text-slate-500 shrink-0" />
                  <input
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    placeholder="general, dev-sync"
                    className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-700 outline-none font-outfit"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 select-none">
              <button 
                onClick={() => { setShowChannelModal(false); setNewChannelName(''); }} 
                className="flex-1 py-2.5 rounded-xl border border-slate-850 hover:bg-slate-850 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-300 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold uppercase tracking-wider text-slate-950 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)] border border-cyan-400/20 font-bold"
              >
                Add Channel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
