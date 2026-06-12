'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  User,
  Bell,
  Headphones,
  Sparkles,
  Shield,
  Eye,
  Info,
  Check,
  ChevronDown,
  Camera,
  Mic,
  Speaker,
  RefreshCw,
  ExternalLink,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsCategory =
  | 'general'
  | 'profile'
  | 'notifications'
  | 'audio-video'
  | 'background'
  | 'privacy'
  | 'accessibility'
  | 'about';

// ─── Reusable: ToggleSwitch ───────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 cursor-pointer shrink-0 focus:outline-none ${
        checked ? 'bg-indigo-600' : 'bg-slate-200'
      }`}
      style={{ height: '22px', width: '40px' }}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ─── Reusable: SettingsSelect ────────────────────────────────────────────────

interface SelectOption {
  value: string;
  label: string;
}

function SettingsSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative w-48">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors shadow-xs"
      >
        <span className="truncate">{current?.label ?? value}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden z-50">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors cursor-pointer text-left ${
                opt.value === value
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reusable: SettingsRow ────────────────────────────────────────────────────

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">{title}</h3>
  );
}

// ─── Custom Blur Slider ───────────────────────────────────────────────────────

function BlurSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const calcValue = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return value;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pct * 20);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    onChange(calcValue(e.clientX));
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragging.current) onChange(calcValue(e.clientX));
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  });

  const pct = (value / 20) * 100;

  return (
    <div className="flex items-center gap-3">
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        className="relative flex-1 h-1.5 bg-slate-100 rounded-full cursor-pointer group"
      >
        <div
          className="absolute inset-y-0 left-0 bg-indigo-600 rounded-full"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow border-2 border-indigo-650 group-hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-10 text-right">{value}px</span>
    </div>
  );
}

// ─── Nav Categories ───────────────────────────────────────────────────────────

const NAV_ITEMS: {
  id: SettingsCategory;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'audio-video', label: 'Audio & Video', icon: Headphones },
  { id: 'background', label: 'Background & Effects', icon: Sparkles },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'accessibility', label: 'Accessibility', icon: Eye },
  { id: 'about', label: 'About', icon: Info },
];

// ─── Panel: General ──────────────────────────────────────────────────────────

function GeneralPanel() {
  const [language, setLanguage] = useState('en');
  const [timeFormat, setTimeFormat] = useState('12');
  const [darkMode] = useState(false);
  const [startOnLogin, setStartOnLogin] = useState(false);

  return (
    <div>
      <SectionHeader title="General" />
      <div className="bg-white border border-slate-200 rounded-2xl px-4 divide-y divide-slate-100 shadow-xs">
        <SettingsRow label="App Language" description="Choose your preferred interface language.">
          <SettingsSelect
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
              { value: 'ja', label: 'Japanese' },
            ]}
          />
        </SettingsRow>

        <SettingsRow label="Time Format" description="How times appear across the app.">
          <SettingsSelect
            value={timeFormat}
            onChange={setTimeFormat}
            options={[
              { value: '12', label: '12-hour (AM/PM)' },
              { value: '24', label: '24-hour' },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label="Theme"
          description="AeroMeet uses a light theme for optimal focus and clarity."
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Light</span>
            <ToggleSwitch checked={darkMode} onChange={() => {}} />
          </div>
        </SettingsRow>

        <SettingsRow
          label="Start on Login"
          description="Launch AeroMeet automatically when you log in to your system."
        >
          <ToggleSwitch checked={startOnLogin} onChange={setStartOnLogin} />
        </SettingsRow>
      </div>
    </div>
  );
}

// ─── Panel: Profile ──────────────────────────────────────────────────────────

function ProfilePanel() {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showAvatarPresets, setShowAvatarPresets] = useState(false);

  const presets = [
    { name: 'Bot 1', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aero1' },
    { name: 'Bot 2', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aero2' },
    { name: 'Avatar 1', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
    { name: 'Avatar 2', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
    { name: 'Lorelei', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Jack' },
    { name: 'Tech', url: 'https://api.dicebear.com/7.x/identicon/svg?seed=Tech' },
  ];

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateProfile(displayName.trim(), avatarUrl.trim() || null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionHeader title="Profile" />

      {/* Avatar section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 flex flex-col gap-4 shadow-xs">
        <div className="flex items-center gap-5">
          <Avatar name={displayName || 'You'} src={avatarUrl} size="xl" className="shadow-xs" />
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">{displayName || user?.name}</p>
            <p className="text-xs text-slate-500 mb-3">{user?.email}</p>
            <button
              onClick={() => setShowAvatarPresets(!showAvatarPresets)}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
            >
              <Camera className="w-3.5 h-3.5" />
              Change photo
            </button>
          </div>
        </div>

        {/* Change photo dropdown/presets */}
        {showAvatarPresets && (
          <div className="pt-4 border-t border-slate-100 animate-fadeIn text-left">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Select a Preset Avatar
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              {presets.map((preset) => (
                <button
                  key={preset.url}
                  onClick={() => setAvatarUrl(preset.url)}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all p-0.5 bg-slate-50 cursor-pointer hover:scale-105 active:scale-95 ${
                    avatarUrl === preset.url ? 'border-indigo-600' : 'border-transparent hover:border-slate-300'
                  }`}
                  title={preset.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover rounded-lg" />
                </button>
              ))}
              <button
                onClick={() => setAvatarUrl('')}
                className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 text-[10px] font-bold transition-all bg-slate-50 cursor-pointer hover:scale-105 active:scale-95 text-slate-500 ${
                  !avatarUrl ? 'border-indigo-600 text-indigo-750' : 'border-transparent hover:border-slate-300'
                }`}
                title="Clear avatar"
              >
                Reset
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Or enter custom image URL
              </label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500/50 transition-colors"
                placeholder="https://example.com/avatar.png"
              />
            </div>
          </div>
        )}
      </div>

      {/* Form fields */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 divide-y divide-slate-100 shadow-xs text-left">
        <div className="py-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500/50 transition-colors"
            placeholder="Your display name"
          />
        </div>

        <div className="py-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
            Email Address
          </label>
          <input
            type="email"
            value={user?.email ?? ''}
            disabled
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-450 outline-none cursor-not-allowed"
          />
          <p className="text-[11px] text-slate-400 mt-1.5">Email cannot be changed.</p>
        </div>

        <div className="py-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
            Status Message
          </label>
          <input
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="e.g. Available, In a meeting…"
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-750 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-left">
          {error}
        </p>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={saving || !displayName.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </>
          ) : saved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Saved!
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Panel: Notifications ────────────────────────────────────────────────────

interface NotificationSettings {
  meetings: boolean;
  messages: boolean;
  mentions: boolean;
  reactions: boolean;
  missedCalls: boolean;
}

function NotificationsPanel() {
  const [settings, setSettings] = useState<NotificationSettings>({
    meetings: true,
    messages: true,
    mentions: true,
    reactions: false,
    missedCalls: true,
  });

  const toggle = (key: keyof NotificationSettings) =>
    setSettings((s) => ({ ...s, [key]: !s[key] }));

  const rows: { key: keyof NotificationSettings; label: string; description: string }[] = [
    {
      key: 'meetings',
      label: 'Meetings',
      description: 'Reminders and alerts for upcoming scheduled meetings.',
    },
    {
      key: 'messages',
      label: 'Messages',
      description: 'New direct messages and channel messages.',
    },
    {
      key: 'mentions',
      label: 'Mentions',
      description: 'When someone @mentions you in a channel or thread.',
    },
    {
      key: 'reactions',
      label: 'Reactions',
      description: 'Emoji reactions added to your messages.',
    },
    {
      key: 'missedCalls',
      label: 'Missed Calls',
      description: 'Alerts when you miss an incoming call.',
    },
  ];

  return (
    <div>
      <SectionHeader title="Notifications" />
      <div className="bg-white border border-slate-200 rounded-2xl px-4 divide-y divide-slate-100 shadow-xs text-left">
        {rows.map(({ key, label, description }) => (
          <SettingsRow key={key} label={label} description={description}>
            <ToggleSwitch checked={settings[key]} onChange={() => toggle(key)} />
          </SettingsRow>
        ))}
      </div>
    </div>
  );
}

// ─── Panel: Audio & Video ────────────────────────────────────────────────────

function AudioVideoPanel() {
  const [microphone, setMicrophone] = useState('default-mic');
  const [speaker, setSpeaker] = useState('default-speaker');
  const [camera, setCamera] = useState('default-cam');
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  const [echoReduction, setEchoReduction] = useState(true);
  const [hdVideo, setHdVideo] = useState(false);

  const micOptions: SelectOption[] = [
    { value: 'default-mic', label: 'Default Microphone' },
    { value: 'usb-mic', label: 'USB Condenser Mic' },
    { value: 'headset-mic', label: 'Headset Microphone' },
  ];

  const speakerOptions: SelectOption[] = [
    { value: 'default-speaker', label: 'Default Speakers' },
    { value: 'usb-speaker', label: 'USB Speakers' },
    { value: 'headphone', label: 'Headphones' },
  ];

  const cameraOptions: SelectOption[] = [
    { value: 'default-cam', label: 'Default Camera' },
    { value: 'usb-cam', label: 'USB Webcam HD' },
    { value: 'integrated', label: 'Integrated Camera' },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <SectionHeader title="Audio & Video" />
        <div className="bg-white border border-slate-200 rounded-2xl px-4 divide-y divide-slate-100 shadow-xs">
          <SettingsRow label="Microphone">
            <div className="flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <SettingsSelect value={microphone} onChange={setMicrophone} options={micOptions} />
            </div>
          </SettingsRow>
          <SettingsRow label="Speaker">
            <div className="flex items-center gap-2">
              <Speaker className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <SettingsSelect value={speaker} onChange={setSpeaker} options={speakerOptions} />
            </div>
          </SettingsRow>
          <SettingsRow label="Camera">
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <SettingsSelect value={camera} onChange={setCamera} options={cameraOptions} />
            </div>
          </SettingsRow>
        </div>
      </div>

      <div>
        <SectionHeader title="Audio Enhancement" />
        <div className="bg-white border border-slate-200 rounded-2xl px-4 divide-y divide-slate-100 shadow-xs">
          <SettingsRow
            label="Noise Cancellation"
            description="Reduce background sounds like fans and keyboard noise."
          >
            <ToggleSwitch checked={noiseCancellation} onChange={setNoiseCancellation} />
          </SettingsRow>
          <SettingsRow
            label="Echo Reduction"
            description="Minimize audio feedback and echo during calls."
          >
            <ToggleSwitch checked={echoReduction} onChange={setEchoReduction} />
          </SettingsRow>
          <SettingsRow
            label="HD Video"
            description="Enable high-definition video (requires fast connection)."
          >
            <ToggleSwitch checked={hdVideo} onChange={setHdVideo} />
          </SettingsRow>
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Background & Effects ────────────────────────────────────────────

type BgMode = 'none' | 'blur' | 'virtual';

function BackgroundPanel() {
  const [bgMode, setBgMode] = useState<BgMode>('none');
  const [blurLevel, setBlurLevel] = useState(8);

  const modes: { id: BgMode; label: string; icon: string }[] = [
    { id: 'none', label: 'None', icon: '🚫' },
    { id: 'blur', label: 'Blur', icon: '🌫️' },
    { id: 'virtual', label: 'Virtual', icon: '🖼️' },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <SectionHeader title="Background & Effects" />
        <div className="flex gap-3 mb-6">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setBgMode(m.id)}
              className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border cursor-pointer transition-all ${
                bgMode === m.id
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
              }`}
            >
              <span className="text-xl">{m.icon}</span>
              <span className="text-xs font-semibold">{m.label}</span>
            </button>
          ))}
        </div>

        {bgMode === 'blur' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <p className="text-sm font-semibold text-slate-800 mb-3">Blur Intensity</p>
            <BlurSlider value={blurLevel} onChange={setBlurLevel} />
            <p className="text-xs text-slate-450 mt-2">
              Drag to adjust background blur level.
            </p>
          </div>
        )}

        {bgMode === 'virtual' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <p className="text-sm font-semibold text-slate-800 mb-3">Virtual Backgrounds</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-video rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center cursor-pointer hover:border-indigo-500/40 transition-colors"
                >
                  <span className="text-[10px] text-slate-500">Background {i}</span>
                </div>
              ))}
            </div>
            <button className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl py-2.5 text-sm font-semibold transition-colors cursor-pointer border border-dashed border-slate-250 hover:border-slate-400">
              <Upload className="w-4 h-4" />
              Upload custom background
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel: Privacy ──────────────────────────────────────────────────────────

function PrivacyPanel() {
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicator, setTypingIndicator] = useState(true);
  const [allowDMs, setAllowDMs] = useState(false);

  return (
    <div className="space-y-6 text-left">
      <div>
        <SectionHeader title="Privacy" />
        <div className="bg-white border border-slate-200 rounded-2xl px-4 divide-y divide-slate-100 shadow-xs">
          <SettingsRow
            label="Show Read Receipts"
            description="Let others know when you've read their messages."
          >
            <ToggleSwitch checked={readReceipts} onChange={setReadReceipts} />
          </SettingsRow>
          <SettingsRow
            label="Show Typing Indicator"
            description="Display a 'typing…' status while composing messages."
          >
            <ToggleSwitch checked={typingIndicator} onChange={setTypingIndicator} />
          </SettingsRow>
          <SettingsRow
            label="Allow Direct Messages from Strangers"
            description="Receive DMs from people outside your teams and contacts."
          >
            <ToggleSwitch checked={allowDMs} onChange={setAllowDMs} />
          </SettingsRow>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-1">Data Sharing</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              AeroMeet collects anonymized usage data to improve product performance and features.
              We never sell your personal data to third parties. You can request a data export or
              account deletion by contacting our privacy team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Accessibility ────────────────────────────────────────────────────

function AccessibilityPanel() {
  const [captions, setCaptions] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState('default');

  return (
    <div className="text-left">
      <SectionHeader title="Accessibility" />
      <div className="bg-white border border-slate-200 rounded-2xl px-4 divide-y divide-slate-100 shadow-xs">
        <SettingsRow
          label="Always Show Captions"
          description="Display live captions during meetings and calls."
        >
          <ToggleSwitch checked={captions} onChange={setCaptions} />
        </SettingsRow>
        <SettingsRow
          label="High Contrast Mode"
          description="Increase UI contrast for better visibility."
        >
          <ToggleSwitch checked={highContrast} onChange={setHighContrast} />
        </SettingsRow>
        <SettingsRow
          label="Font Size"
          description="Adjust text size across the application."
        >
          <SettingsSelect
            value={fontSize}
            onChange={setFontSize}
            options={[
              { value: 'default', label: 'Default' },
              { value: 'large', label: 'Large' },
              { value: 'extra-large', label: 'Extra Large' },
            ]}
          />
        </SettingsRow>
      </div>
    </div>
  );
}

// ─── Panel: About ────────────────────────────────────────────────────────────

function AboutPanel() {
  const [checking, setChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'up-to-date'>('idle');

  const handleCheckUpdates = () => {
    setChecking(true);
    setUpdateStatus('idle');
    setTimeout(() => {
      setChecking(false);
      setUpdateStatus('up-to-date');
    }, 1800);
  };

  return (
    <div className="space-y-6 text-left">
      <SectionHeader title="About" />

      {/* Logo + version */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-xs">
          <span className="text-2xl font-bold text-indigo-700">AM</span>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-slate-800">AeroMeet</p>
          <p className="text-xs text-slate-500 mt-0.5">Version 1.0.0</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Build 2026.05.29</p>
        </div>

        <button
          onClick={handleCheckUpdates}
          disabled={checking}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-5 py-2 text-sm transition-colors cursor-pointer mt-1 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking…' : 'Check for Updates'}
        </button>

        {updateStatus === 'up-to-date' && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
            <Check className="w-3 h-3" />
            You&apos;re up to date!
          </div>
        )}
      </div>

      {/* Legal links */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 divide-y divide-slate-100 shadow-xs">
        {[
          { label: 'Terms of Service', href: '#' },
          { label: 'Privacy Policy', href: '#' },
          { label: 'Open Source Licenses', href: '#' },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            className="flex items-center justify-between py-3 text-sm text-slate-650 hover:text-indigo-700 transition-colors cursor-pointer group"
          >
            <span>{label}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-700 transition-colors" />
          </a>
        ))}
      </div>

      <p className="text-center text-[11px] text-slate-400">
        © 2026 AeroMeet Inc. All rights reserved.
      </p>
    </div>
  );
}

// ─── Panel Router ─────────────────────────────────────────────────────────────

function SettingsPanel({ category }: { category: SettingsCategory }) {
  switch (category) {
    case 'general':      return <GeneralPanel />;
    case 'profile':      return <ProfilePanel />;
    case 'notifications': return <NotificationsPanel />;
    case 'audio-video':  return <AudioVideoPanel />;
    case 'background':   return <BackgroundPanel />;
    case 'privacy':      return <PrivacyPanel />;
    case 'accessibility': return <AccessibilityPanel />;
    case 'about':        return <AboutPanel />;
    default:             return null;
  }
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<SettingsCategory>('general');

  return (
    <div className="flex h-full bg-[#F8FAFC]">
      {/* ── Left nav ── */}
      <nav className="w-56 bg-white border-r border-slate-200 flex flex-col py-4 shrink-0">
        <div className="px-4 mb-4 text-left">
          <h1 className="text-xs font-bold uppercase tracking-wider text-slate-400">Settings</h1>
        </div>

        <div className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all relative ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {/* Left accent bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-600 rounded-full" />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Right content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <SettingsPanel category={active} />
        </div>
      </div>
    </div>
  );
}
