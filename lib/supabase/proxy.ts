import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Skip user auth retrieval on static assets, stripe webhook, etc.
  const path = request.nextUrl.pathname;
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.includes('/api/webhooks')
  ) {
    return supabaseResponse;
  }

  // Refresh user session by calling getUser
  try {
    await supabase.auth.getUser();
  } catch (err) {
    console.error('Supabase session refresh failed in updateSession:', err);
  }

  // Wait, let's inspect user role if it's admin/customer. We will fetch role from public.users table.
  // Wait, we will implement routing protections inside standard proxy file in the root.
  
  return supabaseResponse;
}
