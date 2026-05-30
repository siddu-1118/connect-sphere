'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Video, Calendar as CalIcon } from 'lucide-react';
import { CalendarEvent } from '../../types';
import { cn, formatTime } from '../../lib/utils';

interface CalendarGridProps {
  events: CalendarEvent[];
  onAddEventClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarGrid({ events, onAddEventClick, onEventClick }: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Month shift navigation triggers
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Monthly date-mapping metrics
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const gridCells: { date: Date; isCurrentMonth: boolean }[] = [];

  // 1. Pad previous month's trailing cells
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    gridCells.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  // 2. Insert current month's dates
  for (let i = 1; i <= daysInMonth; i++) {
    gridCells.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // 3. Pad next month's starting cells to complete grid rows
  const remaining = 42 - gridCells.length; // standard 6-row calendar layout
  for (let i = 1; i <= remaining; i++) {
    gridCells.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Helper to retrieve events assigned to a specific day cell
  const getEventsForDay = (date: Date) => {
    return events.filter((e) => {
      const eDate = new Date(e.startsAt);
      return (
        eDate.getFullYear() === date.getFullYear() &&
        eDate.getMonth() === date.getMonth() &&
        eDate.getDate() === date.getDate()
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl flex flex-col h-full select-none">
      {/* Month Header controls */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <CalIcon className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm md:text-base font-black text-white tracking-wide uppercase">
            {monthNames[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white transition-all text-slate-400"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white transition-all text-slate-400"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-px mb-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/20 py-2 rounded-xl">
        {weekDays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Days Grid viewport */}
      <div className="grid grid-cols-7 gap-px bg-slate-850 rounded-xl overflow-hidden flex-1 min-h-[280px] md:min-h-[360px]">
        {gridCells.map((cell, idx) => {
          const dayEvents = getEventsForDay(cell.date);
          const cellToday = isToday(cell.date);
          const cellSelected = isSameDay(cell.date, selectedDate);

          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(cell.date)}
              className={cn(
                'min-h-[50px] md:min-h-[70px] bg-slate-900 border border-slate-950 p-1.5 md:p-2 flex flex-col justify-between group transition-colors duration-150 cursor-pointer relative',
                cell.isCurrentMonth ? 'hover:bg-slate-900/60' : 'opacity-25',
                cellSelected && 'ring-2 ring-blue-500 ring-inset bg-slate-900/80'
              )}
            >
              {/* Day Cell Header */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className={cn(
                    'w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-400 leading-none',
                    cellToday && 'bg-blue-600 text-white shadow-md font-extrabold',
                    cellSelected && !cellToday && 'bg-slate-800 text-blue-400 font-bold'
                  )}
                >
                  {cell.date.getDate()}
                </span>
                
                {cell.isCurrentMonth && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddEventClick(cell.date);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white transition-all text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    Add
                  </button>
                )}
              </div>

              {/* Mobile Dot Indicators */}
              <div className="flex justify-center gap-0.5 mt-0.5 md:hidden">
                {dayEvents.slice(0, 3).map((evt) => (
                  <span
                    key={evt.id}
                    className={cn(
                      'w-1 h-1 rounded-full shrink-0',
                      evt.meetingId ? 'bg-blue-500' : 'bg-purple-500'
                    )}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[6px] text-slate-500 font-black leading-none">+</span>
                )}
              </div>

              {/* Event Cards inside cell (Desktop only) */}
              <div className="hidden md:block flex-1 overflow-y-auto space-y-1.5 max-h-[80px] scrollbar-thin">
                {dayEvents.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(evt);
                    }}
                    className={cn(
                      'w-full text-left p-1.5 rounded-lg border text-[10px] font-semibold transition-all truncate flex items-center gap-1 active:scale-95 leading-none',
                      evt.meetingId
                        ? 'bg-blue-900/30 hover:bg-blue-900/40 border-blue-800/40 text-blue-300'
                        : 'bg-purple-900/30 hover:bg-purple-900/40 border-purple-800/40 text-purple-300'
                    )}
                  >
                    {evt.meetingId && <Video className="w-2.5 h-2.5 shrink-0" />}
                    <span className="truncate flex-1">{evt.title}</span>
                    <span className="text-[8px] opacity-75 font-normal">
                      {formatTime(evt.startsAt)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile event list panel (Mobile only) */}
      <div className="mt-4 md:hidden border-t border-slate-800 pt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Events ({selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})
          </h3>
          <button
            onClick={() => onAddEventClick(selectedDate)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all"
          >
            Add Event
          </button>
        </div>
        
        {getEventsForDay(selectedDate).length === 0 ? (
          <p className="text-[11px] text-slate-500 italic py-2">No events scheduled.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {getEventsForDay(selectedDate).map((evt) => (
              <div
                key={evt.id}
                onClick={() => onEventClick(evt)}
                className={cn(
                  'p-3 rounded-xl border text-[11px] font-semibold flex items-center justify-between gap-3 active:scale-[0.99] transition-all cursor-pointer',
                  evt.meetingId
                    ? 'bg-blue-900/10 border-blue-800/20 text-blue-300'
                    : 'bg-purple-900/10 border-purple-800/20 text-purple-300'
                )}
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-white truncate">{evt.title}</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    {formatTime(evt.startsAt)} — {formatTime(evt.endsAt)}
                  </p>
                </div>
                {evt.meetingId && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarGrid;