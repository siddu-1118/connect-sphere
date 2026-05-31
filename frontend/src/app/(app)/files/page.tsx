'use client';

import React, { useState } from 'react';
import {
  FolderOpen, Upload, FileText, Image, Film,
  File, Clock, Users, Search, Grid, List,
  Plus, ChevronRight, Star, Share2
} from 'lucide-react';

type ViewMode = 'grid' | 'list';
type FileTab = 'recent' | 'shared' | 'my' | 'teams';

const tabConfig: { key: FileTab; label: string; icon: React.ElementType }[] = [
  { key: 'recent', label: 'Recent', icon: Clock },
  { key: 'shared', label: 'Shared with me', icon: Share2 },
  { key: 'my', label: 'My Files', icon: FolderOpen },
  { key: 'teams', label: 'Teams Files', icon: Users },
];

export default function FilesPage() {
  const [activeTab, setActiveTab] = useState<FileTab>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQ, setSearchQ] = useState('');
  const [showUploadHint, setShowUploadHint] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[#111827] text-slate-100">
      {/* Header */}
      <div className="h-14 px-6 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#0B0F17]">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-[#10B981]" />
          <h1 className="text-sm font-bold text-slate-100">Files</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search files…"
              className="bg-white/5 border border-white/[0.06] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-[#10B981]/50 w-48 transition-all"
            />
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/[0.06]">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#10B981]/30 text-[#10B981]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <List size={13} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#10B981]/30 text-[#10B981]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Grid size={13} />
            </button>
          </div>
          {/* New / Upload */}
          <button
            onClick={() => setShowUploadHint(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold rounded-xl transition-colors shadow"
          >
            <Plus size={13} /> Upload
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-white/[0.06] bg-[#0B0F17] shrink-0">
        {tabConfig.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === key
                ? 'bg-[#10B981]/20 text-[#10B981]'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Upload hint toast */}
      {showUploadHint && (
        <div className="mx-6 mt-4 flex items-center gap-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl px-4 py-3 text-sm text-[#10B981] shrink-0">
          <Upload size={15} />
          <span>File storage integration coming soon. Stay tuned!</span>
          <button onClick={() => setShowUploadHint(false)} className="ml-auto text-slate-500 hover:text-slate-300 text-xs">✕</button>
        </div>
      )}

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <div className="relative">
          {/* Illustrated file cluster */}
          <div className="w-28 h-28 relative">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-24 bg-gradient-to-br from-[#10B981]/20 to-[#22d3ee]/10 border border-white/10 rounded-2xl flex items-center justify-center shadow-xl">
              <FolderOpen size={36} className="text-[#10B981] opacity-60" />
            </div>
            <div className="absolute top-0 right-0 w-12 h-14 bg-[#191f31] border border-white/10 rounded-xl flex items-center justify-center shadow-lg rotate-6">
              <FileText size={18} className="text-[#10B981]" />
            </div>
            <div className="absolute top-2 left-0 w-10 h-12 bg-[#191f31] border border-white/10 rounded-xl flex items-center justify-center shadow-lg -rotate-6">
              <Image size={16} className="text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="text-center max-w-xs">
          <h3 className="text-base font-bold text-slate-200 mb-1">
            {activeTab === 'recent' && 'No recent files'}
            {activeTab === 'shared' && 'Nothing shared with you yet'}
            {activeTab === 'my' && 'Your file space is empty'}
            {activeTab === 'teams' && 'No team files found'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {activeTab === 'recent' && 'Files you open or edit will appear here for quick access.'}
            {activeTab === 'shared' && 'When teammates share files with you, they\'ll appear here.'}
            {activeTab === 'my' && 'Upload documents, images, and more to organize your workspace.'}
            {activeTab === 'teams' && 'Files shared in your team channels will be collected here.'}
          </p>
        </div>

        <button
          onClick={() => setShowUploadHint(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-[#10B981]/20"
        >
          <Upload size={15} />
          Upload a file
        </button>
      </div>
    </div>
  );
}
