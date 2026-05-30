'use client';

import React from 'react';
import { X, Mic, MicOff, Video as Cam, VideoOff as CamOff } from 'lucide-react';
import { getHSLColor, getInitials } from '../../lib/utils';

interface ParticipantInfo {
  userId: string;
  userName: string;
  socketId: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
}

interface ParticipantsPanelProps {
  localName: string;
  localMuted: boolean;
  localCameraOff: boolean;
  participants: ParticipantInfo[];
  onClose: () => void;
}

export function ParticipantsPanel({
  localName,
  localMuted,
  localCameraOff,
  participants,
  onClose,
}: ParticipantsPanelProps) {
  const totalCount = participants.length + 1; // peers + self

  return (
    <aside className="w-full sm:w-80 h-full bg-slate-950/95 border-l border-slate-900 flex flex-col justify-between shrink-0 shadow-2xl fixed sm:relative right-0 top-0 bottom-0 z-50">
      {/* Title Header */}
      <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between bg-slate-950">
        <h3 className="text-sm font-bold text-white tracking-wider uppercase flex items-center gap-2">
          <span>Participants</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-bold">
            {totalCount}
          </span>
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          aria-label="Close participants panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Viewport list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {/* Local user tile listing */}
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-inner"
              style={{ backgroundColor: getHSLColor(localName) }}
            >
              {getInitials(localName)}
            </div>
            <span className="text-xs font-bold text-white truncate max-w-[130px]">
              {localName} (You)
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 shrink-0">
            {localMuted ? (
              <MicOff className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-blue-400" />
            )}
            {localCameraOff ? (
              <CamOff className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Cam className="w-3.5 h-3.5 text-blue-400" />
            )}
          </div>
        </div>

        {/* Remote users listing */}
        {participants.map((peer) => {
          const peerBg = getHSLColor(peer.userName);
          const peerInitials = getInitials(peer.userName);

          return (
            <div
              key={peer.socketId}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 border border-transparent transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-inner"
                  style={{ backgroundColor: peerBg }}
                >
                  {peerInitials}
                </div>
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                  {peer.userName}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-400 shrink-0">
                {peer.isMuted ? (
                  <MicOff className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-slate-500" />
                )}
                {peer.isCameraOff ? (
                  <CamOff className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Cam className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default ParticipantsPanel;