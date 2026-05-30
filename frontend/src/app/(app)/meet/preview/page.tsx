'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function MeetPreviewRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  useEffect(() => {
    if (id) {
      router.replace(`/meet/preview/${id.trim().toLowerCase()}`);
    } else {
      router.replace('/room/instant/join');
    }
  }, [id, router]);

  return (
    <div className="min-h-screen bg-slate-955 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-t-cyan-400 border-slate-900 animate-spin" />
    </div>
  );
}

export default function MeetPreviewRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-955 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-t-cyan-400 border-slate-900 animate-spin" />
      </div>
    }>
      <MeetPreviewRedirectContent />
    </Suspense>
  );
}
