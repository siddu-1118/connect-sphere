import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/emailService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header is required' }, { status: 401 });
    }

    const { channelId, content, priority, recipientIds } = await request.json();

    if (!channelId || !content || !priority) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Initialize Supabase server client with the user's Auth Header context
    const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // 1. Get authenticated user details
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid credentials' }, { status: 401 });
    }

    // 2. Insert message into messages table
    const { data: message, error: messageError } = await supabaseServer
      .from('messages')
      .insert({
        channel_id: channelId,
        user_id: user.id,
        content,
        priority,
      })
      .select()
      .single();

    if (messageError) {
      console.error('[API/Messages] Error inserting message:', messageError);
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    // 3. Map selected recipients to message_recipients if recipients are selected
    if (recipientIds && Array.isArray(recipientIds) && recipientIds.length > 0) {
      const recipientRows = recipientIds.map((studentId: string) => ({
        message_id: message.id,
        student_id: studentId,
      }));

      const { error: recipientsError } = await supabaseServer
        .from('message_recipients')
        .insert(recipientRows);

      if (recipientsError) {
        console.error('[API/Messages] Error inserting recipients:', recipientsError);
        return NextResponse.json({ error: recipientsError.message }, { status: 500 });
      }

      // 4. Retrieve students' emails to notify
      const { data: students, error: studentsError } = await supabaseServer
        .from('users')
        .select('email, display_name')
        .in('id', recipientIds);

      if (studentsError) {
        console.warn('[API/Messages] Failed to fetch student emails:', studentsError.message);
      } else if (students && students.length > 0) {
        const studentEmails = students.map((s: any) => s.email);
        const senderName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Aero User';
        
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #ffffff;">
            <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px; margin-top: 0;">Urgent AeroMeet Update</h2>
            <p>Hello,</p>
            <p><strong>${senderName}</strong> has posted a high-priority message for you in the channel chat:</p>
            
            <blockquote style="border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; background-color: #fef2f2; color: #1f2937; font-style: italic; border-radius: 4px;">
              ${content}
            </blockquote>
            
            <p style="margin-top: 20px;">Please log in to your workspace dashboard to reply to this message.</p>
            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;"/>
            <p style="font-size: 11px; color: #9ca3af; text-align: center;">This is an automated notification from AeroMeet collaboration engine.</p>
          </div>
        `;

        // Trigger email sending asynchronously
        sendEmail({
          to: studentEmails,
          subject: `[AeroMeet] [${priority}] High-Priority Message from ${senderName}`,
          html: emailHtml,
        }).catch(err => console.error('[API/Messages] Async email send error:', err));
      }
    }

    return NextResponse.json({ success: true, messageId: message.id });
  } catch (err: any) {
    console.error('[API/Messages] Global handler exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
