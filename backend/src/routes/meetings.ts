import { Router } from 'express';
import { eq, and, desc, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { meetings, meetingParticipants, users, meetingQuestions } from '../db/schema';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';

const router = Router();

// Help function to generate 'xxx-xxxx-xxx' Google Meet style codes
function generateMeetingCode(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const pick = (count: number) => {
    let out = '';
    for (let i = 0; i < count; i++) {
      out += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return out;
  };
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
}

// --- Zod schemas ---
const createMeetingSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Meeting title is required').max(255),
    scheduledAt: z.string().datetime({ message: 'Invalid datetime format' }).optional().nullable(),
  }),
});

router.use(authenticate);

// GET / - List all user's meetings (upcoming, scheduled, and past)
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Fetch meetings hosted by the user or where user was a participant
    const userMeetings = await db
      .select({
        id: meetings.id,
        title: meetings.title,
        code: meetings.code,
        hostId: meetings.hostId,
        scheduledAt: meetings.scheduledAt,
        endedAt: meetings.endedAt,
        isActive: meetings.isActive,
        recordingUrl: meetings.recordingUrl,
        createdAt: meetings.createdAt,
      })
      .from(meetings)
      .leftJoin(meetingParticipants, eq(meetings.id, meetingParticipants.meetingId))
      .where(
        or(
          eq(meetings.hostId, userId),
          eq(meetingParticipants.userId, userId)
        )
      )
      .orderBy(desc(meetings.createdAt));

    // Deduplicate meetings since multiple participations could lead to duplicate rows
    const uniqueMeetingsMap = new Map<string, typeof userMeetings[number]>();
    for (const m of userMeetings) {
      uniqueMeetingsMap.set(m.id, m);
    }
    const result = Array.from(uniqueMeetingsMap.values());

    res.status(200).json({
      success: true,
      meetings: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST / - Create a new meeting (instant or scheduled)
router.post('/', validate(createMeetingSchema), async (req, res, next) => {
  try {
    const hostId = req.user!.id;
    const { title, scheduledAt } = req.body;

    let code = generateMeetingCode();
    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const match = await db.select().from(meetings).where(eq(meetings.code, code)).limit(1);
      if (match.length === 0) break;
      code = generateMeetingCode();
      attempts++;
    }

    const [newMeeting] = await db
      .insert(meetings)
      .values({
        title,
        code,
        hostId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        isActive: true,
      })
      .returning();

    res.status(201).json({
      success: true,
      meeting: newMeeting,
      shareableLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/meet/${code}`,
    });
  } catch (error) {
    next(error);
  }
});

// GET /sync/time - Fetch server current time for NTP sync
router.get('/sync/time', async (req, res, next) => {
  try {
    res.status(200).json({ success: true, serverTime: Date.now() });
  } catch (error) {
    next(error);
  }
});

// GET /:code - Fetch a meeting by code
router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    const [meeting] = await db
      .select({
        id: meetings.id,
        title: meetings.title,
        code: meetings.code,
        hostId: meetings.hostId,
        scheduledAt: meetings.scheduledAt,
        endedAt: meetings.endedAt,
        isActive: meetings.isActive,
        recordingUrl: meetings.recordingUrl,
        createdAt: meetings.createdAt,
        hostName: users.name,
        hostAvatar: users.avatarUrl,
      })
      .from(meetings)
      .leftJoin(users, eq(meetings.hostId, users.id))
      .where(eq(meetings.code, code))
      .limit(1);

    if (!meeting) {
      res.status(404).json({ success: false, error: 'Meeting not found' });
      return;
    }

    res.status(200).json({
      success: true,
      meeting,
    });
  } catch (error) {
    next(error);
  }
});

// POST /:code/join - Record participant join
router.post('/:code/join', async (req, res, next) => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;

    const [meeting] = await db.select().from(meetings).where(eq(meetings.code, code)).limit(1);
    if (!meeting) {
      res.status(404).json({ success: false, error: 'Meeting room not found' });
      return;
    }

    if (!meeting.isActive) {
      res.status(400).json({ success: false, error: 'This meeting room has already closed' });
      return;
    }

    // Insert participant record
    const [participant] = await db
      .insert(meetingParticipants)
      .values({
        meetingId: meeting.id,
        userId,
        joinedAt: new Date(),
      })
      .returning();

    res.status(200).json({
      success: true,
      participantId: participant.id,
      meeting,
    });
  } catch (error) {
    next(error);
  }
});

// POST /:code/leave - Record participant leave
router.post('/:code/leave', async (req, res, next) => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;

    const [meeting] = await db.select().from(meetings).where(eq(meetings.code, code)).limit(1);
    if (!meeting) {
      res.status(404).json({ success: false, error: 'Meeting not found' });
      return;
    }

    // Find the active participant row that hasn't left yet
    const activeParticipants = await db
      .select()
      .from(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, meeting.id),
          eq(meetingParticipants.userId, userId)
        )
      )
      .orderBy(desc(meetingParticipants.joinedAt))
      .limit(1);

    if (activeParticipants.length > 0 && !activeParticipants[0].leftAt) {
      await db
        .update(meetingParticipants)
        .set({
          leftAt: new Date(),
        })
        .where(eq(meetingParticipants.id, activeParticipants[0].id));
    }

    res.status(200).json({
      success: true,
      message: 'Leave recorded successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /:code/end - End the meeting room (host only)
router.post('/:code/end', async (req, res, next) => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;

    const [meeting] = await db.select().from(meetings).where(eq(meetings.code, code)).limit(1);
    if (!meeting) {
      res.status(404).json({ success: false, error: 'Meeting not found' });
      return;
    }

    if (meeting.hostId !== userId) {
      res.status(403).json({ success: false, error: 'Unauthorized: Only the host can close the meeting' });
      return;
    }

    // Deactivate meeting
    await db
      .update(meetings)
      .set({
        isActive: false,
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meeting.id));

    // Update all active participants who haven't left yet
    await db
      .update(meetingParticipants)
      .set({
        leftAt: new Date(),
      })
      .where(
        and(
          eq(meetingParticipants.meetingId, meeting.id),
          eq(meetingParticipants.leftAt, null as any)
        )
      );

    res.status(200).json({
      success: true,
      message: 'Meeting terminated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /:code/questions - Fetch questions for a meeting code
router.get('/:code/questions', async (req, res, next) => {
  try {
    const { code } = req.params;
    const [meeting] = await db.select().from(meetings).where(eq(meetings.code, code)).limit(1);
    if (!meeting) {
      res.status(404).json({ success: false, error: 'Meeting not found' });
      return;
    }

    const questions = await db
      .select()
      .from(meetingQuestions)
      .where(eq(meetingQuestions.meetingId, meeting.id))
      .orderBy(desc(meetingQuestions.createdAt));

    res.status(200).json({ success: true, questions });
  } catch (error) {
    next(error);
  }
});

// POST /:code/questions - Add a question to the meeting
router.post('/:code/questions', async (req, res, next) => {
  try {
    const { code } = req.params;
    const { text } = req.body;
    const userId = req.user!.id;

    if (!text || !text.trim()) {
      res.status(400).json({ success: false, error: 'Question content is required' });
      return;
    }

    const [meeting] = await db.select().from(meetings).where(eq(meetings.code, code)).limit(1);
    if (!meeting) {
      res.status(404).json({ success: false, error: 'Meeting not found' });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const authorName = user?.name || 'Anonymous';

    const [newQuestion] = await db
      .insert(meetingQuestions)
      .values({
        meetingId: meeting.id,
        userId,
        authorName,
        text: text.trim(),
        upvotes: [],
      })
      .returning();

    res.status(201).json({ success: true, question: newQuestion });
  } catch (error) {
    next(error);
  }
});

// POST /:code/questions/:questionId/upvote - Toggle upvote on a question
router.post('/:code/questions/:questionId/upvote', async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const userId = req.user!.id;

    const [question] = await db
      .select()
      .from(meetingQuestions)
      .where(eq(meetingQuestions.id, questionId))
      .limit(1);

    if (!question) {
      res.status(404).json({ success: false, error: 'Question not found' });
      return;
    }

    let nextUpvotes = [...(question.upvotes || [])];
    const userIndex = nextUpvotes.indexOf(userId);

    if (userIndex !== -1) {
      nextUpvotes.splice(userIndex, 1);
    } else {
      nextUpvotes.push(userId);
    }

    const [updatedQuestion] = await db
      .update(meetingQuestions)
      .set({ upvotes: nextUpvotes })
      .where(eq(meetingQuestions.id, questionId))
      .returning();

    res.status(200).json({ success: true, question: updatedQuestion });
  } catch (error) {
    next(error);
  }
});

// PUT /:code/recording - Update meeting recording URL
router.put('/:code/recording', async (req, res, next) => {
  try {
    const { code } = req.params;
    const { recordingUrl } = req.body;

    if (!recordingUrl) {
      res.status(400).json({ success: false, error: 'recordingUrl is required' });
      return;
    }

    const [meeting] = await db.select().from(meetings).where(eq(meetings.code, code)).limit(1);
    if (!meeting) {
      res.status(404).json({ success: false, error: 'Meeting not found' });
      return;
    }

    const [updatedMeeting] = await db
      .update(meetings)
      .set({ recordingUrl })
      .where(eq(meetings.code, code))
      .returning();

    res.status(200).json({ success: true, meeting: updatedMeeting });
  } catch (error) {
    next(error);
  }
});

export default router;