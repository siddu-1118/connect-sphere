export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  notificationEmail: boolean;
  notificationPush: boolean;
  createdAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  code: string;
  hostId: string;
  scheduledAt: string | null;
  endedAt: string | null;
  isActive: boolean;
  createdAt: string;
  hostName?: string;
  hostAvatar?: string | null;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  joinedAt: string;
  leftAt: string | null;
}

export interface MeetingMessage {
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  inviteCode: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
}

export interface TeamMember {
  id: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface Channel {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  createdAt: string;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface CalendarEvent {
  id: string;
  userId: string;
  meetingId: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  meeting?: {
    id: string;
    code: string;
    title: string;
    isActive: boolean;
  } | null;
}