import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, integer } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'member']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  isVerified: boolean('is_verified').default(false),
  otpCode: varchar('otp_code', { length: 6 }),
  otpExpiresAt: timestamp('otp_expires_at'),
  refreshToken: text('refresh_token'),
  notificationEmail: boolean('notification_email').default(true),
  notificationPush: boolean('notification_push').default(true),
  googleAccessToken: text('google_access_token'),
  googleRefreshToken: text('google_refresh_token'),
  googleTokenExpiresAt: timestamp('google_token_expires_at'),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  code: varchar('passcode', { length: 12 }).unique().notNull(),
  hostId: uuid('host_id').references(() => users.id),
  scheduledAt: timestamp('scheduled_for'),
  endedAt: timestamp('ended_at'),
  isActive: boolean('is_active').default(true),
  recordingUrl: text('recording_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const meetingParticipants = pgTable('meeting_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').references(() => meetings.id),
  userId: uuid('user_id').references(() => users.id),
  joinedAt: timestamp('joined_at').defaultNow(),
  leftAt: timestamp('left_at')
});

export const meetingMessages = pgTable('meeting_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').references(() => meetings.id),
  userId: uuid('user_id').references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ownerId: uuid('owner_id').references(() => users.id),
  inviteCode: varchar('invite_code', { length: 12 }).unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id),
  userId: uuid('user_id').references(() => users.id),
  role: userRoleEnum('role').default('member'),
  joinedAt: timestamp('joined_at').defaultNow()
});

export const channels = pgTable('channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isPrivate: boolean('is_private').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

export const channelMessages = pgTable('channel_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id').references(() => channels.id),
  userId: uuid('user_id').references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  meetingId: uuid('meeting_id').references(() => meetings.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const meetingQuestions = pgTable('meeting_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  authorName: varchar('author_name', { length: 255 }).notNull(),
  text: text('text').notNull(),
  upvotes: text('upvotes').array().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: varchar('user_email', { length: 255 }),
  action: varchar('action', { length: 255 }).notNull(),
  targetId: varchar('target_id', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

export const concurrentUsersLog = pgTable('concurrent_users_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  activeUsers: integer('active_users').notNull()
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text('endpoint').unique().notNull(),
  keysAuth: text('keys_auth').notNull(),
  keysP256dh: text('keys_p256dh').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});