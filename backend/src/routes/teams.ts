import { Router } from 'express';
import { eq, and, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { teams, teamMembers, channels, channelMessages, users } from '../db/schema';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';

const router = Router();

// Help function to generate uppercase 12-char invite codes
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

// --- Zod schemas ---
const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Team name is required').max(255),
    description: z.string().optional().nullable(),
  }),
});

const joinTeamSchema = z.object({
  body: z.object({
    inviteCode: z.string().length(12, 'Invite code must be exactly 12 characters'),
  }),
});

const createChannelSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Channel name is required').max(255),
    description: z.string().optional().nullable(),
    isPrivate: z.boolean().optional(),
  }),
});

router.use(authenticate);

// GET / - List all teams the user belongs to
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Join teamMembers table to teams table to find all team rows
    const userTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        ownerId: teams.ownerId,
        inviteCode: teams.inviteCode,
        createdAt: teams.createdAt,
        role: teamMembers.role,
      })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, userId))
      .orderBy(desc(teams.createdAt));

    res.status(200).json({
      success: true,
      teams: userTeams,
    });
  } catch (error) {
    next(error);
  }
});

// POST / - Create a new team
router.post('/', validate(createTeamSchema), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const { name, description } = req.body;

    let inviteCode = generateInviteCode();
    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const match = await db.select().from(teams).where(eq(teams.inviteCode, inviteCode)).limit(1);
      if (match.length === 0) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    // 1. Insert team
    const [newTeam] = await db
      .insert(teams)
      .values({
        name,
        description,
        ownerId,
        inviteCode,
      })
      .returning();

    // 2. Insert creator as owner member
    await db.insert(teamMembers).values({
      teamId: newTeam.id,
      userId: ownerId,
      role: 'owner',
    });

    // 3. Create default general channel
    const [generalChannel] = await db
      .insert(channels)
      .values({
        teamId: newTeam.id,
        name: 'general',
        description: 'Default general chat room',
        isPrivate: false,
      })
      .returning();

    res.status(201).json({
      success: true,
      team: {
        ...newTeam,
        role: 'owner',
      },
      generalChannel,
    });
  } catch (error) {
    next(error);
  }
});

// POST /join - Join a team by invite code
router.post('/join', validate(joinTeamSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { inviteCode } = req.body;

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.inviteCode, inviteCode.toUpperCase()))
      .limit(1);

    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found for this invite code' });
      return;
    }

    // Check if user is already a member
    const existingMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, userId)
        )
      )
      .limit(1);

    if (existingMember.length > 0) {
      res.status(400).json({ success: false, error: 'You are already a member of this team' });
      return;
    }

    // Join team
    const [member] = await db
      .insert(teamMembers)
      .values({
        teamId: team.id,
        userId,
        role: 'member',
      })
      .returning();

    res.status(200).json({
      success: true,
      message: 'Joined team successfully',
      team,
    });
  } catch (error) {
    next(error);
  }
});

// GET /:id - Get team details + members + channels
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if user is a member
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, id),
          eq(teamMembers.userId, userId)
        )
      )
      .limit(1);

    if (!membership) {
      res.status(403).json({ success: false, error: 'Unauthorized: You are not a member of this team' });
      return;
    }

    // Get team
    const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }

    // Get channels
    const teamChannels = await db
      .select()
      .from(channels)
      .where(eq(channels.teamId, id))
      .orderBy(asc(channels.createdAt));

    // Get members
    const teamMembersList = await db
      .select({
        id: teamMembers.id,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, id))
      .orderBy(asc(users.name));

    res.status(200).json({
      success: true,
      team: {
        ...team,
        role: membership.role,
      },
      channels: teamChannels,
      members: teamMembersList,
    });
  } catch (error) {
    next(error);
  }
});

// POST /:id/channels - Create a channel inside a team
router.post('/:id/channels', validate(createChannelSchema), async (req, res, next) => {
  try {
    const { id: teamId } = req.params;
    const userId = req.user!.id;
    const { name, description, isPrivate } = req.body;

    // Check if user is member with creator privileges (owner or admin)
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .limit(1);

    if (!membership) {
      res.status(403).json({ success: false, error: 'Unauthorized: You are not a member of this team' });
      return;
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Unauthorized: Only owner and admin can create channels' });
      return;
    }

    // Clean name: only alphanumeric, dashes, and underscores, all lowercase
    const slugName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');

    // Create channel
    const [newChannel] = await db
      .insert(channels)
      .values({
        teamId,
        name: slugName,
        description,
        isPrivate: isPrivate || false,
      })
      .returning();

    res.status(201).json({
      success: true,
      channel: newChannel,
    });
  } catch (error) {
    next(error);
  }
});

// GET /:id/channels/:channelId/messages - Get paginated channel messages
router.get('/:id/channels/:channelId/messages', async (req, res, next) => {
  try {
    const { id: teamId, channelId } = req.params;
    const userId = req.user!.id;

    // Check if user is a member
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        )
      )
      .limit(1);

    if (!membership) {
      res.status(403).json({ success: false, error: 'Unauthorized: You are not a member of this team' });
      return;
    }

    // Optional query pagination
    const limit = parseInt(req.query.limit as string || '50');
    const offset = parseInt(req.query.offset as string || '0');

    // Fetch messages
    const messages = await db
      .select({
        id: channelMessages.id,
        channelId: channelMessages.channelId,
        content: channelMessages.content,
        createdAt: channelMessages.createdAt,
        user: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(channelMessages)
      .innerJoin(users, eq(channelMessages.userId, users.id))
      .where(eq(channelMessages.channelId, channelId))
      .orderBy(desc(channelMessages.createdAt))
      .limit(limit)
      .offset(offset);

    // Save and send in correct chronological order for frontends
    const chronologicalMessages = messages.reverse();

    res.status(200).json({
      success: true,
      messages: chronologicalMessages,
    });
  } catch (error) {
    next(error);
  }
});

// POST /:id/channels/:channelId/messages - Post a new message to a channel
const createChannelMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Message cannot be empty'),
  }),
});

router.post('/:id/channels/:channelId/messages', validate(createChannelMessageSchema), async (req, res, next) => {
  try {
    const { id: teamId, channelId } = req.params;
    const userId = req.user!.id;
    const { content } = req.body;

    // Check membership
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .limit(1);

    if (!membership) {
      res.status(403).json({ success: false, error: 'Unauthorized: You are not a member of this team' });
      return;
    }

    // Insert message
    const [newMessage] = await db
      .insert(channelMessages)
      .values({
        channelId,
        userId,
        content,
      })
      .returning();

    // Fetch user details for instant append
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    res.status(201).json({
      success: true,
      message: {
        id: newMessage.id,
        channelId: newMessage.channelId,
        content: newMessage.content,
        createdAt: newMessage.createdAt,
        user: {
          id: user.id,
          name: user.name,
          avatarUrl: user?.avatarUrl || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;