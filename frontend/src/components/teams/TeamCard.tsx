'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Hash, ArrowRight, Copy, Check } from 'lucide-react';
import { Team } from '../../types';
import Badge from '../ui/Badge';

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  const [copied, setCopied] = React.useState(false);

  const copyInviteCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(team.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roleVariants = {
    owner: 'primary',
    admin: 'success',
    member: 'secondary',
  } as const;

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/60 rounded-2xl p-6 transition-all duration-200 shadow-xl group flex flex-col justify-between hover:-translate-y-0.5">
      {/* Title & Role */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors truncate">
            {team.name}
          </h3>
          <Badge variant={roleVariants[team.role]} className="uppercase text-[9px] px-2 py-0.5">
            {team.role}
          </Badge>
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-5">
          {team.description || 'No description provided for this workspace.'}
        </p>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900">
        {/* Copy Invite Code Trigger */}
        <button
          onClick={copyInviteCode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>{team.inviteCode}</span>
            </>
          )}
        </button>

        <Link
          href={`/teams/${team.id}`}
          className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-all group-hover:gap-1.5"
        >
          <span>Enter Space</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default TeamCard;