'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RoomJoinRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/meet/preview/${id.trim().toLowerCase()}`);
    } else {
      router.replace('/room/instant/join');
    }
  }, [router, id]);

  return (
    <div className="min-h-screen bg-slate-955 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-t-cyan-400 border-slate-900 animate-spin" />
    </div>
  );
}
