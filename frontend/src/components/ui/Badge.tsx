'use client';

import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'glass';
}

export function Badge({ children, className, variant = 'primary', ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border';

  const variants = {
    primary: 'bg-blue-900/40 text-blue-300 border-blue-800/50',
    secondary: 'bg-slate-800 text-slate-300 border-slate-700/50',
    success: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50',
    danger: 'bg-red-950/40 text-red-300 border-red-800/50',
    warning: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
    glass: 'bg-white/5 text-white border-white/10 backdrop-blur-md',
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </span>
  );
}

export default Badge;