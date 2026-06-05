'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Footer } from './footer';

interface ConditionalLayoutProps {
  children: React.ReactNode;
  user: any;
}

export function ConditionalLayout({ children, user }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <main className="flex-1 flex flex-col">{children}</main>;
  }

  return (
    <>
      <Header user={user} />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </>
  );
}
