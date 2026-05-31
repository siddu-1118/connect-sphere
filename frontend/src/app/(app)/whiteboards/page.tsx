'use client';

import React from 'react';
import Whiteboard from '@/components/meeting/Whiteboard';

export default function WhiteboardPage() {
  return (
    <div className="p-6 h-[calc(100vh-80px)] w-full">
      <Whiteboard />
    </div>
  );
}
