'use client';

import React from 'react';
import Button from './Button';

interface EmptyStateProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  actionLabel?: string;
  onActionClick?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onActionClick,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto my-12 animate-fadeIn select-none ${className}`}>
      
      {/* Concentric Halo Accents */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Outer Halo */}
        <div className="absolute w-24 h-24 rounded-full bg-[#10B981]/5 border border-[#10B981]/10 animate-pulse" />
        {/* Inner Halo */}
        <div className="absolute w-16 h-16 rounded-full bg-[#10B981]/10 border border-[#10B981]/20" />
        
        {/* Core Icon Button */}
        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#10B981] flex items-center justify-center text-white shadow-xl shadow-[#10B981]/25">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Text Context */}
      <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider mb-2">
        {title}
      </h3>
      
      <p className="text-xs text-slate-400 leading-relaxed mb-6">
        {description}
      </p>

      {/* Action CTA */}
      {actionLabel && onActionClick && (
        <Button
          onClick={onActionClick}
          className="bg-[#10B981] hover:bg-[#4d51a9] text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-lg shadow-lg shadow-[#10B981]/20 border border-[#10B981]/10 active:scale-[0.98] transition-all"
        >
          {actionLabel}
        </Button>
      )}

    </div>
  );
}
