'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, User, Menu, X, LogOut } from 'lucide-react';
import { NotificationBell } from '../ui/notification-bell';
import { useCartStore } from '../../lib/store/use-cart-store';
import { Button } from '../ui/button';
import { signOutAction } from '../../app/actions/auth';
import { useToast } from '../ui/toast';

interface HeaderProps {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const cartItems = useCartStore((state) => state.items);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  // Cart item count sum
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    const res = await signOutAction();
    if (res.success) {
      showToast('Signed out', 'success', 'Successfully logged out of your session.');
      router.push('/');
      router.refresh();
    } else {
      showToast('Sign out failed', 'error', res.error);
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 border-b ${
        scrolled
          ? 'bg-background/80 backdrop-blur-md shadow-sm border-border/80'
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tight text-primary">
            Solution22
          </Link>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="/products"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Products
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          {/* Notification bell — only for logged in users */}
          {user && <NotificationBell variant="customer" />}

          {/* Cart button */}
          <Link href="/cart" className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-bounce">
                {cartCount}
              </span>
            )}
          </Link>

          {/* User Profile / Dashboard Controls */}
          {user ? (
            <div className="hidden md:flex items-center gap-4">
              <Button href={user.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard'} variant="outline" size="sm" className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-9 w-9 p-0 rounded-full" title="Log Out">
                <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Button href="/signin" variant="ghost" size="sm">Sign In</Button>
              <Button href="/signup" size="sm">Get Started</Button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="md:hidden p-2 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card p-4 space-y-4 animate-fade-in">
          <nav className="flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary/40"
            >
              Home
            </Link>
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary/40"
            >
              Products
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary/40"
            >
              Contact
            </Link>
            <hr className="border-border/60" />
            
            {user ? (
              <>
                <Link
                  href={user.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary/40"
                >
                  <User className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-destructive hover:bg-destructive/10 p-2 rounded-lg text-left cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button href="/signin" onClick={() => setMobileMenuOpen(false)} variant="outline" className="w-full">Sign In</Button>
                <Button href="/signup" onClick={() => setMobileMenuOpen(false)} className="w-full">Sign Up</Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
