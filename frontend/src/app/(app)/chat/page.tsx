'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Hash,
  Users,
  Search,
  PenSquare,
  Phone,
  Video,
  Send,
  Paperclip,
  Smile,
  Bold,
  Italic,
  X,
  ChevronDown,
  Zap,
  AlertTriangle,
  MessageSquare,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

// ─── Types ───────────────────────────────────────────────────────────────────
interface LocalConversation {
  userId: string;
  name: string;
  avatarUrl: string | null;
  presence: 'online' | 'away' | 'offline' | 'busy' | 'dnd';
  lastMessage?: string | null;
  lastMessageAt?: string | null;
}

interface LocalDMMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  receiverId: string;
  content: string;
  createdAt: string;
  priority: 'Standard' | 'Important' | 'Urgent';
}

// Synthetic Directory contacts (to start conversations with)
const SYNTHETIC_CONTACTS = [
  { id: 'usr-sophia', name: 'Sophia Vance', email: 'sophia.v@aeromeet.live', presence: 'online' as const, avatar: null },
  { id: 'usr-marcus', name: 'Marcus Chen', email: 'marcus.c@aeromeet.live', presence: 'away' as const, avatar: null },
  { id: 'usr-elena', name: 'Elena Rostova', email: 'elena.r@aeromeet.live', presence: 'offline' as const, avatar: null },
  { id: 'usr-devon', name: 'Devon Harris', email: 'devon.h@aeromeet.live', presence: 'online' as const, avatar: null },
];

interface DirectoryContact {
  id: string;
  name: string;
  email: string;
  presence: 'online' | 'away' | 'offline' | 'busy' | 'dnd';
  avatar: string | null;
}

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Chats states
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<DirectoryContact[]>(SYNTHETIC_CONTACTS);

  // Load real contacts from Database
  useEffect(() => {
    async function loadContacts() {
      try {
        const { data: dbUsers, error } = await supabase
          .from('users')
          .select('id, display_name, email, avatar_url, status');
        
        if (error) throw error;
        
        if (dbUsers && dbUsers.length > 0) {
          const mapped: DirectoryContact[] = dbUsers
            .filter(u => u.id !== user?.id) // exclude current user
            .map(u => ({
              id: u.id,
              name: u.display_name || u.email.split('@')[0] || 'Unknown User',
              email: u.email,
              presence: (u.status || 'online') as any,
              avatar: u.avatar_url || null
            }));
          setContacts(mapped);
        } else {
          setContacts(SYNTHETIC_CONTACTS);
        }
      } catch (err) {
        console.warn('Failed to fetch real users, falling back to mock contacts:', err);
        setContacts(SYNTHETIC_CONTACTS);
      }
    }
    if (user) {
      loadContacts();
    }
  }, [user]);

  // Messages in active chat
  const [messages, setMessages] = useState<LocalDMMessage[]>([]);

  // Compose inputs
  const [draftText, setDraftText] = useState('');
  const [priority, setPriority] = useState<'Standard' | 'Important' | 'Urgent'>('Standard');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);

  // Modals & triggers
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);

  // 1. Initial hydration from localStorage
  useEffect(() => {
    const savedConvos = localStorage.getItem('cs_dm_conversations');
    if (savedConvos) {
      try {
        const parsed = JSON.parse(savedConvos) as LocalConversation[];
        setConversations(parsed);
        if (parsed.length > 0) {
          setActiveUserId(parsed[0].userId);
        }
      } catch (e) {
        console.error('Failed to parse conversations:', e);
      }
    }
  }, []);

  // Save conversations utility
  const saveConversations = (updated: LocalConversation[]) => {
    setConversations(updated);
    localStorage.setItem('cs_dm_conversations', JSON.stringify(updated));
  };

  // 2. Load messages based on active user selection
  useEffect(() => {
    if (activeUserId) {
      const savedMessages = localStorage.getItem(`cs_dm_msgs_${activeUserId}`);
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
  }, [activeUserId]);

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

  // Start new DM conversation
  const handleStartDM = (contact: DirectoryContact) => {
    const exists = conversations.some(c => c.userId === contact.id);
    
    if (!exists) {
      const newConvo: LocalConversation = {
        userId: contact.id,
        name: contact.name,
        avatarUrl: contact.avatar,
        presence: contact.presence,
        lastMessage: null,
        lastMessageAt: null
      };
      const updated = [newConvo, ...conversations];
      saveConversations(updated);
    }
    
    setActiveUserId(contact.id);
    setShowNewChatModal(false);
    setContactSearch('');
  };

  // Send message
  const handleSendMessage = () => {
    if (!draftText.trim() || !activeUserId) return;

    const newMessage: LocalDMMessage = {
      id: `dm-${Date.now()}`,
      senderId: user?.id ?? 'user-offline',
      senderName: user?.name ?? 'You',
      senderAvatar: user?.avatarUrl,
      receiverId: activeUserId,
      content: draftText.trim(),
      createdAt: new Date().toISOString(),
      priority
    };

    // 1. Update messages list
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    localStorage.setItem(`cs_dm_msgs_${activeUserId}`, JSON.stringify(updatedMessages));

    // 2. Update conversation last message preview
    const updatedConvos = conversations.map(c => {
      if (c.userId === activeUserId) {
        return {
          ...c,
          lastMessage: draftText.trim(),
          lastMessageAt: new Date().toISOString()
        };
      }
      return c;
    });
    saveConversations(updatedConvos);

    // Reset compose
    setDraftText('');
    setPriority('Standard');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // formatting helper
  const insertFormat = (wrap: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = draftText.slice(start, end);
    const newText = draftText.slice(0, start) + wrap + selected + wrap + draftText.slice(end);
    setDraftText(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + wrap.length, end + wrap.length);
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    setDraftText(prev => prev + emoji);
    setShowEmojiMenu(false);
    textareaRef.current?.focus();
  };

  // Format message rendering with markdown-like styling
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

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const activeConvo = conversations.find(c => c.userId === activeUserId);

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 font-outfit h-full select-none relative">
      
      {/* ── SECONDARY NAVIGATION SIDEBAR: Direct Message Threads ── */}
      <aside className="w-64 shrink-0 bg-slate-905 border-r border-slate-900 flex flex-col h-full select-none hidden sm:flex">
        
        {/* Header */}
        <div className="h-16 px-5 border-b border-slate-900 flex items-center justify-between shrink-0 select-none">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct Messages</h2>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 border border-transparent hover:border-slate-850 transition-all cursor-pointer"
            title="New Chat"
          >
            <PenSquare size={15} />
          </button>
        </div>

        {/* Search Conversation Filter */}
        <div className="px-4 py-3 border-b border-slate-900/40 select-none">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 focus-within:border-cyan-500/50 transition-colors">
            <Search size={13} className="text-slate-500 shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-700 outline-none font-outfit"
            />
          </div>
        </div>

        {/* DM Threads List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-0.5 select-none scrollbar-thin">
          {filteredConversations.length === 0 ? (
            /* Sidebar Empty State */
            <div className="flex flex-col items-center justify-center py-20 px-3 text-center select-none h-full">
              <MessageSquare size={36} className="text-slate-650 mb-4 opacity-40" />
              <p className="text-xs font-bold text-slate-450">No chats yet</p>
              <p className="text-[10px] text-slate-600 mt-1.5 max-w-[170px] leading-relaxed">
                No direct messages yet. Start a chat with a teammate.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              >
                Start Chat
              </button>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = activeUserId === conv.userId;
              const hasLastMsg = !!conv.lastMessage;

              return (
                <button
                  key={conv.userId}
                  onClick={() => setActiveUserId(conv.userId)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-left relative border border-transparent select-none",
                    isActive 
                      ? "bg-cyan-500/10 text-cyan-455 border-cyan-500/5 shadow-[0_0_12px_rgba(6,182,212,0.05)]" 
                      : "hover:bg-slate-900/20 text-slate-400 hover:text-slate-300"
                  )}
                >
                  {/* Left Active highlight bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4.5 bg-cyan-455 rounded-full shadow-[0_0_6px_#06b6d4]" />
                  )}

                  {/* Avatar with Status Dot */}
                  <div className="relative shrink-0 select-none">
                    <Avatar name={conv.name} src={conv.avatarUrl} size="sm" className="border border-slate-900" />
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-905 ring-1 ring-slate-950",
                      conv.presence === 'online' ? "bg-emerald-500" : conv.presence === 'away' ? "bg-amber-500" : "bg-slate-500"
                    )} />
                  </div>

                  {/* Text details */}
                  <div className="flex-1 min-w-0 select-none">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold truncate block", isActive ? "text-cyan-455" : "text-slate-300")}>{conv.name}</span>
                      {conv.lastMessageAt && (
                        <span className="text-[8px] text-slate-600 shrink-0 font-medium ml-1">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-550 truncate mt-0.5 font-medium leading-none">
                      {hasLastMsg ? conv.lastMessage : "Click to chat"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* User Details Footer */}
        <div className="p-3.5 border-t border-slate-900/60 bg-slate-905 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <Avatar name={user?.name ?? 'U'} src={user?.avatarUrl} size="sm" className="border border-slate-800" />
            <div className="leading-none text-left select-none">
              <p className="text-xs font-bold text-slate-350">{user?.name?.split(' ')[0] ?? 'Aero User'}</p>
              <span className="text-[8px] font-bold tracking-wider text-cyan-450 uppercase mt-0.5 block select-none">Chat Active</span>
            </div>
          </div>
        </div>

      </aside>

      {/* ── MAIN CHAT CANVAS ── */}
      <main className="flex-1 flex flex-col h-full bg-slate-950/10 overflow-hidden relative">
        {!activeConvo ? (
          /* Select Direct Conversation Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-slate-950/40 relative">
            <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-cyan-500/5 rounded-full blur-[130px] pointer-events-none" />
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border border-slate-900 flex items-center justify-center bg-slate-900/60 shadow-2xl z-10 relative ring-1 ring-white/5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500/10 to-cyan-500/10 border border-indigo-500/25 flex items-center justify-center shadow-lg text-cyan-450">
                  <MessageSquare size={22} className="text-cyan-450 stroke-[2.5]" />
                </div>
              </div>
            </div>
            <h3 className="text-slate-200 font-bold text-base tracking-tight">Select a conversation</h3>
            <p className="text-slate-500 text-xs mt-2 max-w-[280px] leading-relaxed">
              Select an active chat session from the list, or launch a direct messaging channel with your team contacts below.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:scale-[1.02] cursor-pointer"
            >
              Start Conversation
            </button>
          </div>
        ) : (
          <>
            {/* DM Header */}
            <header className="h-16 border-b border-slate-900 bg-slate-950/30 backdrop-blur-md flex items-center justify-between px-6 shrink-0 select-none z-20">
              <div className="flex items-center gap-3 select-none">
                <div className="relative select-none shrink-0">
                  <Avatar name={activeConvo.name} src={activeConvo.avatarUrl} size="sm" className="border border-slate-900" />
                  <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ring-1 ring-slate-950",
                    activeConvo.presence === 'online' ? "bg-emerald-500" : activeConvo.presence === 'away' ? "bg-amber-500" : "bg-slate-500"
                  )} />
                </div>
                <div className="leading-none text-left select-none">
                  <h1 className="text-xs font-bold text-slate-150 tracking-wide mt-0.5">{activeConvo.name}</h1>
                  <span className={cn("text-[9px] font-semibold tracking-wider capitalize select-none mt-1 block", 
                    activeConvo.presence === 'online' ? "text-emerald-450" : activeConvo.presence === 'away' ? "text-amber-450" : "text-slate-500"
                  )}>
                    {activeConvo.presence} status
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 select-none">
                <button 
                  onClick={() => alert(`Initiating audio link with ${activeConvo.name} (Simulation Only).`)}
                  className="p-2 rounded-xl text-slate-400 hover:text-cyan-455 hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-850 cursor-pointer"
                >
                  <Phone size={15} />
                </button>
                <button 
                  onClick={() => alert(`Initiating video link with ${activeConvo.name} (Simulation Only).`)}
                  className="p-2 rounded-xl text-slate-400 hover:text-cyan-455 hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-850 cursor-pointer"
                >
                  <Video size={15} />
                </button>
              </div>
            </header>

            {/* DM Messages Feed */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin">
              {messages.length === 0 ? (
                /* DM Empty Feed State */
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center select-none h-full">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900/50 border border-slate-850/85 flex items-center justify-center mb-5 ring-1 ring-white/5 shadow-2xl">
                    <MessageSquare size={22} className="text-cyan-450 stroke-[2.5]" />
                  </div>
                  <h3 className="text-slate-200 font-bold text-sm tracking-tight">Direct Message Thread</h3>
                  <p className="text-slate-500 text-xs mt-2 max-w-[280px] leading-relaxed">
                    Welcome to the beginning of your chat history. Send a message to start the thread.
                  </p>
                </div>
              ) : (
                /* Chronological Message Display */
                <div className="space-y-4 max-w-4xl mx-auto">
                  {messages.map(msg => {
                    const isUrgent = msg.priority === 'Urgent';
                    const isImportant = msg.priority === 'Important';
                    const isSenderUser = msg.senderId === user?.id || msg.senderId === 'user-offline';

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-4 p-4 rounded-2xl transition-all select-text",
                          isSenderUser 
                            ? "bg-slate-900/20 border border-slate-900/60 ml-12" 
                            : isUrgent 
                            ? "bg-red-500/5 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)] mr-12" 
                            : isImportant 
                            ? "bg-amber-500/5 border border-amber-500/15 mr-12" 
                            : "bg-slate-900/10 border border-slate-900/20 mr-12 hover:bg-slate-900/15 hover:border-slate-850/20"
                        )}
                      >
                        {/* Avatar */}
                        <Avatar name={msg.senderName} src={msg.senderAvatar} size="md" className="border border-slate-800 shrink-0" />
                        
                        {/* Body */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-100">{msg.senderName}</span>
                            <span className="text-[9px] font-medium text-slate-650">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            
                            {/* Priority Indicators */}
                            {isUrgent && (
                              <span className="flex items-center gap-0.5 px-2 py-0.5 bg-rose-500/10 text-rose-455 border border-rose-500/20 rounded-full text-[8px] font-black uppercase tracking-wider">
                                <Zap size={8} className="fill-rose-500" /> Urgent
                              </span>
                            )}
                            {isImportant && (
                              <span className="flex items-center gap-0.5 px-2 py-0.5 bg-amber-500/10 text-amber-455 border border-amber-500/20 rounded-full text-[8px] font-black uppercase tracking-wider">
                                <AlertTriangle size={8} /> Important
                              </span>
                            )}
                          </div>
                          
                          {/* Markdown parsing */}
                          <div className="text-slate-350 text-xs leading-relaxed break-words font-outfit select-text selection:bg-cyan-500/20">
                            {renderMessageContent(msg.content)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Custom Rich Text Compose area */}
            <div className="px-6 pb-6 pt-2 shrink-0 select-none z-10">
              <div className="max-w-4xl w-full mx-auto">
                <div className="bg-slate-900/30 border border-slate-900 focus-within:border-cyan-500/40 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300 shadow-2xl">
                  
                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeConvo.name}...`}
                    rows={1}
                    className="w-full bg-transparent px-5 py-4 text-xs text-slate-200 placeholder-slate-650 outline-none resize-none leading-relaxed min-h-[52px] max-h-36 font-outfit select-text"
                  />

                  {/* Toolbar Panel */}
                  <div className="flex items-center justify-between px-4 pb-3.5 pt-2 border-t border-slate-900/60 select-none">
                    <div className="flex items-center gap-1.5 select-none">
                      
                      {/* Bold / Italic / Code */}
                      <button
                        onClick={() => insertFormat('**')}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-350 hover:bg-slate-900 cursor-pointer transition-colors border border-transparent hover:border-slate-850"
                        title="Bold"
                      >
                        <Bold size={13} className="stroke-[2.5]" />
                      </button>
                      <button
                        onClick={() => insertFormat('*')}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-350 hover:bg-slate-900 cursor-pointer transition-colors border border-transparent hover:border-slate-850"
                        title="Italic"
                      >
                        <Italic size={13} className="stroke-[2.5]" />
                      </button>
                      <button
                        onClick={() => insertFormat('`')}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-350 hover:bg-slate-900 cursor-pointer transition-colors border border-transparent hover:border-slate-850"
                        title="Code inline"
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

                      {/* Priority Tag dropdown */}
                      <div className="relative" ref={priorityRef}>
                        <button
                          onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border",
                            priority === 'Urgent' 
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-455" 
                              : priority === 'Important' 
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-455" 
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
                      disabled={!draftText.trim()}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                        draftText.trim()
                          ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-[1.02] active:scale-[0.98]"
                          : "bg-slate-900 text-slate-655 cursor-not-allowed border border-slate-850/50"
                      )}
                    >
                      <Send size={11} className={cn("stroke-[2.5]", draftText.trim() ? "text-slate-950" : "text-slate-655")} />
                      Send
                    </button>

                  </div>

                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── CONTACT SELECTOR DIALOG MODAL ── */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn select-none">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl w-[380px] max-h-[500px] flex flex-col shadow-2xl relative">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-900 shrink-0">
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">Start Message</span>
              <button
                onClick={() => { setShowNewChatModal(false); setContactSearch(''); }}
                className="text-slate-500 hover:text-slate-300 hover:bg-slate-850 rounded-lg p-1 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Filter Search */}
            <div className="px-4 py-3 border-b border-slate-900/60 shrink-0 select-none">
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2">
                <Search size={14} className="text-slate-500 shrink-0" />
                <input
                  autoFocus
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="Search team contacts..."
                  className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-700 outline-none font-outfit"
                />
              </div>
            </div>

            {/* Contacts list directories */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin select-none">
              {filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <Search size={24} className="text-slate-700 mb-3" />
                  <p className="text-xs text-slate-500">No teammates found</p>
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => handleStartDM(contact)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-900/60 hover:border-slate-850/50 border border-transparent transition-all cursor-pointer text-left select-none mb-0.5"
                  >
                    <div className="relative shrink-0 select-none">
                      <Avatar name={contact.name} src={contact.avatar} size="sm" className="border border-slate-950" />
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900",
                        contact.presence === 'online' ? "bg-emerald-500" : contact.presence === 'away' ? "bg-amber-500" : "bg-slate-500"
                      )} />
                    </div>
                    <div className="flex flex-col min-w-0 select-none leading-none">
                      <span className="text-xs font-bold text-slate-200 truncate">{contact.name}</span>
                      <span className="text-[9px] font-semibold text-slate-550 truncate mt-1">{contact.email}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
