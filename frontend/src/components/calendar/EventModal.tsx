'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Video, Clock, FileText } from 'lucide-react';
import { Meeting } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  meetings: Meeting[];
  onSubmitEvent: (payload: {
    title: string;
    description?: string;
    startsAt: string;
    endsAt: string;
    meetingId?: string | null;
  }) => Promise<void>;
}

export function EventModal({
  isOpen,
  onClose,
  selectedDate,
  meetings,
  onSubmitEvent,
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [meetingId, setMeetingId] = useState('');
  const [titleError, setTitleError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset fields on modal open
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setStartTime('09:00');
      setEndTime('10:00');
      setMeetingId('');
      setTitleError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');

    if (!selectedDate) return;

    setLoading(true);
    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const startsAt = new Date(selectedDate);
      startsAt.setHours(startH, startM, 0, 0);

      const endsAt = new Date(selectedDate);
      endsAt.setHours(endH, endM, 0, 0);

      if (startsAt >= endsAt) {
        alert('End time must be after the start time.');
        setLoading(false);
        return;
      }

      await onSubmitEvent({
        title,
        description: description || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        meetingId: meetingId || null,
      });

      onClose();
    } catch (e) {
      console.error('Failed to create calendar event:', e);
    } finally {
      setLoading(false);
    }
  };

  const formattedDateString = selectedDate
    ? selectedDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Calendar Event">
      <div className="flex flex-col gap-5">
        {/* Selected date header panel */}
        <div className="flex items-center gap-2.5 px-4 py-3 bg-white/5 border border-white/5 rounded-xl backdrop-blur-md">
          <Calendar className="w-5 h-5 text-blue-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
            {formattedDateString}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title input element */}
          <Input
            label="Event Title"
            type="text"
            placeholder="e.g. Daily Standup or Planning Session"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) setTitleError('');
            }}
            error={titleError}
          />

          {/* Timings row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Start Time</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl text-sm text-slate-200 transition-colors shadow-inner"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>End Time</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl text-sm text-slate-200 transition-colors shadow-inner"
              />
            </div>
          </div>

          {/* Description input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Description</span>
            </label>
            <textarea
              placeholder="Provide a description or agenda for the event..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl text-sm text-slate-200 placeholder:text-slate-500 transition-colors shadow-inner resize-none"
            />
          </div>

          {/* Video meeting binding dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-slate-500" />
              <span>Link Video Meeting</span>
            </label>
            <select
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl text-sm text-slate-200 transition-colors shadow-inner"
            >
              <option value="">No Meeting Linked</option>
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.code})
                </option>
              ))}
            </select>
          </div>

          {/* Actions panel */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/10">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Create Event
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default EventModal;