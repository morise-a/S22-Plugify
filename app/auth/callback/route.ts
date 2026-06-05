import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';

  if (code) {
    const supabase = await createClient();
    
    // Exchange the code for a session
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.user) {
      const user = data.user;
      
      // Check the user's role from database
      const { data: dbUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      const role = dbUser?.role || 'customer';
      
      // Determine redirection target
      let targetPath = next;
      if (next === '/') {
        targetPath = role === 'admin' ? '/admin/dashboard' : '/customer/dashboard';
      }
      
      return NextResponse.redirect(`${origin}${targetPath}`);
    }
  }

  // Redirect to signin with error parameter if authentication fails
  return NextResponse.redirect(`${origin}/signin?error=Authentication failed. Please try again.`);
}
