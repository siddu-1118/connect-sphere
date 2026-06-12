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
          ? 'bg-indigo-50 text-indigo-600'
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );
}

function MeetingChip({ title }: { title: string }) {
  return (
    <div className="mt-0.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold truncate leading-tight cursor-pointer hover:bg-indigo-100 transition-colors">
      {title}
    </div>
  );
}

function UpcomingCard({ meeting }: { meeting: Meeting }) {
  const near = meeting.scheduledAt ? isWithin10Minutes(meeting.scheduledAt) : false;

  return (
    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 mb-2 hover:bg-slate-100/80 transition-colors cursor-pointer group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{meeting.title}</p>
          {meeting.scheduledAt && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
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
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Video className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-base font-bold text-slate-800">New Meeting</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
              Meeting Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Weekly Sync"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 transition-colors"
              autoFocus
            />
          </div>

          {/* Date & Time */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 transition-colors appearance-none [color-scheme:light]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
              Description <span className="text-slate-400 normal-case font-normal">(optional)</span>
            </label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Add a meeting agenda or notes..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
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
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 bg-slate-50/50">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
        <CalendarIcon className="w-8 h-8 text-indigo-500" />
      </div>
      <p className="text-sm font-semibold text-slate-800">
        {view === 'week' ? 'Week' : 'Day'} view coming soon
      </p>
      <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
        Switch to Month view to browse your calendar and meetings.
      </p>
    </div>
  );
}

// ─── Empty Upcoming State ─────────────────────────────────────────────────────

function EmptyUpcoming() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2">
      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center mb-1">
        <Sparkles className="w-5 h-5 text-indigo-500" />
      </div>
      <p className="text-sm font-semibold text-slate-600">Your schedule is clear ✨</p>
      <p className="text-[11px] text-slate-400 leading-relaxed">
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
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* ── Header ── */}
      <div className="h-14 bg-white border-b border-slate-200/80 flex items-center px-4 gap-4 shrink-0 shadow-sm">
        {/* Left: Month navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-bold text-slate-800 min-w-[120px] text-center select-none">
            {MONTHS[month]} {year}
          </h1>
          <button
            onClick={nextMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: View toggle */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
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
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-3 py-1.5 text-sm transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Meeting
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: Day's Agenda Sidebar ── */}
        <div className="w-80 bg-white border-r border-slate-200/80 flex flex-col shrink-0">
          {/* Sidebar header */}
          <div className="px-5 pt-5 pb-3 shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Day's Agenda
            </h2>
            {selectedDate && (
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Timeline list */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {loadingMeetings ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-xl bg-slate-50 animate-pulse border border-slate-100"
                  />
                ))}
              </div>
            ) : (
              <div className="relative border-l border-slate-200 pl-4 ml-3 py-2 space-y-4">
                {selectedDate && (() => {
                  const dayMeetings = getMeetingsForDay(meetings, selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                  if (dayMeetings.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-slate-400 font-medium">
                        No events scheduled for this day.
                      </div>
                    );
                  }
                  return dayMeetings.map((m) => {
                    const near = m.scheduledAt ? isWithin10Minutes(m.scheduledAt) : false;
                    const timeStr = m.scheduledAt ? formatTime(m.scheduledAt) : 'All Day';
                    return (
                      <div key={m.id} className="relative">
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                        <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">{timeStr}</div>
                        <div className="mt-1 bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-200 hover:shadow-sm transition-all duration-200 cursor-pointer">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 truncate">{m.title}</h4>
                              {(m as any).description && (
                                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{(m as any).description}</p>
                              )}
                            </div>
                            {near && (
                              <a
                                href={`/room/${m.code}`}
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors"
                              >
                                Join
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Schedule CTA */}
          <div className="px-4 py-4 border-t border-slate-100 shrink-0 bg-white">
            <button
              onClick={() => setShowModal(true)}
              className="w-full flex items-center justify-center gap-1.5 text-indigo-650 hover:bg-indigo-50/50 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer border border-indigo-100"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule a meeting
            </button>
          </div>
        </div>

        {/* ── Right: Calendar Grid ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {view !== 'month' ? (
            <ComingSoonView view={view as 'week' | 'day'} />
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-100 bg-white shrink-0">
                {DAYS_OF_WEEK.map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50">
                <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: 'minmax(96px, 1fr)' }}>
                  {calendarCells.map((day, idx) => {
                    if (day === null) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="border border-slate-100 bg-slate-100/30"
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
                        className={`border border-slate-100 p-1.5 cursor-pointer transition-colors overflow-hidden bg-white ${
                          isSelected
                            ? 'bg-indigo-50/40 ring-1 ring-inset ring-indigo-500/20'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Date number */}
                        <div className="flex items-start mb-1">
                          <span
                            className={`text-xs font-semibold leading-none ${
                              isToday
                                ? 'w-6 h-6 flex items-center justify-center bg-indigo-600 text-white rounded-full'
                                : isPast
                                ? 'text-slate-400'
                                : 'text-slate-700'
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
                            <div className="text-[9px] text-slate-400 pl-1">
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
      </div>

      {showModal && (
        <NewMeetingModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchMeetings}
        />
      )}
    </div>
  );
}
