import * as React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
