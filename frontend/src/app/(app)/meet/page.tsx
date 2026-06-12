'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, Mic, MicOff, VideoOff, Monitor, Settings, RefreshCw, 
  Sparkles, Shield, Volume2, Camera, ShieldAlert, Check
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function MeetSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Settings states
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  const [echoReduction, setEchoReduction] = useState(true);
  const [hdVideo, setHdVideo] = useState(false);

  // Local camera stream preview
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  // Device selections
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [selectedCam, setSelectedCam] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');

  // Request camera/mic stream
  const startPreview = async () => {
    if (!cameraOn) {
      stopPreview();
      return;
    }

    setLoadingStream(true);
    setPermissionError(false);
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: selectedCam ? { deviceId: { exact: selectedCam } } : true,
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Media devices preview access error:', err);
      setPermissionError(true);
    } finally {
      setLoadingStream(false);
    }
  };

  const stopPreview = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Load available devices
  const loadDevices = async () => {
    try {
      // Prompt permission first to populate labels
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(s => {
        s.getTracks().forEach(t => t.stop());
      }).catch(() => {});

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const audioInputDevices = devices.filter(d => d.kind === 'audioinput');
      const audioOutputDevices = devices.filter(d => d.kind === 'audiooutput');

      setCameras(videoDevices);
      setMicrophones(audioInputDevices);
      setSpeakers(audioOutputDevices);

      if (videoDevices.length > 0 && !selectedCam) setSelectedCam(videoDevices[0].deviceId);
      if (audioInputDevices.length > 0 && !selectedMic) setSelectedMic(audioInputDevices[0].deviceId);
      if (audioOutputDevices.length > 0 && !selectedSpeaker) setSelectedSpeaker(audioOutputDevices[0].deviceId);
    } catch (err) {
      console.error('Enumerate devices error:', err);
    }
  };

  useEffect(() => {
    loadDevices();
    return () => stopPreview();
  }, []);

  useEffect(() => {
    startPreview();
  }, [cameraOn, selectedCam, selectedMic]);

  const handleJoin = () => {
    stopPreview();
    const code = Math.random().toString(36).slice(2, 11);
    router.push(`/meet/${code}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-800 overflow-hidden font-outfit relative">
      {/* Background decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[380px] h-[380px] bg-indigo-500/2 rounded-full blur-[130px] -z-10 pointer-events-none" />

      {/* Top App Bar */}
      <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-white border-b border-slate-100 z-10 select-none shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-605">
            <Video className="w-4 h-4 text-indigo-600" />
          </div>
          <h1 className="text-sm font-black text-slate-700 uppercase tracking-widest">Meet & Screen Share</h1>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-full py-1.5 pl-3 pr-1.5 select-none shrink-0">
          <p className="text-xs font-bold text-slate-700 hidden sm:block">{user?.name ?? 'Explorer'}</p>
          <Avatar name={user?.name ?? 'U'} src={user?.avatarUrl} size="sm" className="border border-indigo-500/25 shadow-sm" />
        </div>
      </header>

      {/* Meet Panels */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 md:p-8 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Left Panel: Camera Feed container */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="flex-1 bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-sm flex flex-col relative aspect-video lg:aspect-auto">
            {cameraOn ? (
              permissionError ? (
                <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center text-center p-8 text-slate-300">
                  <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
                  <h3 className="font-bold text-sm">Camera Access Denied</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-[280px]">Please enable system camera permissions to view your live preview feed.</p>
                </div>
              ) : (
                <div className="flex-1 bg-slate-900 relative">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 backdrop-blur-md bg-slate-950/65 px-3 py-1.5 border border-white/10 rounded-xl text-white text-xs font-medium">
                    {user?.name ?? 'You'}
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center p-8 text-slate-300">
                <Avatar name={user?.name ?? 'You'} src={user?.avatarUrl} size="xl" className="border-4 border-slate-800 scale-110 mb-4" />
                <h3 className="font-bold text-sm">{user?.name ?? 'Aero User'}</h3>
                <span className="text-xs text-slate-500 mt-1 uppercase tracking-wider flex items-center gap-1">
                  <VideoOff size={12} className="text-rose-500" /> Camera off
                </span>
              </div>
            )}

            {/* Video Controls Overlay */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center gap-4 shrink-0">
              <button 
                onClick={() => setMicOn(!micOn)}
                className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${
                  micOn 
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' 
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                }`}
                title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <button 
                onClick={() => setCameraOn(!cameraOn)}
                className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${
                  cameraOn 
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' 
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                }`}
                title={cameraOn ? 'Stop Camera' : 'Start Camera'}
              >
                {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>

              <button 
                onClick={() => setSharing(!sharing)}
                className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${
                  sharing 
                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title={sharing ? 'Stop Presenting' : 'Present Screen'}
              >
                <Monitor size={18} />
              </button>
            </div>
          </div>

          {/* Join CTA */}
          <button 
            onClick={handleJoin}
            className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-indigo-605/20 flex items-center justify-center gap-2 border-0 cursor-pointer w-full"
          >
            <Video size={16} className="stroke-[2.5]" /> Join collaborative room
          </button>
        </div>

        {/* Right Panel: Settings card */}
        <div className="w-full lg:w-96 shrink-0 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col gap-6 text-left">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Meet Settings</h2>
            <h3 className="text-base font-black text-slate-800 leading-tight">Device Selection</h3>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Device selectors */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest flex items-center gap-1.5">
                <Camera size={13} className="text-slate-400" /> Camera input
              </label>
              <select
                value={selectedCam}
                onChange={e => setSelectedCam(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-500 font-outfit"
              >
                {cameras.length === 0 ? (
                  <option value="">Default system camera</option>
                ) : (
                  cameras.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label || 'Webcam'}</option>)
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest flex items-center gap-1.5">
                <Mic size={13} className="text-slate-400" /> Microphone input
              </label>
              <select
                value={selectedMic}
                onChange={e => setSelectedMic(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-500 font-outfit"
              >
                {microphones.length === 0 ? (
                  <option value="">Default microphone</option>
                ) : (
                  microphones.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label || 'Microphone'}</option>)
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-555 uppercase tracking-widest flex items-center gap-1.5">
                <Volume2 size={13} className="text-slate-400" /> Audio speakers
              </label>
              <select
                value={selectedSpeaker}
                onChange={e => setSelectedSpeaker(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-500 font-outfit"
              >
                {speakers.length === 0 ? (
                  <option value="">Default speakers</option>
                ) : (
                  speakers.map(s => <option key={s.deviceId} value={s.deviceId}>{s.label || 'Speakers'}</option>)
                )}
              </select>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Enhancement switches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="leading-tight text-left">
                <p className="text-xs font-bold text-slate-750">Noise Cancellation</p>
                <span className="text-[10px] text-slate-455">Dampens static background hums</span>
              </div>
              <button 
                onClick={() => setNoiseCancellation(!noiseCancellation)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${noiseCancellation ? 'bg-indigo-650' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-transform ${noiseCancellation ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="leading-tight text-left">
                <p className="text-xs font-bold text-slate-750">Echo Reduction</p>
                <span className="text-[10px] text-slate-455">Prevents loops and audio feedback</span>
              </div>
              <button 
                onClick={() => setEchoReduction(!echoReduction)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${echoReduction ? 'bg-indigo-650' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-transform ${echoReduction ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="leading-tight text-left">
                <p className="text-xs font-bold text-slate-750">HD Video Broadcast</p>
                <span className="text-[10px] text-slate-455">Streams at 720p HD quality</span>
              </div>
              <button 
                onClick={() => setHdVideo(!hdVideo)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${hdVideo ? 'bg-indigo-650' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-transform ${hdVideo ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
