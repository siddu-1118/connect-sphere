import webpush from 'web-push';
import { db } from '../db';
import { meetings, meetingParticipants, pushSubscriptions } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

export function initVapidKeys() {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log('⚠️ VAPID keys not fully set in environment. Generating a temporary key-pair...');
    try {
      const keys = webpush.generateVAPIDKeys();
      vapidPublicKey = keys.publicKey;
      vapidPrivateKey = keys.privateKey;
      console.log('--------------------------------------------------');
      console.log('🚀 Generated Temporary VAPID Keys:');
      console.log(`Public Key:  ${vapidPublicKey}`);
      console.log(`Private Key: ${vapidPrivateKey}`);
      console.log('--------------------------------------------------');
    } catch (err) {
      console.error('❌ Failed to generate VAPID keys:', err);
    }
  }

  if (vapidPublicKey && vapidPrivateKey) {
    try {
      webpush.setVapidDetails(
        'mailto:support@aeromeet.local',
        vapidPublicKey,
        vapidPrivateKey
      );
      console.log('✅ Web-push VAPID details set successfully.');
    } catch (err) {
      console.error('❌ Failed to set VAPID details:', err);
    }
  }
}

export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { auth: string; p256dh: string } },
  payload: string
) {
  try {
    const subObj = {
      endpoint: subscription.endpoint,
      keys: {
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh
      }
    };
    await webpush.sendNotification(subObj, payload);
    console.log(`✉️ Push notification successfully sent to endpoint: ${subscription.endpoint}`);
  } catch (err: any) {
    console.error('❌ Error sending push notification:', err.statusCode, err.body || err);
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Return flag indicating subscription is expired/invalid and should be deleted
      return { shouldDelete: true };
    }
  }
  return { shouldDelete: false };
}

export async function checkAndSendMeetingReminders() {
  try {
    const now = new Date();
    // Check meetings starting between 4 and 5 minutes from now
    const start = new Date(now.getTime() + 4 * 60 * 1000);
    const end = new Date(now.getTime() + 5 * 60 * 1000);

    // Drizzle query for meetings starting in that window
    const upcomingMeetings = await db
      .select()
      .from(meetings)
      .where(
        sql`${meetings.scheduledAt} >= ${start} AND ${meetings.scheduledAt} <= ${end}`
      );

    for (const meeting of upcomingMeetings) {
      console.log(`🔔 Meeting "${meeting.title}" is starting in 5 minutes. Sending notifications...`);
      
      // Identify all users to notify: host + participants
      const userIds = new Set<string>();
      if (meeting.hostId) {
        userIds.add(meeting.hostId);
      }

      const participants = await db
        .select()
        .from(meetingParticipants)
        .where(eq(meetingParticipants.meetingId, meeting.id));

      for (const p of participants) {
        if (p.userId) {
          userIds.add(p.userId);
        }
      }

      // Send push notification to all these users
      for (const userId of userIds) {
        const subscriptions = await db
          .select()
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, userId));

        const payload = JSON.stringify({
          title: 'Meeting Starting Soon 🚀',
          body: `"${meeting.title}" starts in 5 minutes.`,
          data: {
            url: `/meet/${meeting.code}`
          }
        });

        for (const sub of subscriptions) {
          const { shouldDelete } = await sendPushNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                auth: sub.keysAuth,
                p256dh: sub.keysP256dh
              }
            },
            payload
          );

          if (shouldDelete) {
            console.log(`🗑️ Deleting invalid push subscription: ${sub.endpoint}`);
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ Error checking/sending meeting reminders:', err);
  }
}
