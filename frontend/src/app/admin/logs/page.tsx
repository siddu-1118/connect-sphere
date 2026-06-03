'use client';

import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet, Terminal, ShieldAlert,
  Download, Grid, Lock, Key, Ban, UserCheck, RefreshCw
} from 'lucide-react';
import api from '../../../lib/api';
import Spinner from '../../../components/ui/Spinner';

interface AuditLogItem {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  targetId: string | null;
  ipAddress: string | null;
  timestamp: string;
}

export default function SecurityAuditLogs() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.data.success) {
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionStyles = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('kick')) return { text: 'text-rose-400 bg-rose-500/10 border-rose-500/15', label: 'Session Terminated', icon: Ban };
    if (act.includes('password')) return { text: 'text-amber-400 bg-amber-500/10 border-amber-500/15', label: 'Password Reset', icon: Key };
    if (act.includes('mfa')) return { text: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/15', label: 'MFA Enforced', icon: ShieldAlert };
    if (act.includes('breakout')) return { text: 'text-purple-400 bg-purple-500/10 border-purple-500/15', label: 'Breakouts Opened', icon: Grid };
    if (act.includes('download')) return { text: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15', label: 'File Downloaded', icon: Download };
    if (act.includes('lock')) return { text: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/15', label: 'Stage Locked', icon: Lock };
    return { text: 'text-slate-400 bg-slate-900 border-slate-800', label: action, icon: UserCheck };
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0B0F19] text-slate-100 font-outfit select-none">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-900 flex items-center justify-between shrink-0 bg-slate-950/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
          <h1 className="text-sm font-bold text-slate-100 uppercase tracking-widest">Compliance Security Audit Trail</h1>
        </div>

        <button
          onClick={fetchLogs}
          disabled={refreshing}
          className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700/60 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
          title="Sync compliance events"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span className="text-[10px] font-black uppercase tracking-wider">Sync ledger</span>
        </button>
      </div>

      {/* Audit Log Ledger Viewport */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Spinner className="border-t-cyan-500 w-10 h-10" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Retrieving Compliance Ledger...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center max-w-sm mx-auto select-none">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <Terminal size={28} className="text-slate-655" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">Audit trail empty</h3>
              <p className="text-xs text-slate-500">Security audit records will appear here as compliance events log on the server.</p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl p-5 font-mono flex-1 flex flex-col min-h-0 select-text">
            {/* Terminal Window Header */}
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3 mb-4 select-none shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider ml-2">secure_audit_compliance_trail.log</span>
            </div>

            {/* Scrolling Console log list */}
            <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-thin pr-1 text-left">
              {logs.map((log) => {
                const config = getActionStyles(log.action);
                const ActionIcon = config.icon;
                return (
                  <div key={log.id} className="flex gap-4 items-start py-2 border-b border-slate-900/50 hover:bg-slate-900/10 px-2 rounded-xl transition-colors">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${config.text}`}>
                      <ActionIcon size={14} className="stroke-[2.5]" />
                    </div>
                    <div className="flex-1 min-w-0 leading-relaxed text-xs">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1.5 select-none">
                        <span className="text-cyan-405 font-bold">{log.userEmail || 'system/caller'}</span>
                        <span className="text-slate-655">—</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${config.text}`}>
                          {config.label}
                        </span>
                        <span className="text-slate-655">—</span>
                        <span className="text-[10px] text-slate-550 font-bold">IP: {log.ipAddress || 'unknown'}</span>
                      </div>
                      <p className="text-slate-400 select-text font-mono break-all leading-normal">
                        <span className="text-slate-600 font-semibold select-none">&gt;&nbsp;</span>
                        Event hash: <span className="text-slate-500 font-semibold">{log.id}</span>. Target: <span className="text-slate-350 font-semibold">{log.targetId || 'global'}</span>
                      </p>
                      <span className="text-[10px] text-slate-600 font-bold block mt-1 select-none font-sans">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
