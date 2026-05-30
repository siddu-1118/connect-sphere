import { Router } from 'express';
import { eq, and, gte, lte, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { calendarEvents, meetings } from '../db/schema';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';

const router = Router();

// --- Zod schemas ---
const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Event title is required').max(255),
    description: z.string().optional().nullable(),
    startsAt: z.string().datetime({ message: 'Invalid start time format' }),
    endsAt: z.string().datetime({ message: 'Invalid end time format' }),
    meetingId: z.string().uuid().optional().nullable(),
  }),
});

router.use(authenticate);

// GET / - Fetch calendar events inside date-range queries (?from=ISO_STRING&to=ISO_STRING)
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { from, to } = req.query;

    if (!from || !to) {
      res.status(400).json({ success: false, error: 'Query parameters from and to are required' });
      return;
    }

    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);

    // Fetch user events and join meeting details
    const events = await db
      .select({
        id: calendarEvents.id,
        userId: calendarEvents.userId,
        meetingId: calendarEvents.meetingId,
        title: calendarEvents.title,
        description: calendarEvents.description,
        startsAt: calendarEvents.startsAt,
        endsAt: calendarEvents.endsAt,
        createdAt: calendarEvents.createdAt,
        meeting: {
          id: meetings.id,
          code: meetings.code,
          title: meetings.title,
          isActive: meetings.isActive,
        },
      })
      .from(calendarEvents)
      .leftJoin(meetings, eq(calendarEvents.meetingId, meetings.id))
      .where(
        and(
          eq(calendarEvents.userId, userId),
          gte(calendarEvents.startsAt, fromDate),
          lte(calendarEvents.endsAt, toDate)
        )
      )
      .orderBy(asc(calendarEvents.startsAt));

    res.status(200).json({
      success: true,
      events,
    });
  } catch (error) {
    next(error);
  }
});

// POST / - Create a new calendar event
router.post('/', validate(createEventSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { title, description, startsAt, endsAt, meetingId } = req.body;

    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (start >= end) {
      res.status(400).json({ success: false, error: 'Starts time must be prior to the end time' });
      return;
    }

    // Optional verification of meetingId existence
    if (meetingId) {
      const [meetMatch] = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1);
      if (!meetMatch) {
        res.status(404).json({ success: false, error: 'Linked meeting room not found' });
        return;
      }
    }

    const [newEvent] = await db
      .insert(calendarEvents)
      .values({
        userId,
        title,
        description,
        startsAt: start,
        endsAt: end,
        meetingId: meetingId || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      event: newEvent,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - Delete a calendar event
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if event belongs to user
    const [existingEvent] = await db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
      .limit(1);

    if (!existingEvent) {
      res.status(404).json({ success: false, error: 'Calendar event not found or unauthorized' });
      return;
    }

    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));

    res.status(200).json({
      success: true,
      message: 'Calendar event cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;