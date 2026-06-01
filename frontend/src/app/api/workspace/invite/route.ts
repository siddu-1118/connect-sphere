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

    const { email, workspaceId, workspaceName, isNewUser } = await request.json();

    if (!email || !workspaceId || !workspaceName) {
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

    // 1. Get authenticated user details (Teacher)
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid credentials' }, { status: 401 });
    }

    const teacherName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Your Teacher';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const loginLink = `${appUrl}/auth?inviteWorkspaceId=${workspaceId}`;

    let emailHtml = '';
    let subject = '';

    if (isNewUser) {
      subject = `[AeroMeet] Invitation to join workspace: ${workspaceName}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #0891b2; border-bottom: 2px solid #0891b2; padding-bottom: 10px; margin-top: 0;">AeroMeet Workspace Invite</h2>
          <p>Hello,</p>
          <p>Teacher <strong>${teacherName}</strong> has invited you to join their AeroMeet Workspace <strong>"${workspaceName}"</strong>.</p>
          
          <p>You don't have an AeroMeet account yet. Please sign up using Google through the link below to get started and automatically join the workspace:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginLink}" style="background-color: #0891b2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Sign Up & Join Workspace</a>
          </div>
          
          <p style="font-size: 11px; color: #9ca3af;">If the button doesn't work, copy and paste this URL into your browser: <br/> ${loginLink}</p>
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;"/>
          <p style="font-size: 11px; color: #9ca3af; text-align: center;">This is an automated notification from AeroMeet collaboration engine.</p>
        </div>
      `;
    } else {
      subject = `[AeroMeet] Added to workspace: ${workspaceName}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #0891b2; border-bottom: 2px solid #0891b2; padding-bottom: 10px; margin-top: 0;">Added to Workspace</h2>
          <p>Hello,</p>
          <p>Teacher <strong>${teacherName}</strong> has added you to their AeroMeet Workspace <strong>"${workspaceName}"</strong>.</p>
          
          <p>Since you already have an AeroMeet account, you can access the workspace immediately by logging in below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginLink}" style="background-color: #0891b2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Workspace</a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;"/>
          <p style="font-size: 11px; color: #9ca3af; text-align: center;">This is an automated notification from AeroMeet collaboration engine.</p>
        </div>
      `;
    }

    // Trigger email sending asynchronously
    const emailSent = await sendEmail({
      to: [email],
      subject,
      html: emailHtml,
    });

    return NextResponse.json({ success: true, emailSent });
  } catch (err: any) {
    console.error('[API/Workspace/Invite] Global handler exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
