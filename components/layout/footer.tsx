'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '../ui/button';
import { GithubIcon, TwitterIcon, LinkedinIcon } from '../ui/icons';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/30 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link href="/" className="text-xl font-bold tracking-tight text-primary">
              Solution22
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Enterprise-grade SaaS eCommerce solutions to accelerate your subscription revenue.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-115"
              >
                <TwitterIcon size={20} />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-115"
              >
                <GithubIcon size={20} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-115"
              >
                <LinkedinIcon size={20} />
              </a>
            </div>
          </div>

          {/* Links Column 1 - Products */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wider capitalize">Products</h3>
            <ul className="mt-4 space-y-2">
              {['Features', 'Pricing', 'API Reference', 'Integrations'].map((link) => (
                <li key={link}>
                  <Link
                    href="/products"
                    className="group text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                  >
                    {link}
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 2 - Company */}
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wider capitalize">Company</h3>
            <ul className="mt-4 space-y-2">
              {['About Us', 'Contact Support', 'Careers', 'Privacy Policy'].map((link) => (
                <li key={link}>
                  <Link
                    href={link === 'Contact Support' ? '/contact' : link === 'Privacy Policy' ? '/privacy' : '#'}
                    className="group text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                  >
                    {link}
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground tracking-wider capitalize">Subscribe</h3>
            <p className="text-sm text-muted-foreground">
              Subscribe to get notified about updates and product releases.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="you@domain.com"
                className="h-9 px-3 text-xs bg-background border border-input rounded-lg flex-1 focus:outline-none focus:ring-1 focus:ring-ring"
                suppressHydrationWarning
              />
              <Button size="sm" className="h-9" suppressHydrationWarning>
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border/60 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} Solution22. All rights reserved. Built with Next.js & Supabase.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <a href="#" className="hover:text-foreground transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
