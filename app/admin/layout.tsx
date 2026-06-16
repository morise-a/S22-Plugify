import * as React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { AdminSidebar } from '../../components/admin/sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  let dbUser = null;
  
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;

    if (user) {
      const { data: dbUserData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      dbUser = dbUserData;
    }
  } catch (error) {
    console.error('Failed to resolve auth session or DB user in AdminLayout:', error);
  }

  // Guard: Verify user is authenticated
  if (!user) {
    redirect('/signin');
  }

  // Guard: Verify user is admin
  if (!dbUser || dbUser.role !== 'admin') {
    redirect('/customer/dashboard');
  }

  const userProfile = {
    first_name: dbUser.first_name || '',
    last_name: dbUser.last_name || '',
    email: dbUser.email || '',
    role: dbUser.role || 'customer',
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8fafc] text-foreground font-sans">
      <AdminSidebar user={userProfile} />
      
      {/* Main content body wrapper */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-5 sm:p-8 md:p-10 bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}
