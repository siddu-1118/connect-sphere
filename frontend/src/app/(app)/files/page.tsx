'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen, Upload, FileText, Image, Film,
  File, Clock, Users, Search, Grid, List,
  Plus, ChevronRight, Download, FileArchive, FileAudio, Trash2
} from 'lucide-react';
import api from '../../../lib/api';
import { supabase } from '../../../lib/supabaseClient';
import Spinner from '../../../components/ui/Spinner';

type ViewMode = 'grid' | 'list';
type FileTab = 'recent' | 'shared' | 'my' | 'teams';

interface StoredFile {
  name: string;
  size: number;
  type: string;
  updatedAt: string;
  path: string;
  teamId: string;
  teamName: string;
  channelId: string;
  channelName: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const tabConfig: { key: FileTab; label: string; icon: React.ElementType }[] = [
  { key: 'recent', label: 'Recent', icon: Clock },
  { key: 'teams', label: 'Teams Files', icon: Users },
  { key: 'my', label: 'My Uploads', icon: FolderOpen },
];

export default function FilesPage() {
  const [activeTab, setActiveTab] = useState<FileTab>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQ, setSearchQ] = useState('');
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  
  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchAllFiles = async () => {
    setLoading(true);
    try {
      const teamsRes = await api.get('/teams');
      if (teamsRes.data.success) {
        const fetchedTeams = teamsRes.data.teams || [];
        setTeams(fetchedTeams);
        
        let allFiles: StoredFile[] = [];
        
        for (const team of fetchedTeams) {
          try {
            const teamRes = await api.get(`/teams/${team.id}`);
            if (teamRes.data.success) {
              const teamChannels = teamRes.data.channels || [];
              for (const chan of teamChannels) {
                const folderPath = `${team.id}/${chan.id}`;
                const { data: storageObjects, error: storageErr } = await supabase.storage
                  .from('workspace_files')
                  .list(folderPath);
                
                if (!storageErr && storageObjects) {
                  const mapped = storageObjects
                    .filter(obj => obj.name !== '.emptyFolderPlaceholder')
                    .map(obj => ({
                      name: obj.name,
                      size: obj.metadata?.size || 0,
                      type: obj.metadata?.mimetype || 'application/octet-stream',
                      updatedAt: obj.updated_at || obj.created_at || new Date().toISOString(),
                      path: `${folderPath}/${obj.name}`,
                      teamId: team.id,
                      teamName: team.name,
                      channelId: chan.id,
                      channelName: chan.name
                    }));
                  allFiles = [...allFiles, ...mapped];
                }
              }
            }
          } catch (err) {
            console.error(`Failed to load files for team ${team.id}:`, err);
          }
        }
        
        // Sort files by date descending
        allFiles.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setFiles(allFiles);
      }
    } catch (err) {
      console.error('Failed to load files/teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFiles();
  }, []);

  // Fetch channels when team is selected in upload modal
  useEffect(() => {
    if (!selectedTeamId) {
      setChannels([]);
      setSelectedChannelId('');
      return;
    }

    async function loadChannels() {
      try {
        const res = await api.get(`/teams/${selectedTeamId}`);
        if (res.data.success) {
          setChannels(res.data.channels || []);
          if (res.data.channels?.length > 0) {
            setSelectedChannelId(res.data.channels[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load team channels for upload:', err);
      }
    }

    loadChannels();
  }, [selectedTeamId]);

  const handleDownload = async (file: StoredFile) => {
    setDownloadingFile(file.path);
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
      console.error('Download failed:', err);
      alert('Could not download file. Ensure you have active membership in this team.');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !selectedChannelId || !selectedFile || uploading) {
      alert('Please fill out all fields and select a file.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const folderPath = `${selectedTeamId}/${selectedChannelId}`;
      const filePath = `${folderPath}/${Date.now()}-${selectedFile.name}`;
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No authenticated session found");

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

      const formData = new FormData();
      formData.append('file', selectedFile);
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

      // Post message in the channel with file metadata
      const filePayload = {
        file: {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type || 'application/octet-stream',
          path: filePath,
        }
      };

      await api.post(`/teams/${selectedTeamId}/channels/${selectedChannelId}/messages`, {
        content: JSON.stringify(filePayload)
      });

      // Success
      setShowUploadModal(false);
      setSelectedFile(null);
      await fetchAllFiles();
      alert('File uploaded successfully!');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload file. Check permissions.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const getIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('image/')) return <Image className="w-4 h-4 text-blue-500" />;
    if (t.includes('video/')) return <Film className="w-4 h-4 text-indigo-500" />;
    if (t.includes('audio/')) return <FileAudio className="w-4 h-4 text-purple-500" />;
    if (t.includes('pdf') || t.includes('word') || t.includes('document')) return <FileText className="w-4 h-4 text-emerald-500" />;
    if (t.includes('zip') || t.includes('rar') || t.includes('tar') || t.includes('archive')) return <FileArchive className="w-4 h-4 text-amber-500" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const [selectedVaultFile, setSelectedVaultFile] = useState<StoredFile | null>(null);

  // Filter files based on search terms and tabs
  const filteredFiles = files.filter(f => {
    // Search query match
    if (searchQ && !f.name.toLowerCase().includes(searchQ.toLowerCase())) {
      return false;
    }
    
    // Tab match
    if (activeTab === 'recent') {
      // Show top 10 recent
      return true; 
    }
    if (activeTab === 'teams') {
      return true; // Show all team files
    }
    if (activeTab === 'my') {
      return true;
    }
    return true;
  });

  // Limit recent files to first 12 entries
  const displayedFiles = activeTab === 'recent' ? filteredFiles.slice(0, 12) : filteredFiles;

  // Group files by channel to display as folders dynamically from real data
  const channelFolders = Object.values(
    files.reduce((acc: any, file) => {
      const key = file.channelId;
      if (!acc[key]) {
        acc[key] = {
          name: `#${file.channelName}`,
          count: 0,
        };
      }
      acc[key].count += 1;
      return acc;
    }, {})
  ) as any[];

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-800 font-outfit select-none">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-indigo-600" />
          <h1 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Workspace File Vault</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search files…"
              className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500/50 w-52 transition-all font-outfit"
            />
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200/60">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
              title="List View"
            >
              <List size={13} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid View"
            >
              <Grid size={13} />
            </button>
          </div>
          {/* New / Upload */}
          <button
            onClick={() => {
              if (teams.length === 0) {
                alert('You must join or create a team before uploading files.');
                return;
              }
              setSelectedTeamId(teams[0].id);
              setShowUploadModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer border-0"
          >
            <Plus size={13} className="stroke-[2.5]" /> Upload
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-200/60 bg-white shrink-0">
        {tabConfig.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === key
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                : 'text-slate-500 border border-transparent hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Main Content Area + Details Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Files Grid/List Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          
          {/* Drag & Drop Persistent Area */}
          <div 
            onClick={() => {
              if (teams.length === 0) {
                alert('You must join or create a team before uploading files.');
                return;
              }
              setSelectedTeamId(teams[0].id);
              setShowUploadModal(true);
            }}
            className="border border-dashed border-slate-250 bg-white hover:bg-slate-50/50 rounded-2xl p-4 mb-6 hover:border-indigo-500 transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                <Upload size={18} />
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-650 transition-colors">Quick Upload / Drop Zone</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Drag your assets here or click to browse files</p>
              </div>
            </div>
            <button className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 hover:border-indigo-500/30 hover:bg-white text-[10px] font-bold text-slate-650 hover:text-indigo-650 rounded-xl transition-all shadow-xs">
              Browse
            </button>
          </div>

          {/* Drive Folders Section (Rendered dynamically from real data) */}
          {channelFolders.length > 0 && (
            <div className="mb-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3 text-left">Drive Folders</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {channelFolders.map(folder => (
                  <div 
                    key={folder.name} 
                    className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3 hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer text-left"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold bg-indigo-50 text-indigo-650 animate-fadeIn">
                      <FolderOpen size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate leading-snug">{folder.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{folder.count} file{folder.count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3 text-left">Recent Documents</span>

          {loading ? (
            <div className="h-[30vh] flex flex-col items-center justify-center gap-4">
              <Spinner className="border-t-indigo-600 w-8 h-8" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">Syncing File Vault...</p>
            </div>
          ) : displayedFiles.length === 0 ? (
            <div className="h-[30vh] flex flex-col items-center justify-center gap-4 p-8 text-center max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shadow-sm">
                <FolderOpen size={20} className="text-indigo-600 opacity-80" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 mb-1">No files found</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Upload files to start sharing documents in channels.
                </p>
              </div>
            </div>
          ) : viewMode === 'list' ? (
            /* LIST VIEW */
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-bold uppercase tracking-wider text-slate-400 select-none">
                      <th className="px-5 py-4">Name</th>
                      <th className="px-5 py-4">Workspace</th>
                      <th className="px-5 py-4">Channel</th>
                      <th className="px-5 py-4">Size</th>
                      <th className="px-5 py-4">Modified</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayedFiles.map((file) => (
                      <tr 
                        key={file.path} 
                        onClick={() => setSelectedVaultFile(file)}
                        className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${selectedVaultFile?.path === file.path ? 'bg-indigo-50/10' : ''}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/60">
                              {getIcon(file.type)}
                            </div>
                            <span className="text-slate-700 font-bold truncate group-hover:text-indigo-605 max-w-[150px] md:max-w-[240px]" title={file.name}>
                              {file.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-500">{file.teamName}</td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-[10px] font-bold text-slate-500">
                            #{file.channelName}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 uppercase">{formatFileSize(file.size)}</td>
                        <td className="px-5 py-4 text-slate-400">
                          {new Date(file.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleDownload(file)}
                            disabled={downloadingFile === file.path}
                            className="p-1.5 bg-slate-50 border border-slate-200 hover:border-indigo-500/30 text-slate-500 hover:text-indigo-650 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center hover:bg-white shadow-xs"
                          >
                            {downloadingFile === file.path ? (
                              <span className="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                            ) : (
                              <Download size={13} />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedFiles.map((file) => (
                <div
                  key={file.path}
                  onClick={() => setSelectedVaultFile(file)}
                  className={`bg-white border hover:border-indigo-500/30 hover:shadow-md rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all shadow-sm group text-left cursor-pointer ${
                    selectedVaultFile?.path === file.path ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex gap-3 items-start min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/60">
                      {getIcon(file.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-650 transition-colors" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider leading-none">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-100 leading-none">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-400 truncate max-w-[80px]">{file.teamName}</span>
                      <span className="text-indigo-600">#{file.channelName}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">
                      {new Date(file.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    disabled={downloadingFile === file.path}
                    className="w-full py-2 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-500/30 text-slate-500 hover:text-indigo-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {downloadingFile === file.path ? (
                      <span className="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                    ) : (
                      <>
                        <Download size={12} /> Download
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: File Details Drawer */}
        {selectedVaultFile && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 h-full animate-fadeIn">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">File Details</span>
              <button 
                onClick={() => setSelectedVaultFile(null)}
                className="text-slate-400 hover:text-slate-605 transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Details Content */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 scrollbar-thin">
              {/* Preview Box */}
              <div className="aspect-video bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center border border-slate-200/40 shadow-xs mb-2">
                  {getIcon(selectedVaultFile.type)}
                </div>
                <p className="text-xs font-bold text-slate-700 text-center truncate w-full px-2" title={selectedVaultFile.name}>
                  {selectedVaultFile.name}
                </p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wide mt-1">
                  {formatFileSize(selectedVaultFile.size)}
                </p>
              </div>

              {/* Information Grid */}
              <div className="flex flex-col gap-3">
                <div className="text-left">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">File Name</span>
                  <p className="text-xs font-bold text-slate-705 break-all mt-0.5">{selectedVaultFile.name}</p>
                </div>

                <div className="text-left">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Type</span>
                  <p className="text-xs font-semibold text-slate-655 mt-0.5">{selectedVaultFile.type}</p>
                </div>

                <div className="text-left">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Workspace</span>
                  <p className="text-xs font-semibold text-slate-655 mt-0.5">{selectedVaultFile.teamName}</p>
                </div>

                <div className="text-left">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Location</span>
                  <div className="mt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-[10px] font-bold text-slate-500">
                      #{selectedVaultFile.channelName}
                    </span>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Last Modified</span>
                  <p className="text-xs font-semibold text-slate-550 mt-0.5">
                    {new Date(selectedVaultFile.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0">
              <button
                onClick={() => handleDownload(selectedVaultFile)}
                disabled={downloadingFile === selectedVaultFile.path}
                className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 border-none"
              >
                {downloadingFile === selectedVaultFile.path ? (
                  <span className="w-4 h-4 border-2 border-slate-200 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Download size={13} /> Download
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn">
            <div className="h-14 px-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Upload File to Vault</span>
              <button
                onClick={() => {
                  if (!uploading) {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                  }
                }}
                className="text-slate-400 hover:text-slate-655 text-sm font-bold cursor-pointer transition-colors p-1"
                disabled={uploading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 flex flex-col gap-4">
              {/* Select Team */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Team Workspace</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  disabled={uploading}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-500/40 transition-colors font-outfit"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Select Channel */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Channel</label>
                {channels.length === 0 ? (
                  <div className="text-xs text-slate-400 italic px-1 py-1">Loading channels...</div>
                ) : (
                  <select
                     value={selectedChannelId}
                     onChange={(e) => setSelectedChannelId(e.target.value)}
                     disabled={uploading}
                     className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-500/40 transition-colors font-outfit"
                  >
                    {channels.map(c => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Choose File */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Choose File</label>
                <div 
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`border border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    selectedFile 
                      ? 'border-indigo-500/40 bg-indigo-50/20' 
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                  <Upload size={22} className={selectedFile ? 'text-indigo-650' : 'text-slate-400'} />
                  {selectedFile ? (
                    <div className="max-w-[280px]">
                      <p className="text-xs font-bold text-slate-700 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-indigo-650 mt-1 uppercase tracking-wider">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div className="leading-tight">
                      <p className="text-xs font-bold text-slate-655">Click to select file</p>
                      <p className="text-[10px] text-slate-400 mt-1">Upload reports, images, or documents</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress Bar */}
              {uploadProgress !== null && (
                <div className="p-3 bg-slate-50 rounded-xl flex flex-col gap-2 animate-fadeIn text-left border border-slate-200">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span className="truncate">Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-150" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                  }}
                  disabled={uploading}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-755 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-40"
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
