'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, ArrowLeft, Users, Paperclip, FileText, Image, Film, File, Download, FileArchive, FileAudio } from 'lucide-react';
import { ChannelMessage } from '../../types';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import { formatTime, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabaseClient';
import api from '../../lib/api';

interface ChannelChatProps {
  teamId: string;
  channelId: string;
  channelName: string;
  messages: ChannelMessage[];
  loading: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onBackToChannels?: () => void;
  onViewMembers?: () => void;
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

        // Audit log action
        try {
          await api.post('/admin/audit-logs', { action: 'download_file', targetId: file.name });
        } catch (e) {
          console.warn('Failed to audit log file download:', e);
        }
      }
    } catch (err) {
      console.error('Failed to generate download URL:', err);
      alert('Could not download file. Ensure you have membership access to this team workspace.');
    } finally {
      setDownloading(false);
    }
  };

  const getIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('image/')) return <Image className="w-5 h-5 text-cyan-400" />;
    if (t.includes('video/')) return <Film className="w-5 h-5 text-indigo-400" />;
    if (t.includes('audio/')) return <FileAudio className="w-5 h-5 text-purple-400" />;
    if (t.includes('pdf') || t.includes('word') || t.includes('document')) return <FileText className="w-5 h-5 text-emerald-400" />;
    if (t.includes('zip') || t.includes('rar') || t.includes('tar') || t.includes('archive')) return <FileArchive className="w-5 h-5 text-amber-500" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/60 rounded-2xl p-4 flex items-center justify-between gap-4 max-w-sm w-full transition-all shadow-md group mt-1">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800/80">
          {getIcon(file.type)}
        </div>
        <div className="min-w-0 text-left">
          <p className="text-xs font-bold text-slate-200 truncate group-hover:text-white transition-colors" title={file.name}>
            {file.name}
          </p>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="p-2 bg-slate-950 border border-slate-800 hover:border-blue-500/30 text-slate-400 hover:text-blue-400 rounded-xl transition-all cursor-pointer hover:bg-slate-900 shrink-0"
        title="Download file"
      >
        {downloading ? (
          <span className="w-4 h-4 rounded-full border-2 border-slate-750 border-t-blue-500 animate-spin block" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export function ChannelChat({
  teamId,
  channelId,
  channelName,
  messages,
  loading,
  onSendMessage,
  onBackToChannels,
  onViewMembers,
}: ChannelChatProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string>('');
  
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    setUploadingFileName(file.name);
    setUploadProgress(0);

    try {
      const folderPath = `${teamId}/${channelId}`;
      const filePath = `${folderPath}/${Date.now()}-${file.name}`;
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No authenticated session found");

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('cacheControl', '3600');

      const url = `${supabaseUrl}/storage/v1/object/workspace_files/${filePath}`;

      await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('apikey', supabaseAnonKey);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              resolve({ path: filePath });
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.responseText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      const filePayload = {
        file: {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          path: filePath,
        }
      };

      await onSendMessage(JSON.stringify(filePayload));
    } catch (err) {
      console.error('File upload failed:', err);
      alert('File upload failed. Ensure you are a member of this team.');
    } finally {
      setUploadProgress(null);
      setUploadingFileName('');
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
          messages.map((msg) => {
            let fileData = null;
            if (msg.content && msg.content.startsWith('{"file":')) {
              try {
                fileData = JSON.parse(msg.content).file;
              } catch (e) {
                // Not a valid JSON or file
              }
            }

            return (
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
                  {fileData ? (
                    <FileCard file={fileData} />
                  ) : (
                    <p className="text-xs text-slate-300 bg-white/5 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-none inline-block max-w-[85%] break-words shadow-inner">
                      {msg.content}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Message Form */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-slate-900 bg-slate-950/40">
        {uploadProgress !== null && (
          <div className="mb-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-2 animate-fadeIn text-left">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span className="truncate max-w-[200px]">Uploading: {uploadingFileName}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-150" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="relative flex items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploadProgress !== null}
            className="absolute left-3.5 p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading || uploadProgress !== null}
            placeholder={`Send message to #${channelName}...`}
            className="w-full pl-14 pr-14 py-4 bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-2xl text-xs text-slate-200 placeholder:text-slate-500 transition-colors shadow-inner"
          />
          <button
            type="submit"
            disabled={!content.trim() || sending || loading || uploadProgress !== null}
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