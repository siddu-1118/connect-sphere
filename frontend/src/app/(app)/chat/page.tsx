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
  LogOut,
  Image,
  Film,
  FileText,
  FileArchive,
  FileAudio,
  File,
  Download
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
  attachments?: { name: string; url: string; size?: number; type?: string; path: string }[];
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const FileCard = ({ file }: { file: any }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('workspace_files')
        .createSignedUrl(file.path, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to generate download URL:', err);
      alert('Could not download file.');
    } finally {
      setDownloading(false);
    }
  };

  const getIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('image/')) return <Image className="w-5 h-5 text-sky-500" />;
    if (t.includes('video/')) return <Film className="w-5 h-5 text-indigo-500" />;
    if (t.includes('audio/')) return <FileAudio className="w-5 h-5 text-violet-500" />;
    if (t.includes('pdf') || t.includes('word') || t.includes('document')) return <FileText className="w-5 h-5 text-emerald-500" />;
    if (t.includes('zip') || t.includes('rar') || t.includes('tar') || t.includes('archive')) return <FileArchive className="w-5 h-5 text-amber-500" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 flex items-center justify-between gap-4 max-w-sm w-full transition-all shadow-sm group mt-1">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
          {getIcon(file.type)}
        </div>
        <div className="min-w-0 text-left">
          <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-650 transition-colors" title={file.name}>
            {file.name}
          </p>
          <p className="text-[10px] text-slate-450 font-semibold mt-0.5 uppercase tracking-wider">
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="p-2 bg-slate-55 border border-slate-200 hover:border-indigo-500/30 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px]"
        title="Download file"
      >
        {downloading ? (
          <span className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin block" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

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
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; url: string; size?: number; type?: string; path: string }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
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
    if ((!draftText.trim() && attachedFiles.length === 0) || !activeUserId) return;

    const newMessage: LocalDMMessage = {
      id: `dm-${Date.now()}`,
      senderId: user?.id ?? 'user-offline',
      senderName: user?.name ?? 'You',
      senderAvatar: user?.avatarUrl,
      receiverId: activeUserId,
      content: draftText.trim() || `Sent ${attachedFiles.length} file(s)`,
      createdAt: new Date().toISOString(),
      priority,
      attachments: attachedFiles
    };

    // 1. Update messages list
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    localStorage.setItem(`cs_dm_msgs_${activeUserId}`, JSON.stringify(updatedMessages));

    // 2. Update conversation last message preview
    const previewText = draftText.trim() || (attachedFiles.length > 0 ? `📎 ${attachedFiles[0].name}` : 'File attachment');
    const updatedConvos = conversations.map(c => {
      if (c.userId === activeUserId) {
        return {
          ...c,
          lastMessage: previewText,
          lastMessageAt: new Date().toISOString()
        };
      }
      return c;
    });
    saveConversations(updatedConvos);

    // Reset compose
    setDraftText('');
    setAttachedFiles([]);
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
        return <strong key={index} className="font-bold text-slate-855">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic text-slate-500">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-indigo-600 font-mono text-xs">{part.slice(1, -1)}</code>;
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
    <div className="flex-1 flex overflow-hidden bg-[#F8FAFC] font-outfit h-full select-none relative">
      
      {/* ── SECONDARY NAVIGATION SIDEBAR: Direct Message Threads ── */}
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full select-none hidden sm:flex text-slate-655">
        
        {/* Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct Messages</h2>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-650 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
            title="New Chat"
          >
            <PenSquare size={15} />
          </button>
        </div>

        {/* Search Conversation Filter */}
        <div className="px-4 py-3 border-b border-slate-100 select-none">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:bg-white focus-within:border-indigo-500/50 transition-all">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none font-outfit"
            />
          </div>
        </div>

        {/* DM Threads List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-0.5 select-none scrollbar-thin">
          {filteredConversations.length === 0 ? (
            /* Sidebar Empty State */
            <div className="flex flex-col items-center justify-center py-20 px-3 text-center select-none h-full">
              <MessageSquare size={36} className="text-slate-300 mb-4 opacity-70" />
              <p className="text-xs font-bold text-slate-705">No chats yet</p>
              <p className="text-[10px] text-slate-450 mt-1.5 max-w-[170px] leading-relaxed">
                No direct messages yet. Start a chat with a teammate.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
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
                      ? "bg-indigo-50 text-indigo-650 border-indigo-100 shadow-sm" 
                      : "hover:bg-slate-50 text-slate-500 hover:text-slate-800"
                  )}
                >
                  {/* Left Active highlight bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4.5 bg-indigo-600 rounded-full" />
                  )}

                  {/* Avatar with Status Dot */}
                  <div className="relative shrink-0 select-none">
                    <Avatar name={conv.name} src={conv.avatarUrl} size="sm" className="border border-slate-100" />
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-1 ring-slate-100",
                      conv.presence === 'online' ? "bg-emerald-500" : conv.presence === 'away' ? "bg-amber-500" : "bg-slate-400"
                    )} />
                  </div>

                  {/* Text details */}
                  <div className="flex-1 min-w-0 select-none">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold truncate block", isActive ? "text-indigo-650" : "text-slate-700")}>{conv.name}</span>
                      {conv.lastMessageAt && (
                        <span className="text-[8px] text-slate-400 shrink-0 font-medium ml-1">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium leading-none">
                      {hasLastMsg ? conv.lastMessage : "Click to chat"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* User Details Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <Avatar name={user?.name ?? 'U'} src={user?.avatarUrl} size="sm" className="border border-slate-200" />
            <div className="leading-none text-left select-none">
              <p className="text-xs font-bold text-slate-700">{user?.name?.split(' ')[0] ?? 'Aero User'}</p>
              <span className="text-[8px] font-bold tracking-wider text-indigo-600 uppercase mt-0.5 block select-none">Chat Active</span>
            </div>
          </div>
        </div>

      </aside>

      {/* ── MAIN CHAT CANVAS ── */}
      <main className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-hidden relative">
        {!activeConvo ? (
          /* Select Direct Conversation Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-[#F8FAFC] relative">
            <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-indigo-500/2 rounded-full blur-[130px] pointer-events-none" />
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 shadow-sm z-10 relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500/10 to-indigo-500/20 border border-indigo-500/25 flex items-center justify-center shadow-sm text-indigo-605">
                  <MessageSquare size={22} className="text-indigo-600 stroke-[2.5]" />
                </div>
              </div>
            </div>
            <h3 className="text-slate-800 font-bold text-base tracking-tight">Select a conversation</h3>
            <p className="text-slate-500 text-xs mt-2 max-w-[280px] leading-relaxed">
              Select an active chat session from the list, or launch a direct messaging channel with your team contacts below.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer border-0"
            >
              Start Conversation
            </button>
          </div>
        ) : (
          <>
            {/* DM Header */}
            <header className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-6 shrink-0 select-none z-20 shadow-sm">
              <div className="flex items-center gap-3 select-none">
                <div className="relative select-none shrink-0">
                  <Avatar name={activeConvo.name} src={activeConvo.avatarUrl} size="sm" className="border border-slate-200" />
                  <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-1 ring-slate-105",
                    activeConvo.presence === 'online' ? "bg-emerald-500" : activeConvo.presence === 'away' ? "bg-amber-500" : "bg-slate-400"
                  )} />
                </div>
                <div className="leading-none text-left select-none">
                  <h1 className="text-xs font-bold text-slate-800 tracking-wide mt-0.5">{activeConvo.name}</h1>
                  <span className={cn("text-[9px] font-semibold tracking-wider capitalize select-none mt-1 block", 
                    activeConvo.presence === 'online' ? "text-emerald-600" : activeConvo.presence === 'away' ? "text-amber-600" : "text-slate-400"
                  )}>
                    {activeConvo.presence} status
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 select-none">
                <button 
                  onClick={() => alert(`Initiating audio link with ${activeConvo.name} (Simulation Only).`)}
                  className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                >
                  <Phone size={15} />
                </button>
                <button 
                  onClick={() => alert(`Initiating video link with ${activeConvo.name} (Simulation Only).`)}
                  className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
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
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-5 shadow-sm">
                    <MessageSquare size={22} className="text-indigo-605 stroke-[2.5]" />
                  </div>
                  <h3 className="text-slate-705 font-bold text-sm tracking-tight">Direct Message Thread</h3>
                  <p className="text-slate-450 text-xs mt-2 max-w-[280px] leading-relaxed">
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
                            ? "bg-indigo-50/40 border border-indigo-100 ml-12 text-slate-700" 
                            : isUrgent 
                            ? "bg-red-50/40 border border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.05)] mr-12 text-slate-700" 
                            : isImportant 
                            ? "bg-amber-50/40 border border-amber-200 mr-12 text-slate-700" 
                            : "bg-white border border-slate-100 mr-12 shadow-sm hover:border-slate-200 text-slate-750"
                        )}
                      >
                        {/* Avatar */}
                        <Avatar name={msg.senderName} src={msg.senderAvatar} size="md" className="border border-slate-200 shrink-0" />
                        
                        {/* Body */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800">{msg.senderName}</span>
                            <span className="text-[9px] font-medium text-slate-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            
                            {/* Priority Indicators */}
                            {isUrgent && (
                              <span className="flex items-center gap-0.5 px-2 py-0.5 bg-rose-500/10 text-rose-650 border border-rose-500/20 rounded-full text-[8px] font-black uppercase tracking-wider">
                                <Zap size={8} className="fill-rose-500" /> Urgent
                              </span>
                            )}
                            {isImportant && (
                              <span className="flex items-center gap-0.5 px-2 py-0.5 bg-amber-500/10 text-amber-655 border border-amber-500/20 rounded-full text-[8px] font-black uppercase tracking-wider">
                                <AlertTriangle size={8} /> Important
                              </span>
                            )}
                          </div>
                          
                          {/* Markdown parsing */}
                          <div className="text-slate-600 text-xs leading-relaxed break-words font-outfit select-text selection:bg-indigo-500/10 text-left">
                            {renderMessageContent(msg.content)}
                          </div>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2.5 space-y-2 select-none">
                              {msg.attachments.map((file, idx) => (
                                <FileCard key={idx} file={file} />
                              ))}
                            </div>
                          )}
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
                <div className="bg-white border border-slate-205 focus-within:border-indigo-500 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm">
                  
                  {/* Hidden file input */}
                  <input
                    type="file"
                    multiple
                    id="dm-file-input"
                    className="hidden"
                    onChange={async (e) => {
                      if (!e.target.files || !activeUserId) return;
                      setUploadingFile(true);
                      const uploaded = [...attachedFiles];
                      for (const file of Array.from(e.target.files)) {
                        try {
                          const filePath = `dms/${user?.id || 'anonymous'}/${activeUserId}/${Date.now()}-${file.name}`;
                          const { data, error } = await supabase.storage
                            .from('workspace_files')
                            .upload(filePath, file);
                          if (error) throw error;
                          const { data: { publicUrl } } = supabase.storage
                            .from('workspace_files')
                            .getPublicUrl(filePath);
                          uploaded.push({
                            name: file.name,
                            url: publicUrl,
                            size: file.size,
                            type: file.type || 'application/octet-stream',
                            path: filePath
                          });
                        } catch (err) {
                          console.error('DM File upload failed:', err);
                        }
                      }
                      setAttachedFiles(uploaded);
                      setUploadingFile(false);
                    }}
                  />

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeConvo.name}...`}
                    rows={1}
                    className="w-full bg-transparent px-5 py-4 text-xs text-slate-700 placeholder-slate-400 outline-none resize-none leading-relaxed min-h-[52px] max-h-36 font-outfit select-text"
                  />

                  {/* Uploading Status */}
                  {uploadingFile && (
                    <div className="flex items-center gap-2 px-5 py-2.5 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider text-left">
                      <div className="w-3.5 h-3.5 border-2 border-t-indigo-650 border-slate-200 rounded-full animate-spin" />
                      <span>Uploading files...</span>
                    </div>
                  )}

                  {/* Attached Files Preview */}
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-5 py-2.5 border-t border-slate-100 select-text">
                      {attachedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] text-slate-600 gap-2 shrink-0 select-text">
                          <span className="truncate max-w-[120px] select-text">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="w-11 h-11 flex items-center justify-center text-rose-600 hover:text-rose-500 cursor-pointer transition-colors"
                            title="Remove file"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Toolbar Panel */}
                  <div className="flex items-center justify-between px-4 pb-3.5 pt-2 border-t border-slate-100 bg-slate-50/50 select-none">
                    <div className="flex items-center gap-1.5 select-none">
                      
                      {/* Bold / Italic / Code */}
                      <button
                        onClick={() => insertFormat('**')}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-750 hover:bg-slate-100 cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                        title="Bold"
                      >
                        <Bold size={13} className="stroke-[2.5]" />
                      </button>
                      <button
                        onClick={() => insertFormat('*')}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-750 hover:bg-slate-100 cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                        title="Italic"
                      >
                        <Italic size={13} className="stroke-[2.5]" />
                      </button>
                      <button
                        onClick={() => insertFormat('`')}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-750 hover:bg-slate-100 cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                        title="Code inline"
                      >
                        <Hash size={13} />
                      </button>
                      
                      <div className="h-4 w-[1px] bg-slate-200 mx-1" />

                      {/* Attachments */}
                      <label
                        htmlFor="dm-file-input"
                        className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer transition-colors border border-transparent hover:border-slate-200 flex items-center justify-center min-w-[44px] min-h-[44px]"
                        title="Attach File"
                      >
                        <Paperclip size={13} />
                      </label>

                      {/* Emoji Popover */}
                      <div className="relative" ref={emojiRef}>
                        <button
                          onClick={() => setShowEmojiMenu(!showEmojiMenu)}
                          className={cn(
                            "p-2 rounded-lg text-slate-500 hover:text-indigo-650 hover:bg-slate-100 cursor-pointer transition-all border border-transparent hover:border-slate-205",
                            showEmojiMenu && "text-indigo-600 bg-slate-100 border-slate-200"
                          )}
                          title="Insert Emoji"
                        >
                          <Smile size={13} />
                        </button>
                        {showEmojiMenu && (
                          <div className="absolute bottom-10 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 flex gap-1.5 animate-fadeIn">
                            {['👍', '❤️', '😂', '😮', '🔥', '🎉', '🚀'].map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => insertEmoji(emoji)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-sm cursor-pointer hover:scale-110 active:scale-95 transition-all"
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
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-650" 
                              : priority === 'Important' 
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-655" 
                              : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                          )}
                        >
                          <Zap size={11} className={cn(priority === 'Urgent' && "fill-rose-500")} />
                          {priority}
                          <ChevronDown size={10} className="text-slate-500" />
                        </button>
                        {showPriorityMenu && (
                          <div className="absolute bottom-10 left-0 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 w-32 flex flex-col gap-0.5 animate-fadeIn">
                            {(['Standard', 'Important', 'Urgent'] as const).map(p => (
                              <button
                                key={p}
                                onClick={() => { setPriority(p); setShowPriorityMenu(false); }}
                                className={cn(
                                  "w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors",
                                  p === 'Urgent' ? "text-rose-600 hover:bg-rose-50" : p === 'Important' ? "text-amber-605 hover:bg-amber-50" : "text-slate-600"
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
                      disabled={!draftText.trim() && attachedFiles.length === 0}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                        (draftText.trim() || attachedFiles.length > 0)
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md hover:scale-[1.02] active:scale-[0.98]"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      )}
                    >
                      <Send size={11} className={cn("stroke-[2.5]", (draftText.trim() || attachedFiles.length > 0) ? "text-white" : "text-slate-400")} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-905/60 backdrop-blur-sm p-4 animate-fadeIn select-none">
          <div className="bg-white border border-slate-200 rounded-2xl w-[380px] max-h-[500px] flex flex-col shadow-2xl relative overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700">Start Message</span>
              <button
                onClick={() => { setShowNewChatModal(false); setContactSearch(''); }}
                className="text-slate-400 hover:text-slate-655 hover:bg-slate-50 rounded-lg p-1 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Filter Search */}
            <div className="px-4 py-3 border-b border-slate-100 shrink-0 select-none">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:bg-white focus-within:border-indigo-500/50 transition-all">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  autoFocus
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="Search team contacts..."
                  className="flex-1 bg-transparent text-xs text-slate-750 placeholder:text-slate-400 outline-none font-outfit"
                />
              </div>
            </div>

            {/* Contacts list directories */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin select-none">
              {filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <Search size={24} className="text-slate-300 mb-3" />
                  <p className="text-xs text-slate-500">No teammates found</p>
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => handleStartDM(contact)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-100 border border-transparent transition-all cursor-pointer text-left select-none mb-0.5"
                  >
                    <div className="relative shrink-0 select-none">
                      <Avatar name={contact.name} src={contact.avatar} size="sm" className="border border-slate-100" />
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm",
                        contact.presence === 'online' ? "bg-emerald-500" : contact.presence === 'away' ? "bg-amber-500" : "bg-slate-400"
                      )} />
                    </div>
                    <div className="flex flex-col min-w-0 select-none leading-none">
                      <span className="text-xs font-bold text-slate-705 truncate">{contact.name}</span>
                      <span className="text-[9px] font-semibold text-slate-400 truncate mt-1">{contact.email}</span>
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
