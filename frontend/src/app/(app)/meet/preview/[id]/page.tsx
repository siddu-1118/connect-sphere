'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Settings as SettingsIcon,
  Monitor,
  Copy,
  Check,
  X,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import Avatar from '@/components/ui/Avatar';

/* ─────────────────────────── types ─────────────────────────── */
type BackgroundEffect = 'none' | 'blur' | 'beach' | 'dark-studio';

interface CustomDropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80'
];

/* ─────────────────────── custom dropdown ───────────────────── */
function CustomDropdown({ label, value, options, onChange }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-1.5" ref={ref}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none hover:border-white/15 transition-colors cursor-pointer"
        >
          <span className="truncate text-left">{value || 'Select device'}</span>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open && (
          <div className="absolute z-50 top-full mt-1.5 w-full bg-[#111827] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors cursor-pointer ${
                  opt === value
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-slate-350 hover:bg-white/[0.04]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── audio meter bars ──────────────────── */
function AudioMeter({ active }: { active: boolean }) {
  const [levels, setLevels] = useState([0.2, 0.5, 0.3, 0.7, 0.4]);

  useEffect(() => {
    if (!active) {
      setLevels([0.05, 0.05, 0.05, 0.05, 0.05]);
      return;
    }
    const id = setInterval(() => {
      setLevels([
        0.1 + Math.random() * 0.9,
        0.1 + Math.random() * 0.9,
        0.1 + Math.random() * 0.9,
        0.1 + Math.random() * 0.9,
        0.1 + Math.random() * 0.9,
      ]);
    }, 120);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="absolute bottom-4 left-4 flex items-end gap-1 z-10 bg-black/30 px-2.5 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
      {levels.map((lvl, i) => (
        <div
          key={i}
          className="w-1 rounded-full transition-all duration-100"
          style={{
            height: `${Math.max(4, lvl * 18)}px`,
            backgroundColor: active ? '#10B981' : '#4b5563',
            opacity: active ? 0.9 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

/* ───────────────────────── main page ───────────────────────── */
export default function GreenRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const meetingId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  /* ── device state ── */
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [activeEffect, setActiveEffect] = useState<BackgroundEffect>('none');
  const [blurLevel, setBlurLevel] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(PRESET_AVATARS[0]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  const [joining, setJoining] = useState(false);

  /* ── media ── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* ── device lists ── */
  const [cameras, setCameras] = useState<string[]>([]);
  const [microphones, setMicrophones] = useState<string[]>([]);
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('Default Camera');
  const [selectedMic, setSelectedMic] = useState('Default Microphone');
  const [selectedSpeaker, setSelectedSpeaker] = useState('Default Speaker');

  /* ── populate name + avatar from auth ── */
  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
    if (user?.avatarUrl) setSelectedAvatarUrl(user.avatarUrl);
  }, [user]);

  /* ── enumerate devices ── */
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devs) => {
      const cams = devs.filter((d) => d.kind === 'videoinput').map((d) => d.label || 'Camera');
      const mics = devs.filter((d) => d.kind === 'audioinput').map((d) => d.label || 'Microphone');
      const spks = devs.filter((d) => d.kind === 'audiooutput').map((d) => d.label || 'Speaker');
      if (cams.length) { setCameras(cams); setSelectedCamera(cams[0]); }
      else setCameras(['Default Camera']);
      if (mics.length) { setMicrophones(mics); setSelectedMic(mics[0]); }
      else setMicrophones(['Default Microphone']);
      if (spks.length) { setSpeakers(spks); setSelectedSpeaker(spks[0]); }
      else setSpeakers(['Default Speaker']);
    }).catch(() => {
      setCameras(['Default Camera']);
      setMicrophones(['Default Microphone']);
      setSpeakers(['Default Speaker']);
    });
  }, []);

  /* ── start/stop media stream ── */
  const startStream = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraOn,
        audio: micOn,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      // silently fail — camera might be blocked
    }
  }, [cameraOn, micOn]);

  useEffect(() => {
    startStream();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startStream]);

  /* ── video track toggle ── */
  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = cameraOn; });
  }, [cameraOn]);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = micOn; });
  }, [micOn]);

  /* ── background effect ── */
  const handleEffectChange = (effect: BackgroundEffect) => {
    setActiveEffect(effect);
    setBlurLevel(effect === 'blur' ? 8 : 0);
  };

  /* ── copy meeting ID ── */
  const handleCopy = () => {
    navigator.clipboard.writeText(meetingId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ── join ── */
  const handleJoin = async (videoOverride?: boolean) => {
    const vid = videoOverride !== undefined ? videoOverride : cameraOn;
    setJoining(true);
    
    // Save updated display name and selected avatar URL to backend before redirecting
    try {
      await api.put('/users/profile', {
        name: displayName || user?.name || 'Explorer',
        avatarUrl: selectedAvatarUrl,
      });
    } catch (e) {
      console.error('Failed to sync profile before join', e);
    }
    
    streamRef.current?.getTracks().forEach((t) => t.stop());
    router.push(
      `/meet/${meetingId}?video=${vid}&audio=${micOn}&blur=${blurLevel}&effect=${activeEffect}`
    );
  };

  const backgroundStyle = (): React.CSSProperties => {
    if (activeEffect === 'blur') return { filter: `blur(${blurLevel}px)` };
    if (activeEffect === 'beach') return { filter: 'saturate(1.4) brightness(1.05)' };
    if (activeEffect === 'dark-studio') return { filter: 'brightness(0.5) contrast(1.2)' };
    return {};
  };

  const effectOptions: { id: BackgroundEffect; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'blur', label: 'Blur' },
    { id: 'beach', label: 'Beach' },
    { id: 'dark-studio', label: 'Dark Studio' },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f17] flex flex-col font-outfit text-slate-200">
      
      {/* ── header ── */}
      <header className="h-16 bg-[#0f131c] border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl px-3 py-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Back</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Sync Room</span>
          <code className="text-sm font-mono text-secondary-glow bg-secondary/10 px-4 py-1.5 rounded-lg tracking-widest border border-secondary/25 shadow-sm">
            {meetingId.toUpperCase()}
          </code>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-300">{displayName || user?.name || 'Explorer'}</span>
          <div className="w-8 h-8 rounded-full border border-primary/20 overflow-hidden">
            <Avatar name={displayName || 'U'} src={selectedAvatarUrl} size="sm" />
          </div>
        </div>
      </header>

      {/* ── main content ── */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl w-full mx-auto items-center">

          {/* ── left column: video preview ── */}
          <div className="flex flex-col gap-6">
            <div
              className={`relative aspect-video bg-black/60 rounded-2xl border overflow-hidden shadow-2xl transition-all duration-300 ${
                micOn ? 'border-primary/30 ring-2 ring-primary/10' : 'border-white/5'
              }`}
            >
              {cameraOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)', ...backgroundStyle() }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <div className="w-20 h-20 rounded-full border border-white/5 overflow-hidden">
                    <Avatar name={displayName || 'U'} src={selectedAvatarUrl} size="lg" />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Video off</span>
                </div>
              )}

              {/* audio meter */}
              <AudioMeter active={micOn} />

              {/* HD Preview Label */}
              <div className="absolute top-4 left-4 glass-panel px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 border border-white/5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                HD Preview
              </div>
            </div>

            {/* Device Controls */}
            <div className="flex items-center justify-center gap-3 font-outfit">
              {/* Mic toggle */}
              <button
                onClick={() => setMicOn(!micOn)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${
                  micOn
                    ? 'bg-primary text-slate-900 border-transparent shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105'
                    : 'bg-[#1e2028] border-white/10 text-red-400 hover:bg-white/[0.03]'
                }`}
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              {/* Video toggle */}
              <button
                onClick={() => setCameraOn(!cameraOn)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${
                  cameraOn
                    ? 'bg-primary text-slate-900 border-transparent shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105'
                    : 'bg-[#1e2028] border-white/10 text-red-400 hover:bg-white/[0.03]'
                }`}
              >
                {cameraOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              {/* Settings toggle */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="w-12 h-12 rounded-full bg-[#1e2028] border border-white/10 text-slate-300 flex items-center justify-center hover:bg-white/[0.03] transition-all"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Background effects */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">
                Filter Background Effect
              </span>
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                {effectOptions.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleEffectChange(id)}
                    className={`px-4.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer border ${
                      activeEffect === id
                        ? 'bg-primary/10 border-primary/40 text-primary shadow-sm shadow-primary/5'
                        : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── right column: join setup panel ── */}
          <div className="glass-panel p-8 lg:p-10 rounded-2xl flex flex-col gap-6 shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-primary tracking-tight font-outfit">Joining the Sync</h2>
              <p className="text-xs text-slate-400">Configure your appearance parameters before entering.</p>
            </div>

            {/* Name Input */}
            <div className="space-y-2 font-outfit">
              <label className="text-xs font-bold text-slate-350">What's your name?</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name..."
                className="w-full bg-[#0b0f17]/50 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-secondary transition-all"
              />
            </div>

            {/* Avatar presets grid */}
            <div className="space-y-3 font-outfit">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-slate-350">Pick an identity</label>
                <button 
                  onClick={() => setSelectedAvatarUrl(PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)])}
                  className="text-secondary text-xs hover:underline transition-all font-semibold"
                >
                  Shuffle
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2.5">
                {PRESET_AVATARS.map((url, i) => {
                  const isSelected = selectedAvatarUrl === url;
                  return (
                    <div 
                      key={i}
                      onClick={() => setSelectedAvatarUrl(url)}
                      className={`aspect-square rounded-xl cursor-pointer overflow-hidden transition-all hover:scale-105 ${
                        isSelected 
                          ? 'border-2 border-primary ring-4 ring-primary/20 scale-105' 
                          : 'border border-white/10 hover:border-secondary'
                      }`}
                    >
                      <img alt={`Preset ${i}`} className="w-full h-full bg-slate-900 object-cover" src={url} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Copy sync room ID info */}
            <div className="flex flex-col gap-2 bg-black/10 border border-white/5 rounded-xl p-3.5 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Share Room Link</span>
                <button
                  onClick={handleCopy}
                  className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
              <code className="text-xs font-mono text-slate-350 tracking-wider select-all select-none">{meetingId.toUpperCase()}</code>
            </div>

            {/* Join button */}
            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
              <button
                onClick={() => handleJoin()}
                disabled={joining || !displayName.trim()}
                className="w-full py-4 bg-primary hover:bg-[#059669] disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg emerald-glow active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>{joining ? 'Entering Room...' : 'Enter Call'}</span>
              </button>

              <button
                onClick={() => handleJoin(false)}
                disabled={joining || !displayName.trim()}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors py-1 block cursor-pointer"
              >
                Enter without video
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ── device settings slide panel ── */}
      <>
        {/* backdrop */}
        <div
          className={`fixed inset-0 bg-black/60 z-35 transition-opacity duration-300 ${
            settingsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setSettingsOpen(false)}
        />

        {/* panel */}
        <aside
          className={`fixed right-0 top-0 h-screen w-80 bg-[#111827] border-l border-white/10 z-40 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out font-outfit ${
            settingsOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* panel header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2.5">
              <SettingsIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-slate-100">Audio &amp; Video Devices</span>
            </div>
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg p-1.5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* panel content */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Video Inputs
              </span>
              <CustomDropdown
                label="Camera Input"
                value={selectedCamera}
                options={cameras}
                onChange={setSelectedCamera}
              />
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Audio Inputs/Outputs
              </span>
              <CustomDropdown
                label="Microphone Source"
                value={selectedMic}
                options={microphones}
                onChange={setSelectedMic}
              />
              <CustomDropdown
                label="Speaker Output"
                value={selectedSpeaker}
                options={speakers}
                onChange={setSelectedSpeaker}
              />
            </div>

            <div className="h-px bg-white/5" />

            {/* noise cancellation toggle */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-200">Noise Suppression</span>
                <span className="text-[10px] text-slate-500">Filter environmental background noise</span>
              </div>
              <button
                onClick={() => setNoiseCancellation(!noiseCancellation)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                  noiseCancellation ? 'bg-primary' : 'bg-white/10'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    noiseCancellation ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="p-5 border-t border-white/5 shrink-0">
            <button
              onClick={() => setSettingsOpen(false)}
              className="w-full py-3 bg-primary hover:bg-[#059669] text-slate-950 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Apply Settings
            </button>
          </div>
        </aside>
      </>
    </div>
  );
}
