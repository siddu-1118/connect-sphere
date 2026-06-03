import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('sb-access-token')?.value;

    if (!token) {
      // Standard users redirect to dashboard silently
      console.log('🔒 Middleware: No token found. Redirecting to dashboard.');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey,
        },
      });

      if (!res.ok) {
        console.log(`🔒 Middleware: Auth check failed with status ${res.status}. Redirecting to dashboard.`);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      const userData = await res.json();
      const isAdmin = userData?.app_metadata?.is_admin === true;

      if (!isAdmin) {
        console.log('🔒 Middleware: Access denied. User is not an admin. Redirecting to dashboard.');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      console.log('🔓 Middleware: Access granted to Admin Console.');
    } catch (err) {
      console.error('🔒 Middleware error verifying token:', err);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
