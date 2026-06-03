'use client';

import React, { useState, useRef } from 'react';
import { Hash, Plus, ChevronRight, VolumeX, Pin } from 'lucide-react';
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

interface ChannelItemProps {
  channel: Channel;
  isActive: boolean;
  onSelect: (channelId: string) => void;
}

function ChannelItem({ channel, isActive, onSelect }: ChannelItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const touchStartRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    isSwipingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwipingRef.current) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartRef.current;
    
    // Swipe left is negative. If already open, offset starts at -100
    const currentOffset = swipeOffset === -100 ? -100 + deltaX : deltaX;
    
    // Clamp between -100 and 0
    const clamped = Math.max(-100, Math.min(0, currentOffset));
    setSwipeOffset(clamped);
  };

  const handleTouchEnd = () => {
    isSwipingRef.current = false;
    if (swipeOffset < -50) {
      setSwipeOffset(-100);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(30);
      }
    } else {
      setSwipeOffset(0);
    }
  };

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
    setSwipeOffset(0);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinned(!isPinned);
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
    setSwipeOffset(0);
  };

  return (
    <div className="relative w-full overflow-hidden select-none group min-h-[44px] flex items-center mb-1">
      {/* Background Action Buttons */}
      <div className="absolute right-1 top-0 bottom-0 flex items-center gap-1 z-0">
        <button
          onClick={handleMute}
          className={cn(
            "h-11 w-11 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 transition-all",
            isMuted ? "text-amber-500 border-amber-500/20 bg-amber-500/5" : "text-slate-400 hover:text-white"
          )}
          style={{ minWidth: '44px', minHeight: '44px' }}
          title={isMuted ? "Unmute" : "Mute"}
        >
          <VolumeX className="w-4 h-4" />
        </button>
        <button
          onClick={handlePin}
          className={cn(
            "h-11 w-11 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 transition-all",
            isPinned ? "text-blue-500 border-blue-500/20 bg-blue-500/5" : "text-slate-400 hover:text-white"
          )}
          style={{ minWidth: '44px', minHeight: '44px' }}
          title={isPinned ? "Unpin" : "Pin"}
        >
          <Pin className="w-4 h-4" />
        </button>
      </div>

      {/* Foreground Channel Element */}
      <button
        onClick={() => {
          if (swipeOffset === -100) {
            setSwipeOffset(0);
          } else {
            onSelect(channel.id);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-3 rounded-xl text-left text-xs font-medium transition-transform duration-150 ease-out z-10 bg-[#0B0F19] border border-transparent shadow-sm',
          isActive
            ? 'bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-500/20 text-white'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
          isPinned && 'border-l-2 border-l-blue-500'
        )}
      >
        {isActive && !isPinned && (
          <span className="absolute left-0 w-0.5 h-4 rounded-full bg-blue-500" />
        )}
        <Hash
          className={cn(
            'w-4 h-4 shrink-0',
            isActive ? 'text-blue-400' : 'text-slate-500'
          )}
        />
        <span className="truncate flex-1 flex items-center gap-1.5">
          {channel.name}
          {isMuted && <VolumeX className="w-3.5 h-3.5 text-amber-500/70" />}
        </span>
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all text-slate-500',
            isActive && 'opacity-100 text-blue-400'
          )}
        />
      </button>
    </div>
  );
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
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
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
            channels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={selectedChannelId === channel.id}
                onSelect={onSelectChannel}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

export default ChannelList;