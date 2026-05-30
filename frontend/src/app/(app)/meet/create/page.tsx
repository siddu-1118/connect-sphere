'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Video, Copy, Check, ArrowLeft, Calendar, FileText } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function CreateMeetingPage() {
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  
  const [titleError, setTitleError] = useState('');
  const [dateError, setDateError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Creation success payload reference
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [shareableLink, setShareableLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError('');
    setDateError('');

    if (!title.trim()) {
      setTitleError('Meeting title is required');
      return;
    }

    let isoDate: string | null = null;
    if (isScheduled) {
      if (!scheduledAt) {
        setDateError('Please select a date and time');
        return;
      }
      const date = new Date(scheduledAt);
      if (date < new Date()) {
        setDateError('Meeting time must be in the future');
        return;
      }
      isoDate = date.toISOString();
    }

    setLoading(true);
    try {
      const response = await api.post('/meetings', {
        title: title.trim(),
        scheduledAt: isoDate,
      });

      if (response.data.success) {
        const { code } = response.data.meeting;
        setCreatedCode(code);
        setShareableLink(response.data.shareableLink);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to initialize meeting room.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto flex flex-col gap-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {createdCode ? (
        /* SUCCESS CONFIRMATION PANEL */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 animate-fadeIn">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner mx-auto mb-4">
              <Check className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-wide">
              Meeting Created!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your video room is ready for connections
            </p>
          </div>

          {/* Code link display */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Shareable Meet Link
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                value={shareableLink}
                className="w-full pl-4 pr-14 py-3.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-slate-300 focus:outline-none select-all"
              />
              <button
                onClick={copyLink}
                className="absolute right-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-all"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-slate-800 bg-slate-900">
            <Link href={`/room/${createdCode}/join`} className="w-full">
              <Button variant="primary" className="w-full uppercase tracking-wider text-xs font-black py-3.5 gap-2">
                <Video className="w-4 h-4" />
                <span>Join Meeting Room</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setCreatedCode(null);
                setTitle('');
                setIsScheduled(false);
              }}
              className="w-full uppercase tracking-wider text-xs font-bold text-slate-400 hover:text-white"
            >
              Create Another Meet
            </Button>
          </div>
        </div>
      ) : (
        /* CREATE MEETING FORM */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-wide uppercase">
              New Meeting
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Start an instant sync or plan a schedule
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Meeting Title"
              type="text"
              placeholder="e.g. Weekly Standup, Project Discussion"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) setTitleError('');
              }}
              error={titleError}
            />

            {/* Toggle Scheduler */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/5 rounded-xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">
                  Schedule for Later
                </span>
              </div>
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-800 bg-slate-950 focus:ring-blue-500/20"
              />
            </div>

            {isScheduled && (
              <div className="flex flex-col gap-1.5 animate-fadeIn">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => {
                    setScheduledAt(e.target.value);
                    if (e.target.value) setDateError('');
                  }}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-850 rounded-xl text-sm text-slate-200 focus:border-blue-500 focus:outline-none transition-colors shadow-inner"
                />
                {dateError && (
                  <span className="text-xs font-medium text-red-500 mt-0.5">
                    {dateError}
                  </span>
                )}
              </div>
            )}

            <Button type="submit" variant="primary" loading={loading} className="w-full uppercase tracking-wider text-xs font-black py-3.5 mt-2 gap-2">
              <Video className="w-4 h-4" />
              <span>{isScheduled ? 'Schedule Meeting' : 'Start Instant Call'}</span>
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}