'use client';

import React from 'react';
import { cn, getInitials, getHSLColor } from '../../lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ name, src, size = 'md', className, ...props }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-14 h-14 text-lg font-bold',
    xl: 'w-20 h-20 text-2xl font-bold',
  };

  const initials = getInitials(name);
  const bgColor = getHSLColor(name);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-xl overflow-hidden select-none shrink-0 text-white shadow-md border border-white/5',
        sizes[size],
        className
      )}
      style={!src ? { backgroundColor: bgColor } : undefined}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image load fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default Avatar;