'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Spinner from '@/components/ui/Spinner';

export default function InstantMeetPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createInstantMeeting() {
      try {
        const title = `Instant Sync - ${new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`;
        const response = await api.post('/meetings', {
          title,
          scheduledAt: null,
        });

        if (response.data.success) {
          const { code } = response.data.meeting;
          router.replace(`/meet/preview/${code}`);
        } else {
          setError('Failed to initialize meeting parameters.');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || 'Failed to establish call coordinates.');
      }
    }

    createInstantMeeting();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col gap-5">
          <h2 className="text-lg font-black text-red-400 uppercase tracking-wide">Meet Now Error</h2>
          <p className="text-xs text-slate-450 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-[#10B981] hover:bg-[#474aac] text-white text-xs font-semibold rounded-full shadow transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" className="border-t-cyan-400 w-12 h-12" />
      <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest animate-pulse">
        Generating Room Coordinates...
      </p>
    </div>
  );
}
