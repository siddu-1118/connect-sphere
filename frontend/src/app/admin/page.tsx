'use client';

import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  LayoutDashboard, Server, Database, Clock, RefreshCw, BarChart2
} from 'lucide-react';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';

interface UsageStats {
  concurrentUsers: { time: string; users: number }[];
  storageUsage: { bucket: string; sizeBytes: number }[];
  meetingMinutes: { day: string; minutes: number }[];
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/admin/analytics');
      if (res.data.success) {
        setStats(res.data.analytics);
      }
    } catch (err) {
      console.error('Failed to load telemetry stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalMeetingMinutes = stats?.meetingMinutes.reduce((sum, row) => sum + row.minutes, 0) || 0;
  const totalStorageBytes = stats?.storageUsage.reduce((sum, row) => sum + row.sizeBytes, 0) || 0;
  const currentActiveUsers = (stats?.concurrentUsers && stats.concurrentUsers.length > 0)
    ? stats.concurrentUsers[stats.concurrentUsers.length - 1].users
    : 0;

  // Determine if workspace is brand new (all metrics are zero)
  const isBrandNew = !stats || (
    stats.concurrentUsers.every(r => r.users === 0) &&
    stats.storageUsage.every(r => r.sizeBytes === 0) &&
    stats.meetingMinutes.every(r => r.minutes === 0)
  );

  const COLORS = ['#22d3ee', '#6366f1']; // Cyan and Indigo

  // Storage data mapping for Donut
  const storageData = stats?.storageUsage.map(s => ({
    name: s.bucket === 'workspace_files' ? 'Team Files' : 'Cloud Recordings',
    value: s.sizeBytes
  })) || [];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0B0F19] text-slate-100 font-outfit select-none overflow-y-auto">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-900 flex items-center justify-between shrink-0 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-5 h-5 text-cyan-400" />
          <h1 className="text-sm font-bold text-slate-100 uppercase tracking-widest">Telemetry Dashboard</h1>
        </div>

        <button
          onClick={fetchStats}
          disabled={refreshing}
          className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700/60 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
          title="Refresh stats"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span className="text-[10px] font-black uppercase tracking-wider">Sync Live</span>
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Spinner className="border-t-cyan-455 w-10 h-10" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Telemetry Metrics...</p>
        </div>
      ) : (
        <div className="p-6 flex flex-col gap-6">
          {/* Stats Widgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0 select-none">
            {/* Widget 1 */}
            <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl flex items-center justify-between shadow-md relative group">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
              <div className="text-left leading-none min-w-0">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Live Session Users</span>
                <span className="text-2xl font-black text-cyan-400 font-mono tracking-tight">{currentActiveUsers}</span>
                <span className="text-[9px] text-slate-505 font-bold uppercase tracking-wider block mt-2">Active WS connection channels</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Server className="w-5 h-5" />
              </div>
            </div>

            {/* Widget 2 */}
            <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl flex items-center justify-between shadow-md relative group">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent" />
              <div className="text-left leading-none min-w-0">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Total Storage Vault Usage</span>
                <span className="text-2xl font-black text-indigo-400 font-mono tracking-tight">{formatFileSize(totalStorageBytes)}</span>
                <span className="text-[9px] text-slate-505 font-bold uppercase tracking-wider block mt-2">Workspace Bucket footprint</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Database className="w-5 h-5" />
              </div>
            </div>

            {/* Widget 3 */}
            <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl flex items-center justify-between shadow-md relative group">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />
              <div className="text-left leading-none min-w-0">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Meeting Minutes (30d)</span>
                <span className="text-2xl font-black text-emerald-450 font-mono tracking-tight">{totalMeetingMinutes} min</span>
                <span className="text-[9px] text-slate-505 font-bold uppercase tracking-wider block mt-2">Active call durations computed</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-555/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Interactive Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Concurrent Users (Line Chart) */}
            <div className="bg-slate-900/25 border border-slate-900 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-[360px] relative">
              <div className="text-left mb-4 select-none shrink-0">
                <h3 className="text-xs font-black text-slate-350 uppercase tracking-widest">Active Concurrent Users</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">WebSocket server sessions over last 24h</p>
              </div>

              {isBrandNew ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-850 rounded-xl relative select-none">
                  <BarChart2 className="w-10 h-10 text-slate-655 mb-2 opacity-50 stroke-[1.5]" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analytics will generate after your first 24 hours of activity.</span>
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.concurrentUsers} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        stroke="#475569"
                        fontSize={9}
                      />
                      <YAxis stroke="#475569" fontSize={9} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1e293b', borderRadius: '12px' }}
                        labelStyle={{ fontSize: '10px', color: '#475569', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '11px', color: '#22d3ee', fontWeight: 'bold' }}
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                      />
                      <Line type="monotone" dataKey="users" name="Active Users" stroke="#22d3ee" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 2: Storage Vault Capacity (Donut Chart) */}
            <div className="bg-slate-900/25 border border-slate-900 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-[360px] relative">
              <div className="text-left mb-4 select-none shrink-0">
                <h3 className="text-xs font-black text-slate-350 uppercase tracking-widest">Storage Vault Capacity</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Capacity distribution between files and recordings</p>
              </div>

              {isBrandNew || totalStorageBytes === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-850 rounded-xl relative select-none">
                  <Database className="w-10 h-10 text-slate-655 mb-2 opacity-50 stroke-[1.5]" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analytics will generate after your first 24 hours of activity.</span>
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={storageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {storageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1e293b', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                        formatter={(val: any) => formatFileSize(Number(val || 0))}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 3: Meeting Minutes (Bar Chart) - Full Row */}
            <div className="bg-slate-900/25 border border-slate-900 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-[360px] relative lg:col-span-2">
              <div className="text-left mb-4 select-none shrink-0">
                <h3 className="text-xs font-black text-slate-350 uppercase tracking-widest">Meeting Minutes History</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Total combined call session durations over the last 30 days</p>
              </div>

              {isBrandNew ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-850 rounded-xl relative select-none">
                  <Clock className="w-10 h-10 text-slate-655 mb-2 opacity-50 stroke-[1.5]" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analytics will generate after your first 24 hours of activity.</span>
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.meetingMinutes} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="day"
                        tickFormatter={(d) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        stroke="#475569"
                        fontSize={9}
                      />
                      <YAxis stroke="#475569" fontSize={9} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1e293b', borderRadius: '12px' }}
                        labelStyle={{ fontSize: '10px', color: '#475569', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '11px', color: '#22d3ee', fontWeight: 'bold' }}
                        labelFormatter={(d) => new Date(d).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      />
                      <Bar dataKey="minutes" name="Minutes" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
