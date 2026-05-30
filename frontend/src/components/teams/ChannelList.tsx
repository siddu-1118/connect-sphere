'use client';

import React from 'react';
import { Hash, Plus, ChevronRight, Settings } from 'lucide-react';
import { Channel } from '../../types';
import { cn } from '../../lib/utils';

interface ChannelListProps {
  teamName: string;
  role: 'owner' | 'admin' | 'member';
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onCreateChannelClick: () => void;
}

export function ChannelList({
  teamName,
  role,
  channels,
  selectedChannelId,
  onSelectChannel,
  onCreateChannelClick,
}: ChannelListProps) {
  const isPrivileged = role === 'owner' || role === 'admin';

  return (
    <aside className="w-60 bg-slate-950/65 border-r border-slate-900 flex flex-col justify-between shrink-0 h-full backdrop-blur-xl">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Workspace Title Header */}
        <div className="px-5 py-4 border-b border-slate-900 bg-slate-950 flex items-center justify-between">
          <h2 className="text-xs font-black text-white tracking-widest uppercase truncate max-w-[130px]">
            {teamName}
          </h2>
          {isPrivileged && (
            <button
              onClick={onCreateChannelClick}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              title="Create new channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Channels List Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1 min-h-0">
          <div className="px-2 mb-2 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Text Channels</span>
          </div>

          {channels.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-4 px-2">
              No channels created.
            </p>
          ) : (
            channels.map((channel) => {
              const isActive = selectedChannelId === channel.id;

              return (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all group relative',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 w-0.5 h-4 rounded-full bg-blue-500" />
                  )}
                  <Hash
                    className={cn(
                      'w-4 h-4 shrink-0',
                      isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  <span className="truncate flex-1">{channel.name}</span>
                  <ChevronRight
                    className={cn(
                      'w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all text-slate-500 group-hover:translate-x-0.5',
                      isActive && 'opacity-100 text-blue-400'
                    )}
                  />
                </button>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}

export default ChannelList;