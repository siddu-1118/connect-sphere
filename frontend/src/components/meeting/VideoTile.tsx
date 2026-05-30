'use client';

import React, { useEffect, useRef } from 'react';
import { MicOff, VolumeX } from 'lucide-react';
import { cn, getHSLColor, getInitials } from '../../lib/utils';

interface VideoTileProps {
  stream: MediaStream | null;
  userName: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isLocal?: boolean;
}

export function VideoTile({
  stream,
  userName,
  isMuted = false,
  isCameraOff = false,
  isLocal = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Hook the stream up to the native HTML5 video element on change
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = getInitials(userName);
  const avatarBg = getHSLColor(userName);

  return (
    <div className="relative w-full h-full bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden group shadow-2xl flex items-center justify-center">
      {/* Video stream container */}
      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Echo protection: local video must always be muted!
          className={cn(
            'w-full h-full object-cover rounded-2xl',
            isLocal && 'transform -scale-x-100' // Mirror effect for local self-view
          )}
          aria-label={`${userName}'s video stream`}
        />
      ) : (
        /* Camera Off Premium Placeholder */
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 transition-all duration-300 bg-gradient-to-b from-slate-900 to-slate-950"
          style={{ border: `1px solid rgba(255,255,255,0.02)` }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg animate-pulse"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Camera Off
          </span>
        </div>
      )}

      {/* Mic Status overlay badge (top right) */}
      {isMuted && (
        <div className="absolute top-4 right-4 bg-red-600/90 text-white p-2 rounded-xl backdrop-blur-md border border-red-500/20 shadow-lg">
          <MicOff className="w-4 h-4" />
        </div>
      )}

      {/* User overlay tag (bottom left) */}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/5 text-xs text-white font-semibold backdrop-blur-md shadow-lg flex items-center gap-2">
        <span className="max-w-[120px] truncate">{userName}</span>
        {isLocal && (
          <span className="px-1.5 py-0.5 rounded-lg bg-blue-600 text-[10px] uppercase font-bold tracking-wider">
            You
          </span>
        )}
      </div>
    </div>
  );
}

export default VideoTile;