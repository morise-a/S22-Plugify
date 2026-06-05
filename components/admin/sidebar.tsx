'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Mail, Settings, LogOut, ArrowLeft, Menu, X, User } from 'lucide-react';
import { Button } from '../ui/button';
import { signOutAction } from '../../app/actions/auth';
import { useToast } from '../ui/toast';

interface SidebarProps {
  user: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  } | null;
}

export function AdminSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = [
    { label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, href: '/admin/dashboard' },
    { label: 'Products Catalog', icon: <ShoppingBag className="h-5 w-5" />, href: '/admin/products' },
    { label: 'Mail Templates', icon: <Mail className="h-5 w-5" />, href: '/admin/templates' },
    { label: 'Settings Panel', icon: <Settings className="h-5 w-5" />, href: '/admin/settings' },
  ];

  const handleLogout = async () => {
    try {
      const res = await signOutAction();
      if (res.success) {
        showToast('Signed Out', 'success', 'Logged out of admin panel.');
        router.push('/signin');
        router.refresh();
      } else {
        showToast('Logout Failed', 'error');
      }
    } catch (err) {
      showToast('Error', 'error', 'An unexpected error occurred.');
    }
  };

  const nameInitial = user?.first_name ? user.first_name[0].toUpperCase() : 'A';

  return (
    <>
      {/* Mobile Top Navbar */}
      <header className="md:hidden border-b border-slate-100 bg-white/95 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <Link href="/admin/dashboard" className="font-extrabold text-slate-900 text-lg tracking-tight flex items-center gap-2">
          <span className="h-7 w-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-600/20">A</span>
          ApexSaaS <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Admin</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 cursor-pointer"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Slide-out Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="fixed top-0 bottom-0 left-0 w-72 bg-white border-r border-slate-100 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-250 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <Link href="/admin/dashboard" className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <span className="h-7 w-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-600/20">A</span>
                  ApexSaaS <span className="text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full font-bold">PRO</span>
                </Link>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item, idx) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={idx}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                          : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/40'
                        }`}
                    >
                      <div className={isActive ? 'text-white' : 'text-slate-400'}>
                        {item.icon}
                      </div>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 px-2 py-2 bg-slate-50/60 border border-slate-100 rounded-xl">
                <div className="h-9 w-9 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">
                  {nameInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{user?.first_name} {user?.last_name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Link href="/" className="w-full">
                  <Button variant="outline" size="sm" className="w-full justify-center gap-1.5 text-xs h-9 border-slate-200/80 text-slate-600 hover:bg-slate-50">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Frontend Store
                  </Button>
                </Link>
                <Button variant="destructive" size="sm" onClick={handleLogout} className="w-full justify-center gap-1.5 text-xs h-9 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-0">
                  <LogOut className="h-3.5 w-3.5" />
                  Logout Session
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar Panel */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200/40 bg-white p-6 justify-between shrink-0 sticky top-0 h-screen shadow-[1px_0_0_0_rgba(0,0,0,0.01)]">
        <div className="space-y-10">
          <div>
            <Link href="/admin/dashboard" className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 hover:scale-[0.98] transition-transform duration-200">
              <span className="h-8 w-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-base shadow-md shadow-indigo-600/25">A</span>
              <span>ApexSaaS</span>
              <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Pro</span>
            </Link>
          </div>

          <nav className="space-y-1">
            {navItems.map((item, idx) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15 scale-[1.01]'
                      : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/30'
                    }`}
                >
                  <div className={`transition-transform duration-300 group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          {/* User Profile Info Card */}
          <div className="flex items-center gap-3 p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl">
            <div className="h-9 w-9 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">
              {nameInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-[9px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Link href="/" className="w-full">
              <Button variant="outline" size="sm" className="w-full justify-center gap-1.5 text-xs h-8 border-slate-200 text-slate-600 hover:bg-slate-50">
                <ArrowLeft className="h-3.5 w-3.5" />
                Frontend Store
              </Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={handleLogout} className="w-full justify-center gap-1.5 text-xs h-8 bg-red-50/50 text-red-600 hover:bg-red-600 hover:text-white border-0">
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
