import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createActionClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // Actions are allowed to set cookies, so this rarely triggers,
            // but wrapped in try/catch for safety.
          }
        },
      },
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            signal: options?.signal || AbortSignal.timeout(15000),
          });
        },
      },
    }
  );
}
export type ActionClient = Awaited<ReturnType<typeof createActionClient>>;
