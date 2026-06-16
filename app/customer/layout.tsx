import * as React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (error) {
    console.error('Failed to resolve auth session in CustomerLayout:', error);
  }

  if (!user) {
    redirect('/signin');
  }

  return (
    <div className="bg-secondary/15 flex-1 py-10 flex flex-col justify-start">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
