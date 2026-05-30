'use client';

import React from 'react';
import {
  Mic,
  MicOff,
  Video as Cam,
  VideoOff as CamOff,
  Monitor,
  MessageSquare,
  Users as Attendees,
  PhoneOff,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ControlBarProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  showChat: boolean;
  onToggleChat: () => void;
  showParticipants: boolean;
  onToggleParticipants: () => void;
  onLeave: () => void;
}

export function ControlBar({
  isMuted,
  isCameraOff,
  isScreenSharing,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  showChat,
  onToggleChat,
  showParticipants,
  onToggleParticipants,
  onLeave,
}: ControlBarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-4 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl max-w-[95vw]">
      {/* Microphone Control */}
      <button
        onClick={onToggleMute}
        className={cn(
          'p-2.5 md:p-3.5 rounded-xl transition-all duration-200 focus:outline-none active:scale-95 border',
          isMuted
            ? 'bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30'
            : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
        )}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {isMuted ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
      </button>

      {/* Camera Control */}
      <button
        onClick={onToggleCamera}
        className={cn(
          'p-2.5 md:p-3.5 rounded-xl transition-all duration-200 focus:outline-none active:scale-95 border',
          isCameraOff
            ? 'bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30'
            : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
        )}
        aria-label={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
      >
        {isCameraOff ? <CamOff className="w-4 h-4 md:w-5 md:h-5" /> : <Cam className="w-4 h-4 md:w-5 md:h-5" />}
      </button>

      {/* Screen Share Control */}
      <button
        onClick={onToggleScreenShare}
        className={cn(
          'p-2.5 md:p-3.5 rounded-xl transition-all duration-200 focus:outline-none active:scale-95 border hidden sm:inline-flex',
          isScreenSharing
            ? 'bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30'
            : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
        )}
        aria-label={isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
      >
        <Monitor className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-800 hidden sm:block" />

      {/* Chat panel toggle */}
      <button
        onClick={onToggleChat}
        className={cn(
          'p-2.5 md:p-3.5 rounded-xl transition-all duration-200 focus:outline-none active:scale-95 border',
          showChat
            ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 text-blue-400'
            : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
        )}
        aria-label="Toggle chat panel"
      >
        <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {/* Participants panel toggle */}
      <button
        onClick={onToggleParticipants}
        className={cn(
          'p-2.5 md:p-3.5 rounded-xl transition-all duration-200 focus:outline-none active:scale-95 border',
          showParticipants
            ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 text-blue-400'
            : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
        )}
        aria-label="Toggle participants panel"
      >
        <Attendees className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {/* Leave meeting button */}
      <button
        onClick={onLeave}
        className="p-2.5 md:p-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white border border-red-500/20 transition-all duration-200 focus:outline-none active:scale-95 shadow-lg shadow-red-500/10"
        aria-label="Leave meeting room"
      >
        <PhoneOff className="w-4 h-4 md:w-5 md:h-5" />
      </button>
    </div>
  );
}

export default ControlBar;