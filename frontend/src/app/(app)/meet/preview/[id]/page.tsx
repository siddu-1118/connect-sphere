'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  Monitor,
  Copy,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';

/* ─────────────────────────── types ─────────────────────────── */
type BackgroundEffect = 'none' | 'blur' | 'beach' | 'dark-studio';

interface CustomDropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

interface AudioDevice {
  deviceId: string;
  label: string;
}

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
    <div className="flex flex-col gap-1" ref={ref}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none hover:border-white/10 transition-colors cursor-pointer"
        >
          <span className="truncate text-left">{value || 'Select device'}</span>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open && (
          <div className="absolute z-50 top-full mt-1 w-full bg-[#1e1e35] border border-white/[0.06] rounded-xl shadow-2xl overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors cursor-pointer ${
                  opt === value
                    ? 'bg-[#5B5FC7]/20 text-[#818cf8]'
                    : 'text-slate-300 hover:bg-white/[0.04]'
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
    <div className="absolute bottom-3 left-3 flex items-end gap-0.5 z-10">
      {levels.map((lvl, i) => (
        <div
          key={i}
          className="w-1 rounded-full transition-all duration-100"
          style={{
            height: `${Math.max(4, lvl * 20)}px`,
            backgroundColor: active ? '#2D8CFF' : '#475569',
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(true);

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

  /* ── populate name from auth ── */
  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, micOn]);

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
  const handleJoin = (videoOverride?: boolean) => {
    const vid = videoOverride !== undefined ? videoOverride : cameraOn;
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

  const userName = user?.name ?? 'Guest';

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      {/* ── header ── */}
      <header className="h-14 bg-[#141422] border-b border-white/[0.06] flex items-center justify-between px-4 shrink-0 z-20">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl px-3 py-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Meeting</span>
          <code className="text-sm font-mono text-[#818cf8] bg-[#5B5FC7]/10 px-3 py-1 rounded-lg tracking-widest border border-[#5B5FC7]/20">
            {meetingId}
          </code>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-sm text-slate-300">{userName}</span>
          <Avatar name={userName} src={user?.avatarUrl ?? null} size="sm" />
        </div>
      </header>

      {/* ── main content ── */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="flex gap-12 max-w-4xl w-full mx-auto items-start">

          {/* ── left column: video preview ── */}
          <div className="flex-1 max-w-lg flex flex-col gap-4">
            {/* video container */}
            <div
              className={`relative aspect-video bg-[#0d0d1a] rounded-3xl border overflow-hidden shadow-2xl transition-all duration-300 ${
                micOn
                  ? 'border-[#2D8CFF]/30 ring-2 ring-[#2D8CFF]/20'
                  : 'border-white/10'
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
                  <Avatar name={userName} src={user?.avatarUrl ?? null} size="xl" />
                  <span className="text-xs text-slate-500 font-medium">Camera off</span>
                </div>
              )}

              {/* audio meter */}
              <AudioMeter active={micOn} />

              {/* name tag */}
              <div className="absolute bottom-2 right-3 bg-black/50 rounded-lg px-2 py-0.5">
                <span className="text-[11px] text-white font-medium">{userName} (You)</span>
              </div>
            </div>

            {/* device controls */}
            <div className="flex items-center justify-center gap-3">
              {/* mic */}
              <button
                onClick={() => setMicOn(!micOn)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer border ${
                  micOn
                    ? 'bg-[#252540] border-white/[0.06] text-slate-200 hover:bg-[#2a2a4a]'
                    : 'bg-red-600 border-red-500 text-white hover:bg-red-700'
                }`}
              >
                {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                <span>{micOn ? 'Mute' : 'Unmute'}</span>
              </button>

              {/* camera */}
              <button
                onClick={() => setCameraOn(!cameraOn)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer border ${
                  cameraOn
                    ? 'bg-[#252540] border-white/[0.06] text-slate-200 hover:bg-[#2a2a4a]'
                    : 'bg-red-600 border-red-500 text-white hover:bg-red-700'
                }`}
              >
                {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                <span>{cameraOn ? 'Stop Video' : 'Start Video'}</span>
              </button>

              {/* settings */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#252540] border border-white/[0.06] text-slate-200 hover:bg-[#2a2a4a] transition-all duration-200 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>

            {/* background effects */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 text-center">
                Background
              </span>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {effectOptions.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleEffectChange(id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer border ${
                      activeEffect === id
                        ? 'bg-[#5B5FC7]/20 border-[#5B5FC7]/40 text-[#818cf8]'
                        : 'bg-white/5 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── right column: join panel ── */}
          <div className="w-80 bg-[#252540] rounded-3xl p-8 border border-white/[0.06] shadow-2xl flex flex-col gap-5 shrink-0">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-slate-100">Ready to join?</h1>
              <p className="text-xs text-slate-500">Configure your audio and video, then join.</p>
            </div>

            {/* meeting ID */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Meeting ID</span>
              <div className="flex items-center gap-2 bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2.5">
                <code className="flex-1 font-mono text-sm text-[#818cf8] tracking-widest">{meetingId}</code>
                <button
                  onClick={handleCopy}
                  className="text-slate-500 hover:text-slate-200 transition-colors cursor-pointer p-0.5"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* name field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Your name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name..."
                className="bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-[#5B5FC7]/50 transition-colors"
              />
            </div>

            <div className="flex-1" />

            {/* join button */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleJoin()}
                className="w-full flex items-center justify-center gap-2.5 py-4 bg-[#2D8CFF] hover:bg-[#1a7ae8] text-white font-bold rounded-2xl shadow-lg transition-all duration-200 cursor-pointer"
                style={{ boxShadow: '0 8px 30px rgba(45,140,255,0.35)' }}
              >
                <Video className="w-5 h-5" />
                <span>Join Now</span>
              </button>

              <button
                onClick={() => handleJoin(false)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer py-1"
              >
                Join without video
              </button>
            </div>

            {/* divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-xs text-slate-600 font-medium">or</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* present only */}
            <button className="w-full flex items-center justify-center gap-2 py-2.5 border border-white/[0.06] text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer">
              <Monitor className="w-4 h-4" />
              <span>Present Only</span>
            </button>
          </div>
        </div>
      </main>

      {/* ── device settings slide panel ── */}
      <>
        {/* backdrop */}
        <div
          className={`fixed inset-0 bg-black/40 z-30 transition-opacity duration-300 ${
            settingsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setSettingsOpen(false)}
        />

        {/* panel */}
        <aside
          className={`fixed right-0 top-0 h-screen w-80 bg-[#1a1a2e] border-l border-white/[0.06] z-40 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
            settingsOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* panel header */}
          <div className="h-14 flex items-center justify-between px-5 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-[#818cf8]" />
              <span className="text-sm font-semibold text-slate-100">Audio &amp; Video</span>
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
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                Video
              </span>
              <CustomDropdown
                label="Camera"
                value={selectedCamera}
                options={cameras}
                onChange={setSelectedCamera}
              />
            </div>

            <div className="h-px bg-white/[0.06]" />

            <div className="flex flex-col gap-4">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Audio
              </span>
              <CustomDropdown
                label="Microphone"
                value={selectedMic}
                options={microphones}
                onChange={setSelectedMic}
              />
              <CustomDropdown
                label="Speaker"
                value={selectedSpeaker}
                options={speakers}
                onChange={setSelectedSpeaker}
              />
              <button className="w-full flex items-center justify-center gap-2 py-2.5 border border-white/[0.06] text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer">
                <span>Test Speaker</span>
              </button>
            </div>

            <div className="h-px bg-white/[0.06]" />

            {/* noise cancellation toggle */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-slate-200 font-medium">Noise cancellation</span>
                <span className="text-[11px] text-slate-500">Filter background noise</span>
              </div>
              <button
                onClick={() => setNoiseCancellation(!noiseCancellation)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                  noiseCancellation ? 'bg-[#5B5FC7]' : 'bg-white/10'
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

          <div className="p-5 border-t border-white/[0.06] shrink-0">
            <button
              onClick={() => setSettingsOpen(false)}
              className="w-full py-2.5 bg-[#5B5FC7] hover:bg-[#4f52b2] text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </aside>
      </>
    </div>
  );
}
