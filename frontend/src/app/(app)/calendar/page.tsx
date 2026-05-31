'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Calendar as CalendarIcon,
  Video,
  X,
  AlignLeft,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Meeting } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarView = 'month' | 'week' | 'day';

interface NewMeetingForm {
  title: string;
  scheduledAt: string;
  description: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isWithin10Minutes(dateStr: string): boolean {
  const meetingTime = new Date(dateStr).getTime();
  const now = Date.now();
  const diff = meetingTime - now;
  return diff >= -60_000 && diff <= 10 * 60_000; // within -1 min to +10 min
}

function getMeetingsForDay(meetings: Meeting[], year: number, month: number, day: number): Meeting[] {
  return meetings.filter((m) => {
    if (!m.scheduledAt) return false;
    const d = new Date(m.scheduledAt);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });
}

function getUpcomingMeetings(meetings: Meeting[]): Meeting[] {
  const now = Date.now();
  return meetings
    .filter((m) => m.scheduledAt && new Date(m.scheduledAt).getTime() > now - 60_000)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 5);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ViewTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
        active
          ? 'bg-[#10B981]/20 text-[#10B981]'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
      }`}
    >
      {label}
    </button>
  );
}

function MeetingChip({ title }: { title: string }) {
  return (
    <div className="mt-0.5 px-1.5 py-0.5 rounded bg-[#10B981]/40 text-[#10B981] text-[10px] font-medium truncate leading-tight cursor-pointer hover:bg-[#10B981]/60 transition-colors">
      {title}
    </div>
  );
}

function UpcomingCard({ meeting }: { meeting: Meeting }) {
  const near = meeting.scheduledAt ? isWithin10Minutes(meeting.scheduledAt) : false;

  return (
    <div className="bg-[#191f31] border border-white/[0.06] rounded-xl p-3 mb-2 hover:bg-[#2a2a4a] transition-colors cursor-pointer group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">{meeting.title}</p>
          {meeting.scheduledAt && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="text-[11px] text-slate-500">
                {formatTime(meeting.scheduledAt)}
              </span>
            </div>
          )}
        </div>
        {near && (
          <a
            href={`/room/${meeting.code}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 bg-[#06B6D4] hover:bg-[#0891b2] text-white text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
          >
            Join
          </a>
        )}
      </div>
    </div>
  );
}

// ─── New Meeting Modal ────────────────────────────────────────────────────────

function NewMeetingModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<NewMeetingForm>({
    title: '',
    scheduledAt: formatDateTimeLocal(new Date(Date.now() + 30 * 60_000)),
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Meeting title is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/meetings', {
        title: form.title.trim(),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        description: form.description.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch {
      setError('Failed to create meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-[#0B0F17] border border-white/[0.06] rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 flex items-center justify-center">
              <Video className="w-4 h-4 text-[#10B981]" />
            </div>
            <h2 className="text-base font-bold text-slate-100">New Meeting</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Meeting Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Weekly Sync"
              className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-[#10B981]/50 transition-colors"
              autoFocus
            />
          </div>

          {/* Date & Time */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-[#10B981]/50 transition-colors appearance-none [color-scheme:dark]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Description <span className="text-slate-600 normal-case font-normal">(optional)</span>
            </label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-2.5 w-4 h-4 text-slate-600 pointer-events-none" />
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Add a meeting agenda or notes..."
                rows={3}
                className="w-full bg-white/5 border border-white/[0.06] rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-[#10B981]/50 transition-colors resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Meeting'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Coming Soon Overlay (week/day) ──────────────────────────────────────────

function ComingSoonView({ view }: { view: 'week' | 'day' }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center">
        <CalendarIcon className="w-8 h-8 text-[#10B981]/60" />
      </div>
      <p className="text-sm font-semibold text-slate-300">
        {view === 'week' ? 'Week' : 'Day'} view coming soon
      </p>
      <p className="text-xs text-slate-600 max-w-[200px] leading-relaxed">
        Switch to Month view to browse your calendar and meetings.
      </p>
    </div>
  );
}

// ─── Empty Upcoming State ─────────────────────────────────────────────────────

function EmptyUpcoming() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2">
      <div className="w-10 h-10 rounded-xl bg-[#191f31] border border-white/[0.06] flex items-center justify-center mb-1">
        <Sparkles className="w-5 h-5 text-[#10B981]/50" />
      </div>
      <p className="text-sm font-medium text-slate-400">Your schedule is clear ✨</p>
      <p className="text-[11px] text-slate-600 leading-relaxed">
        No upcoming meetings. Schedule one below.
      </p>
    </div>
  );
}

// ─── Main Calendar Page ───────────────────────────────────────────────────────

export default function CalendarPage() {
  const { user } = useAuth();
  const today = new Date();

  const [currentDate, setCurrentDate] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [view, setView] = useState<CalendarView>('month');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ── Fetch meetings ──────────────────────────────────────────────────────────
  const fetchMeetings = useCallback(async () => {
    try {
      setLoadingMeetings(true);
      const res = await api.get('/meetings');
      const data: Meeting[] = res.data?.meetings ?? res.data ?? [];
      setMeetings(Array.isArray(data) ? data : []);
    } catch {
      setMeetings([]);
    } finally {
      setLoadingMeetings(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const prevMonth = () =>
    setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () =>
    setCurrentDate(new Date(year, month + 1, 1));

  // ── Calendar Grid Data ──────────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  // Pad with nulls for days before the 1st
  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full 6-week grid
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  // ── Upcoming meetings ───────────────────────────────────────────────────────
  const upcoming = getUpcomingMeetings(meetings);

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#111827]">
      {/* ── Header ── */}
      <div className="h-14 bg-[#0B0F17] border-b border-white/[0.06] flex items-center px-4 gap-4 shrink-0">
        {/* Left: Month navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-100 min-w-[120px] text-center select-none">
            {MONTHS[month]} {year}
          </h1>
          <button
            onClick={nextMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: View toggle */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1">
            {(['week', 'month', 'day'] as CalendarView[]).map((v) => (
              <ViewTab
                key={v}
                label={v.charAt(0).toUpperCase() + v.slice(1)}
                active={view === v}
                onClick={() => setView(v)}
              />
            ))}
          </div>
        </div>

        {/* Right: New Meeting */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded-xl px-3 py-1.5 text-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Meeting
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: Calendar Grid ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {view !== 'month' ? (
            <ComingSoonView view={view as 'week' | 'day'} />
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-white/[0.04] bg-[#0B0F17] shrink-0">
                {DAYS_OF_WEEK.map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-[9px] font-black uppercase tracking-wider text-slate-600"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: 'minmax(96px, 1fr)' }}>
                  {calendarCells.map((day, idx) => {
                    if (day === null) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="border border-white/[0.04] bg-[#0B0F17]/30"
                        />
                      );
                    }

                    const cellDate = new Date(year, month, day);
                    const isToday = isSameDay(cellDate, today);
                    const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const isSelected = selectedDate ? isSameDay(cellDate, selectedDate) : false;
                    const dayMeetings = getMeetingsForDay(meetings, year, month, day);

                    return (
                      <div
                        key={`day-${day}`}
                        onClick={() => setSelectedDate(cellDate)}
                        className={`border border-white/[0.04] p-1.5 cursor-pointer transition-colors overflow-hidden ${
                          isSelected
                            ? 'bg-[#10B981]/10'
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        {/* Date number */}
                        <div className="flex items-start mb-1">
                          <span
                            className={`text-xs font-semibold leading-none ${
                              isToday
                                ? 'w-6 h-6 flex items-center justify-center bg-[#10B981] text-white rounded-full'
                                : isPast
                                ? 'text-slate-600'
                                : 'text-slate-300'
                            }`}
                          >
                            {day}
                          </span>
                        </div>

                        {/* Meeting chips */}
                        <div className="space-y-0.5">
                          {dayMeetings.slice(0, 3).map((m) => (
                            <MeetingChip key={m.id} title={m.title} />
                          ))}
                          {dayMeetings.length > 3 && (
                            <div className="text-[9px] text-slate-600 pl-1">
                              +{dayMeetings.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right: Upcoming Sidebar ── */}
        <div className="w-72 bg-[#0B0F17] border-l border-white/[0.06] flex flex-col shrink-0">
          {/* Sidebar header */}
          <div className="px-4 pt-4 pb-2 shrink-0">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Upcoming
            </h2>
            {selectedDate && (
              <p className="text-[11px] text-slate-600 mt-0.5">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Meeting list */}
          <div className="flex-1 overflow-y-auto px-3 py-1">
            {loadingMeetings ? (
              <div className="flex flex-col gap-2 mt-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-xl bg-white/[0.03] animate-pulse"
                  />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <EmptyUpcoming />
            ) : (
              upcoming.map((m) => <UpcomingCard key={m.id} meeting={m} />)
            )}
          </div>

          {/* Schedule CTA */}
          <div className="px-3 py-3 border-t border-white/[0.06] shrink-0">
            <button
              onClick={() => setShowModal(true)}
              className="w-full flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule a meeting
            </button>
          </div>
        </div>
      </div>

      {/* ── New Meeting Modal ── */}
      {showModal && (
        <NewMeetingModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchMeetings}
        />
      )}
    </div>
  );
}
