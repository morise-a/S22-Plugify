import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
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
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            signal: options?.signal || AbortSignal.timeout(3000),
          });
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  // Let stripe webhook bypass auth checks
  if (path.startsWith('/api/webhooks')) {
    return response;
  }

  let user = null;
  let role = 'customer';

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      if (
        authError.status === 400 ||
        authError.code?.includes('refresh_token') ||
        authError.message?.toLowerCase().includes('refresh token')
      ) {
        // Clear all Supabase cookies to prevent subsequent requests from failing/logging errors
        const sbCookies = request.cookies.getAll().filter((c) => c.name.startsWith('sb-'));
        sbCookies.forEach((c) => {
          request.cookies.delete(c.name);
        });

        // Recreate the response to forward the modified cookies and delete them in browser
        response = NextResponse.next({
          request,
        });
        sbCookies.forEach((c) => {
          response.cookies.delete(c.name);
        });
      }
    }

    user = authData?.user || null;

    if (user) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      role = dbUser?.role || 'customer';
    }
  } catch (err) {
    console.error('Supabase authentication or DB connection failed in proxy:', err);
  }

  const isAuthRoute = ['/signin', '/signup', '/forgot-password', '/reset-password'].includes(path);
  const isAdminRoute = path.startsWith('/admin');
  const isCustomerRoute = path.startsWith('/customer');

  if (user) {
    if (isAuthRoute) {
      const dest = role === 'admin' ? '/admin/dashboard' : '/customer/dashboard';
      return NextResponse.redirect(new URL(dest, request.url));
    }

    if (isAdminRoute && role !== 'admin') {
      return NextResponse.redirect(new URL('/customer/dashboard', request.url));
    }
  } else {
    if (isAdminRoute || isCustomerRoute) {
      const redirectUrl = new URL('/signin', request.url);
      redirectUrl.searchParams.set('redirectTo', path);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
