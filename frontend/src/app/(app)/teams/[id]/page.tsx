'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Plus, Hash, UserCheck, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useSocket } from '../../../../hooks/useSocket';
import { useChannelChat } from '../../../../hooks/useChannelChat';
import { useAuth } from '../../../../hooks/useAuth';
import api from '../../../../lib/api';
import { Channel, TeamMember, Team } from '../../../../types';
import Spinner from '../../../../components/ui/Spinner';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Modal from '../../../../components/ui/Modal';
import Badge from '../../../../components/ui/Badge';
import Avatar from '../../../../components/ui/Avatar';
import ChannelList from '../../../../components/teams/ChannelList';
import ChannelChat from '../../../../components/teams/ChannelChat';
import { cn } from '../../../../lib/utils';

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const socket = useSocket();
  const { user: currentUser } = useAuth();

  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  
  // Selected channel state
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'channels' | 'chat' | 'members'>('channels');

  // Channel Creation Modal states
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [channelNameError, setChannelNameError] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Fetch workspace details (channels, members)
  const fetchWorkspaceDetails = async () => {
    try {
      const response = await api.get(`/teams/${teamId}`);
      if (response.data.success) {
        setTeam(response.data.team);
        const fetchedChannels = response.data.channels;
        setChannels(fetchedChannels);
        setMembers(response.data.members);

        // Auto select '#general' channel if none is selected
        if (fetchedChannels.length > 0 && !selectedChannelId) {
          const general = fetchedChannels.find((c: any) => c.name === 'general') || fetchedChannels[0];
          setSelectedChannelId(general.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch team details:', err);
      router.replace('/teams'); // redirect back if error
    } finally {
      setLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceDetails();
  }, [teamId]);

  // Hook real-time channel chats to center panel
  const activeChannel = channels.find((c) => c.id === selectedChannelId);
  const {
    messages,
    loading: loadingChat,
    sendMsg,
  } = useChannelChat(teamId, selectedChannelId, socket);

  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) {
      setChannelNameError('Channel name is required');
      return;
    }
    setChannelNameError('');

    setCreatingChannel(true);
    try {
      const response = await api.post(`/teams/${teamId}/channels`, {
        name: channelName.trim(),
        description: channelDesc.trim() || null,
        isPrivate: false,
      });

      if (response.data.success) {
        setIsChannelModalOpen(false);
        setChannelName('');
        setChannelDesc('');
        
        // Refresh details, select newly created channel
        const newChan = response.data.channel;
        await fetchWorkspaceDetails();
        setSelectedChannelId(newChan.id);
      }
    } catch (err) {
      console.error(err);
      alert('Could not create channel.');
    } finally {
      setCreatingChannel(false);
    }
  };

  if (loadingWorkspace) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Spinner size="lg" className="border-t-purple-500 w-12 h-12" />
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest animate-pulse">
          Opening Workspace...
        </p>
      </div>
    );
  }

  const roleVariants = {
    owner: 'primary',
    admin: 'success',
    member: 'secondary',
  } as const;

  return (
    <div className="h-[calc(100vh-180px)] flex bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* 1. Left Channel list Panel */}
      {team && (
        <div className={cn(
          "h-full shrink-0 md:flex md:w-60",
          mobileView === 'channels' ? 'flex w-full' : 'hidden'
        )}>
          <ChannelList
            teamName={team.name}
            role={team.role}
            channels={channels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={(id) => {
              setSelectedChannelId(id);
              setMobileView('chat');
            }}
            onCreateChannelClick={() => setIsChannelModalOpen(true)}
          />
        </div>
      )}

      {/* 2. Central Channel Chat Board */}
      <div className={cn(
        "flex-1 flex flex-col h-full border-r border-slate-900",
        mobileView === 'chat' ? 'flex w-full' : 'hidden md:flex'
      )}>
        {activeChannel ? (
          <ChannelChat
            channelName={activeChannel.name}
            messages={messages}
            loading={loadingChat}
            onSendMessage={sendMsg}
            onBackToChannels={() => setMobileView('channels')}
            onViewMembers={() => setMobileView('members')}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <Hash className="w-12 h-12 text-slate-700 mb-4" />
            <h3 className="text-sm font-bold text-white mb-1">No Channel Selected</h3>
            <p className="text-xs text-slate-500">Select a channel from the left sidebar to view discussions.</p>
          </div>
        )}
      </div>

      {/* 3. Right Members Sidebar */}
      <aside className={cn(
        "bg-slate-950/65 flex flex-col shrink-0 h-full backdrop-blur-xl md:w-60",
        mobileView === 'members' ? 'flex w-full' : 'hidden lg:flex'
      )}>
        <div className="px-5 py-4 border-b border-slate-900 bg-slate-950 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileView('chat')}
            className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all shrink-0"
            aria-label="Back to chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Users className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-black text-white tracking-widest uppercase">
            Members
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-400 text-[10px] font-bold">
            {members.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={member.user.name} src={member.user.avatarUrl} size="sm" className="shadow-md" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate leading-none mb-1">
                    {member.user.name}
                  </p>
                  <p className="text-[9px] text-slate-500 truncate leading-none">
                    {member.user.email}
                  </p>
                </div>
              </div>
              <Badge variant={roleVariants[member.role]} className="uppercase text-[8px] px-1.5 shrink-0">
                {member.role}
              </Badge>
            </div>
          ))}
        </div>
      </aside>

      {/* CREATE CHANNEL MODAL */}
      <Modal isOpen={isChannelModalOpen} onClose={() => setIsChannelModalOpen(false)} title="Create Text Channel">
        <form onSubmit={handleCreateChannelSubmit} className="flex flex-col gap-4">
          <Input
            label="Channel Name"
            type="text"
            placeholder="e.g. brainstorming or announcements"
            value={channelName}
            onChange={(e) => {
              const val = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
              setChannelName(val);
              if (val.trim()) setChannelNameError('');
            }}
            error={channelNameError}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Description (Optional)
            </label>
            <textarea
              placeholder="e.g. Chat topic or general agenda"
              rows={3}
              value={channelDesc}
              onChange={(e) => setChannelDesc(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-xl text-sm text-slate-200 placeholder:text-slate-500 transition-colors shadow-inner resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-850 flex items-center justify-end gap-3 bg-slate-900/10">
            <Button type="button" variant="ghost" onClick={() => setIsChannelModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={creatingChannel}>
              Create Channel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
