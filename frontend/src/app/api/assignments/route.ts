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

    const { workspaceId, title, description, dueDate, recipientIds } = await request.json();

    if (!workspaceId || !title || !recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Initialize Supabase server client with the user's Auth Header context (respects RLS)
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

    // 2. Insert the main assignment record
    const { data: assignment, error: assignmentError } = await supabaseServer
      .from('assignments')
      .insert({
        workspace_id: workspaceId,
        teacher_id: user.id,
        title,
        description,
        due_date: dueDate || null,
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('[API/Assignments] Error inserting assignment:', assignmentError);
      return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    }

    // 3. Map selected students to assignment_recipients
    const recipientRows = recipientIds.map((studentId: string) => ({
      assignment_id: assignment.id,
      student_id: studentId,
      status: 'pending',
    }));

    const { error: recipientsError } = await supabaseServer
      .from('assignment_recipients')
      .insert(recipientRows);

    if (recipientsError) {
      console.error('[API/Assignments] Error inserting recipients:', recipientsError);
      return NextResponse.json({ error: recipientsError.message }, { status: 500 });
    }

    // 4. Retrieve students' emails to notify
    const { data: students, error: studentsError } = await supabaseServer
      .from('users')
      .select('email, display_name')
      .in('id', recipientIds);

    if (studentsError) {
      console.warn('[API/Assignments] Failed to fetch student emails:', studentsError.message);
    } else if (students && students.length > 0) {
      const studentEmails = students.map((s: any) => s.email);
      const teacherName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Your Teacher';
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #0891b2; border-bottom: 2px solid #0891b2; padding-bottom: 10px; margin-top: 0;">New AeroMeet Assignment</h2>
          <p>Hello,</p>
          <p>Teacher <strong>${teacherName}</strong> has assigned new work for you in your AeroMeet Workspace.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${title}</p>
            <p style="margin: 0 0 10px 0;"><strong>Description:</strong> ${description || 'No description provided.'}</p>
            <p style="margin: 0;"><strong>Due Date:</strong> ${dueDate ? new Date(dueDate).toLocaleString() : 'No due date specified.'}</p>
          </div>
          
          <p style="margin-top: 20px;">Please log in to your dashboard to view the details and submit your work.</p>
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;"/>
          <p style="font-size: 11px; color: #9ca3af; text-align: center;">This is an automated notification from AeroMeet collaboration engine.</p>
        </div>
      `;

      // Trigger email sending asynchronously
      sendEmail({
        to: studentEmails,
        subject: `[AeroMeet] New Assignment: ${title}`,
        html: emailHtml,
      }).catch(err => console.error('[API/Assignments] Async email send error:', err));
    }

    return NextResponse.json({ success: true, assignmentId: assignment.id });
  } catch (err: any) {
    console.error('[API/Assignments] Global handler exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
