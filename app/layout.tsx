import type { Metadata } from 'next';
import { Figtree, Geist_Mono } from 'next/font/google';
import './globals.css';
import { createClient } from '../lib/supabase/server';
import { ToastProvider } from '../components/ui/toast';
import { ReactQueryProvider } from '../components/providers/react-query-provider';
import { ConditionalLayout } from '../components/layout/conditional-layout';

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Solution22 - Premium Store',
  description: 'Enterprise-grade SaaS eCommerce platform powered by Next.js & Supabase.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;

  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (authUser) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (dbUser) {
        user = {
          id: dbUser.id,
          email: dbUser.email || '',
          first_name: dbUser.first_name || '',
          last_name: dbUser.last_name || '',
          role: dbUser.role || 'customer',
        };
      }
    }
  } catch (error) {
    console.error('Failed to resolve auth session in RootLayout:', error);
  }

  return (
    <html
      lang="en"
      className={`${figtree.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ReactQueryProvider>
          <ToastProvider>
            <ConditionalLayout user={user}>
              {children}
            </ConditionalLayout>
          </ToastProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
