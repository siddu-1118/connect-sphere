'use client';

import React, { useEffect, useState } from 'react';
import {
  Users, Search, ShieldAlert, Key, HelpCircle,
  X, Check, AlertCircle, ShieldCheck
} from 'lucide-react';
import api from '../../../lib/api';
import Spinner from '../../../components/ui/Spinner';
import Avatar from '../../../components/ui/Avatar';

interface UserItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export default function UserManager() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeUser, setActiveUser] = useState<UserItem | null>(null);
  
  // Actions states
  const [acting, setActing] = useState<string | null>(null); // 'reset' | 'mfa' | 'kick'
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users?page=${page}&search=${search}`);
      if (res.data.success) {
        setUsers(res.data.users || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load user directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(users.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleForcePasswordReset = async (id: string) => {
    setActing('reset');
    setActionSuccessMsg(null);
    try {
      const res = await api.post(`/admin/users/${id}/reset-password`);
      if (res.data.success) {
        setActionSuccessMsg(res.data.message);
      }
    } catch (err) {
      alert('Could not reset password. Ensure the database connection is active.');
    } finally {
      setActing(null);
    }
  };

  const handleRequireMFA = async (id: string) => {
    setActing('mfa');
    setActionSuccessMsg(null);
    try {
      const res = await api.post(`/admin/users/${id}/require-mfa`);
      if (res.data.success) {
        setActionSuccessMsg(res.data.message);
      }
    } catch (err) {
      alert('Could not update MFA configuration.');
    } finally {
      setActing(null);
    }
  };

  const handleKickUser = async (id: string) => {
    setActing('kick');
    setActionSuccessMsg(null);
    try {
      const res = await api.post(`/admin/users/${id}/kick`);
      if (res.data.success) {
        setActionSuccessMsg(res.data.message);
      }
    } catch (err) {
      alert('Could not terminate user session.');
    } finally {
      setActing(null);
    }
  };

  // Bulk actions (e.g. bulk kick)
  const handleBulkKick = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to kick the ${selectedIds.length} selected users?`)) return;
    
    setLoading(true);
    try {
      for (const id of selectedIds) {
        await api.post(`/admin/users/${id}/kick`);
      }
      setSelectedIds([]);
      alert('Bulk sessions terminated.');
      await fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex bg-[#0B0F19] text-slate-100 font-outfit select-none overflow-hidden relative">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-900 flex items-center justify-between shrink-0 bg-slate-950/40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-cyan-400" />
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-widest">User Manager Directory</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search accounts…"
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-550/50 w-52 transition-all font-outfit"
              />
            </div>
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkKick}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-455 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Bulk Kick ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Directory Table */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {loading ? (
            <div className="h-[50vh] flex flex-col items-center justify-center gap-4">
              <Spinner className="border-t-cyan-500 w-10 h-10" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Directory...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="h-[50vh] flex flex-col items-center justify-center gap-4 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <Users size={28} className="text-slate-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-1">No users found</h3>
                <p className="text-xs text-slate-500">Try matching different keywords or clear your query terms.</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-400">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-950/40 text-[9px] font-black uppercase tracking-widest text-slate-500 select-none">
                      <th className="px-5 py-4 w-12 text-center">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={selectedIds.length === users.length}
                          className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="px-5 py-4">User Details</th>
                      <th className="px-5 py-4">Security Level</th>
                      <th className="px-5 py-4">Registration</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 font-medium">
                    {users.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-900/30 transition-colors group cursor-pointer ${
                            activeUser?.id === item.id ? 'bg-cyan-500/[0.02]' : ''
                          }`}
                          onClick={() => {
                            setActionSuccessMsg(null);
                            setActiveUser(item);
                          }}
                        >
                          <td className="px-5 py-4 w-12 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => handleSelectOne(item.id, e.target.checked)}
                              className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={item.name} src={item.avatarUrl} size="sm" className="border border-slate-800" />
                              <div className="text-left min-w-0">
                                <span className="text-slate-200 font-bold block truncate group-hover:text-white transition-colors">{item.name}</span>
                                <span className="text-[10px] text-slate-550 block mt-0.5 truncate leading-none">{item.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {item.isAdmin ? (
                              <span className="inline-flex items-center gap-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                <ShieldCheck size={11} /> Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-950 border border-slate-850 text-[9px] font-black text-slate-500 uppercase tracking-wider rounded-lg px-2 py-0.5">
                                User
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-500 font-mono">
                            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setActionSuccessMsg(null);
                                setActiveUser(item);
                              }}
                              className="px-3 py-1.5 bg-slate-950 border border-slate-850 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer hover:bg-slate-900"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        {totalPages > 1 && (
          <div className="h-14 px-6 border-t border-slate-900 bg-slate-950/30 flex items-center justify-between shrink-0 select-none">
            <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-slate-300 rounded-lg cursor-pointer transition-all"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-slate-300 rounded-lg cursor-pointer transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-out Drawer Panel */}
      {activeUser && (
        <div className="w-80 md:w-88 border-l border-slate-900 bg-slate-950/60 backdrop-blur-xl flex flex-col justify-between shrink-0 h-full animate-slideInRight relative z-40 select-none">
          <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-550/20 to-transparent" />
          
          <div className="flex flex-col min-h-0 flex-1">
            {/* Drawer Header */}
            <div className="h-16 px-5 border-b border-slate-900 flex items-center justify-between bg-slate-950/20 shrink-0">
              <div className="flex items-center gap-2 text-left min-w-0">
                <Avatar name={activeUser.name} src={activeUser.avatarUrl} size="sm" className="border border-slate-800" />
                <div className="leading-none min-w-0">
                  <span className="text-xs font-black text-white uppercase tracking-widest block truncate">{activeUser.name}</span>
                  <span className="text-[9px] text-slate-550 block truncate mt-1">{activeUser.email}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveUser(null);
                  setActionSuccessMsg(null);
                }}
                className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                title="Close panel"
              >
                <X size={15} />
              </button>
            </div>

            {/* Drawer Controls Scrollable viewport */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin text-left">
              {/* Alert Feedback Card */}
              {actionSuccessMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex gap-3 text-xs leading-relaxed animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-450 shrink-0 mt-0.5" />
                  <div className="text-emerald-400 font-bold select-text">
                    <span className="block mb-1">Command Success:</span>
                    {actionSuccessMsg}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <span className="text-[9px] font-black text-slate-550 uppercase tracking-widest block">Access Controls</span>

                {/* 1. Force Password Reset */}
                <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex gap-2.5 items-start">
                    <Key className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block leading-tight">Reset Password</span>
                      <p className="text-[9px] text-slate-500 mt-1 leading-normal">Forces user password update to temporary credentials globally</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleForcePasswordReset(activeUser.id)}
                    disabled={acting !== null}
                    className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-cyan-500/30 text-slate-305 hover:text-cyan-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  >
                    {acting === 'reset' ? 'Processing...' : 'Force Reset'}
                  </button>
                </div>

                {/* 2. Require MFA */}
                <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex gap-2.5 items-start">
                    <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block leading-tight">Enforce MFA Requirements</span>
                      <p className="text-[9px] text-slate-500 mt-1 leading-normal">Requires account Multi-Factor setup verification on next session login</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRequireMFA(activeUser.id)}
                    disabled={acting !== null}
                    className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-indigo-500/30 text-slate-305 hover:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  >
                    {acting === 'mfa' ? 'Processing...' : 'Require MFA'}
                  </button>
                </div>

                {/* 3. Session Kick */}
                <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex gap-2.5 items-start">
                    <AlertCircle className="w-4 h-4 text-rose-455 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block leading-tight">Terminate Sessions</span>
                      <p className="text-[9px] text-slate-500 mt-1 leading-normal">Kicks active WebRTC caller streams and terminates socket relays</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleKickUser(activeUser.id)}
                    disabled={acting !== null}
                    className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/15 hover:border-rose-500/30 text-rose-455 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  >
                    {acting === 'kick' ? 'Processing...' : 'Disconnect User'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
