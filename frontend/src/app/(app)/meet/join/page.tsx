'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function MeetJoinRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || searchParams.get('id');

  useEffect(() => {
    if (code) {
      router.replace(`/meet/preview/${code.trim().toLowerCase()}`);
    } else {
      router.replace('/room/instant/join');
    }
  }, [code, router]);

  return (
    <div className="min-h-screen bg-slate-955 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-t-cyan-400 border-slate-900 animate-spin" />
    </div>
  );
}

export default function MeetJoinRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-955 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-t-cyan-400 border-slate-900 animate-spin" />
      </div>
    }>
      <MeetJoinRedirectContent />
    </Suspense>
  );
}