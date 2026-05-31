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
  Copy,
  Check,
  X,
  ChevronDown,
  Sliders
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

type BackgroundEffect = 'none' | 'blur' | 'beach' | 'dark-studio';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80'
];

interface DeviceOption {
  id: string;
  label: string;
}

interface CustomDropdownProps {
  label: string;
  value: string; // The display label of the active device
  options: DeviceOption[];
  onChange: (id: string) => void;
}

// Custom dropdown with glassmorphic slate styling
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
    <div className="flex flex-col gap-1.5 w-full select-none" ref={ref}>
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between bg-slate-900/60 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none hover:border-slate-800 transition-colors cursor-pointer select-none"
        >
          <span className="truncate text-left font-semibold">{value || 'Select device'}</span>
          <ChevronDown
            className={cn("w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200", open && "rotate-180")}
          />
        </button>
        {open && (
          <div className="absolute z-50 top-full mt-1.5 w-full bg-slate-900 border border-slate-850 rounded-xl shadow-2xl overflow-hidden max-h-40 overflow-y-auto backdrop-blur-md">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 italic">No devices found</div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-xs transition-colors cursor-pointer block select-none border-b border-slate-850/20 last:border-0",
                    opt.label === value
                      ? "bg-cyan-500/10 text-cyan-400 font-bold"
                      : "text-slate-350 hover:bg-slate-855"
                  )}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Active dynamic audio volume meter using real mic amplitude
function AudioMeter({ active, level }: { active: boolean; level: number }) {
  const barLevels = [
    level * 0.7,
    level * 1.2,
    level * 1.5,
    level * 0.9,
    level * 0.6
  ];

  return (
    <div className="absolute bottom-4 left-4 flex items-end gap-1.5 z-10 bg-slate-950/65 px-3 py-2 rounded-full border border-slate-850/60 backdrop-blur-md shadow-2xl">
      {barLevels.map((lvl, i) => {
        const val = active ? Math.min(1, Math.max(0.05, lvl)) : 0.05;
        return (
          <div
            key={i}
            className="w-0.5 rounded-full transition-all duration-75"
            style={{
              height: `${Math.max(4, val * 18)}px`,
              backgroundColor: active ? '#00f0ff' : '#475569',
              boxShadow: active ? '0 0 8px rgba(6,182,212,0.5)' : 'none',
              opacity: active ? 0.95 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
}

export default function GreenRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const meetingId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  // Device toggles & settings
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [activeEffect, setActiveEffect] = useState<BackgroundEffect>('none');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(PRESET_AVATARS[0]);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  const [joining, setJoining] = useState(false);

  // Hardware Lists
  const [cameras, setCameras] = useState<DeviceOption[]>([]);
  const [microphones, setMicrophones] = useState<DeviceOption[]>([]);
  const [speakers, setSpeakers] = useState<DeviceOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [selectedMicId, setSelectedMicId] = useState('');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('');

  // Media references
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio analyser refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [micLevel, setMicLevel] = useState<number>(0);

  // Hydrate user profile details
  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
    if (user?.avatarUrl) setSelectedAvatarUrl(user.avatarUrl);
  }, [user]);

  // Load hardware media devices
  const updateDeviceList = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoDevs = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          id: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }));
        
      const audioInDevs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, index) => ({
          id: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
        }));
        
      const audioOutDevs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d, index) => ({
          id: d.deviceId,
          label: d.label || `Speaker ${index + 1}`,
        }));

      setCameras(videoDevs);
      setMicrophones(audioInDevs);
      setSpeakers(audioOutDevs);

      // Bind defaults if not set
      if (videoDevs.length > 0 && !selectedCameraId) setSelectedCameraId(videoDevs[0].id);
      if (audioInDevs.length > 0 && !selectedMicId) setSelectedMicId(audioInDevs[0].id);
      if (audioOutDevs.length > 0 && !selectedSpeakerId) setSelectedSpeakerId(audioOutDevs[0].id);
    } catch (e) {
      console.error('Error listing hardware devices:', e);
    }
  }, [selectedCameraId, selectedMicId, selectedSpeakerId]);

  // Cleanup audio analyzing nodes
  const stopAudioAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicLevel(0);
  };

  // Start audio voice analyzing
  const startAudioAnalyser = (stream: MediaStream) => {
    stopAudioAnalyser();

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0 || !micOn) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      audioSourceRef.current = source;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Map average (0 - 255) to volume (0 - 1)
        const mapped = Math.min(1, average / 60);
        setMicLevel(mapped);
        
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Web Audio API analysis blocked or failed:', e);
    }
  };

  // Start media stream
  const startStream = useCallback(async () => {
    stopAudioAnalyser();
    
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      
      if (cameraOn || micOn) {
        const constraints: MediaStreamConstraints = {
          video: cameraOn
            ? {
                deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : false,
          audio: micOn
            ? {
                deviceId: selectedMicId ? { exact: selectedMicId } : undefined,
                echoCancellation: true,
                noiseSuppression: noiseCancellation,
              }
            : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (cameraOn && videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        if (micOn) {
          startAudioAnalyser(stream);
        }

        // Re-enumerate to get labeled devices
        await updateDeviceList();
      } else {
        streamRef.current = null;
      }
    } catch (err) {
      console.warn('Webcam/Mic hardware streaming permission denied or unavailable:', err);
      streamRef.current = null;
    }
  }, [cameraOn, micOn, selectedCameraId, selectedMicId, noiseCancellation, updateDeviceList]);

  // Init and sync streams
  useEffect(() => {
    startStream();
    return () => {
      stopAudioAnalyser();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startStream]);

  // Background style filters
  const backgroundStyle = (): React.CSSProperties => {
    if (activeEffect === 'blur') return { filter: 'blur(10px)' };
    if (activeEffect === 'beach') return { filter: 'saturate(1.3) contrast(1.05)' };
    if (activeEffect === 'dark-studio') return { filter: 'brightness(0.65) contrast(1.15)' };
    return {};
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/meet/preview/${meetingId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleJoinCall = async (videoOverride?: boolean) => {
    const vid = videoOverride !== undefined ? videoOverride : cameraOn;
    setJoining(true);

    try {
      await api.put('/users/profile', {
        name: displayName || user?.name || 'Explorer',
        avatarUrl: selectedAvatarUrl,
      });
    } catch (e) {
      console.error('Failed to sync profile before call entry', e);
    }

    stopAudioAnalyser();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    router.push(
      `/meet/${meetingId}?video=${vid}&audio=${micOn}&blur=${activeEffect === 'blur' ? 10 : 0}&effect=${activeEffect}&camId=${selectedCameraId}&micId=${selectedMicId}&speakerId=${selectedSpeakerId}`
    );
  };

  // Label resolvers
  const activeCameraLabel = cameras.find((c) => c.id === selectedCameraId)?.label || 'Default Camera';
  const activeMicLabel = microphones.find((m) => m.id === selectedMicId)?.label || 'Default Microphone';
  const activeSpeakerLabel = speakers.find((s) => s.id === selectedSpeakerId)?.label || 'Default Speaker';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-outfit text-slate-200 select-none overflow-hidden relative">
      
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[130px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[380px] h-[380px] bg-cyan-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

      {/* Header Panel */}
      <header className="h-16 bg-slate-905/30 backdrop-blur-md border-b border-slate-900 flex items-center justify-between px-6 shrink-0 z-20">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-slate-450 hover:text-slate-200 border border-transparent hover:border-slate-850 hover:bg-slate-900 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer text-xs font-bold uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-505 uppercase tracking-widest font-black hidden sm:inline">Sync Room</span>
          <code className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-4 py-2 rounded-xl tracking-widest border border-cyan-500/15 shadow-inner uppercase">
            {meetingId}
          </code>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-900 py-1.5 pl-3.5 pr-2 rounded-full shrink-0">
          <span className="text-xs font-bold text-slate-350">{displayName || user?.name || 'Explorer'}</span>
          <Avatar name={displayName || 'U'} src={selectedAvatarUrl} size="sm" className="border border-slate-700" />
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 flex items-center justify-center p-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-5xl w-full mx-auto items-center">

          {/* LEFT SECTION: 16:9 Media Preview & Devices Controls */}
          <div className="lg:col-span-7 flex flex-col gap-6 w-full">
            <div
              className={cn(
                "relative aspect-video bg-[#0c0f17] border rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ring-offset-2 ring-offset-slate-955",
                micOn ? "border-cyan-500/30 ring-2 ring-cyan-500/10" : "border-slate-900"
              )}
            >
              {cameraOn && streamRef.current ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover select-none"
                  style={{ transform: 'scaleX(-1)', ...backgroundStyle() }}
                />
              ) : (
                /* Premium illustrated camera off state */
                <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-950 select-none">
                  {/* Glowing user avatar ring */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl scale-75 animate-pulse" />
                    <div className="w-20 h-20 rounded-full border border-slate-800 bg-slate-900/60 flex items-center justify-center shadow-2xl relative z-10">
                      <Avatar name={displayName || 'U'} src={selectedAvatarUrl} size="lg" className="border border-slate-750" />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">Camera is off</span>
                </div>
              )}

              {/* Dynamic volume mic levels indicator */}
              <AudioMeter active={micOn} level={micLevel} />

              {/* HD Preview tag */}
              <div className="absolute top-4 left-4 backdrop-blur-xl bg-slate-905/60 border border-slate-800/80 px-3 py-1 rounded-full text-[9px] uppercase font-black tracking-widest flex items-center gap-1.5 select-none">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_6px_#00f0ff]" />
                HD Preview
              </div>
            </div>

            {/* Mic and Camera quick toggle deck */}
            <div className="flex items-center justify-center gap-4">
              
              {/* Mic toggle */}
              <button
                onClick={() => setMicOn(!micOn)}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 border cursor-pointer",
                  micOn
                    ? "bg-cyan-500 text-slate-955 border-transparent shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-[1.03]"
                    : "bg-slate-900 border-slate-850 text-rose-400 hover:bg-slate-850 hover:text-rose-350"
                )}
                title={micOn ? "Mute Microphone" : "Unmute Microphone"}
              >
                {micOn ? <Mic className="w-5 h-5 stroke-[2.5]" /> : <MicOff className="w-5 h-5" />}
              </button>

              {/* Camera toggle */}
              <button
                onClick={() => setCameraOn(!cameraOn)}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 border cursor-pointer",
                  cameraOn
                    ? "bg-cyan-500 text-slate-955 border-transparent shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-[1.03]"
                    : "bg-slate-900 border-slate-850 text-rose-400 hover:bg-slate-850 hover:text-rose-350"
                )}
                title={cameraOn ? "Disable Camera" : "Enable Camera"}
              >
                {cameraOn ? <VideoIcon className="w-5 h-5 stroke-[2.5]" /> : <VideoOff className="w-5 h-5" />}
              </button>

              {/* Device properties sliders modal toggle */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-850 text-slate-400 flex items-center justify-center hover:bg-slate-850 hover:text-slate-205 transition-all cursor-pointer"
                title="Device Settings"
              >
                <Sliders className="w-5 h-5" />
              </button>
            </div>

            {/* Background filters row selector */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">
                Filter Background Effect
              </span>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {([
                  { id: 'none', label: 'None' },
                  { id: 'blur', label: 'Blur background' },
                  { id: 'beach', label: 'Sunset Beach' },
                  { id: 'dark-studio', label: 'Cinematic Studio' }
                ] as const).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveEffect(id)}
                    className={cn(
                      "px-4.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-250 cursor-pointer border",
                      activeEffect === id
                        ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                        : "bg-slate-900/40 border-slate-850 text-slate-500 hover:text-slate-300 hover:bg-slate-850/50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SECTION: Join options, Display name input, presets */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900/30 to-slate-955 border border-slate-900 p-8 rounded-3xl flex flex-col gap-6 shadow-2xl relative overflow-hidden w-full">
            <div className="absolute -top-24 -right-24 w-60 h-64 bg-cyan-500/5 blur-[90px] rounded-full pointer-events-none" />
            
            <div className="space-y-1 select-none">
              <h2 className="text-base font-black text-cyan-400 uppercase tracking-widest font-outfit">Join Session</h2>
              <p className="text-xs text-slate-505 leading-relaxed">Configure your caller identity details prior to entering.</p>
            </div>

            {/* Display Name Input */}
            <div className="space-y-2 select-none">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Your Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter screen name..."
                className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/50 rounded-xl py-3 px-4 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-all font-outfit"
              />
            </div>

            {/* Avatars identity presets */}
            <div className="space-y-3 select-none">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Identity Avatar</label>
                <button 
                  onClick={() => setSelectedAvatarUrl(PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)])}
                  className="text-cyan-455 hover:text-cyan-350 text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Shuffle
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((url, i) => {
                  const isSelected = selectedAvatarUrl === url;
                  return (
                    <div 
                      key={i}
                      onClick={() => setSelectedAvatarUrl(url)}
                      className={cn(
                        "aspect-square rounded-xl cursor-pointer overflow-hidden transition-all hover:scale-105 border",
                        isSelected 
                          ? "border-cyan-400 ring-2 ring-cyan-500/20 scale-105 shadow-[0_0_12px_rgba(6,182,212,0.15)]" 
                          : "border-slate-850 hover:border-slate-700"
                      )}
                    >
                      <img alt={`Preset ${i}`} className="w-full h-full bg-slate-900 object-cover" src={url} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Share link snippet card */}
            <div className="flex flex-col gap-2 bg-slate-950/60 border border-slate-900 rounded-xl p-4 mt-1 select-none">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Share Room Link</span>
                <button
                  onClick={handleCopyLink}
                  className="text-slate-400 hover:text-slate-205 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
              <code className="text-xs font-mono text-slate-400 tracking-wider select-all break-all leading-relaxed bg-slate-905/30 px-3 py-2 rounded-lg border border-slate-900 mt-1 select-none">
                {window.location.origin}/meet/preview/{meetingId}
              </code>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-4 border-t border-slate-905 space-y-3">
              <button
                onClick={() => handleJoinCall()}
                disabled={joining || !displayName.trim()}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 via-cyan-505 to-indigo-500 hover:from-cyan-550 hover:to-indigo-455 disabled:opacity-50 text-slate-955 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>{joining ? 'Entering Room...' : 'Join Now'}</span>
              </button>

              <button
                onClick={() => handleJoinCall(false)}
                disabled={joining || !displayName.trim()}
                className="w-full py-3 bg-transparent border border-slate-850 hover:border-slate-750 text-slate-450 hover:text-slate-250 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Present Only
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ── SETTINGS SLIDE OVER OVERLAY PANEL ── */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex select-none">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setSettingsOpen(false)}
          />

          {/* Panel */}
          <aside className="absolute right-0 top-0 h-screen w-80 bg-[#0c101a] border-l border-slate-900 z-40 flex flex-col shadow-2xl animate-fadeIn font-outfit select-none">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-900 shrink-0">
              <div className="flex items-center gap-2.5">
                <SettingsIcon className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-250">Device Configuration</span>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-slate-500 hover:text-slate-200 hover:bg-slate-900 rounded-lg p-1.5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form list scroll area */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
              
              {/* Cameras */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Video Inputs</span>
                <CustomDropdown
                  label="Camera Device"
                  value={activeCameraLabel}
                  options={cameras}
                  onChange={setSelectedCameraId}
                />
              </div>

              <div className="h-px bg-slate-900" />

              {/* Mic & Speakers */}
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Audio Inputs/Outputs</span>
                <CustomDropdown
                  label="Microphone input source"
                  value={activeMicLabel}
                  options={microphones}
                  onChange={setSelectedMicId}
                />
                <CustomDropdown
                  label="Speaker audio output"
                  value={activeSpeakerLabel}
                  options={speakers}
                  onChange={setSelectedSpeakerId}
                />
              </div>

              <div className="h-px bg-slate-900" />

              {/* Noise suppression trigger toggle */}
              <div className="flex items-center justify-between select-none">
                <div className="flex flex-col gap-0.5 text-left leading-tight">
                  <span className="text-xs font-bold text-slate-200">Noise Suppression</span>
                  <span className="text-[9px] text-slate-505">Filter environmental background echoes</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNoiseCancellation(!noiseCancellation)}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-colors duration-250 cursor-pointer border-transparent",
                    noiseCancellation ? "bg-cyan-500" : "bg-slate-850"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 w-5 h-5 bg-slate-950 border border-slate-900 rounded-full shadow transition-transform duration-200",
                      noiseCancellation ? "translate-x-5 border-cyan-500" : "translate-x-0.5 border-slate-800"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Bottom action trigger */}
            <div className="p-5 border-t border-slate-900 shrink-0">
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-slate-955 font-black rounded-xl text-xs uppercase tracking-widest transition-colors cursor-pointer"
              >
                Apply Devices
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
