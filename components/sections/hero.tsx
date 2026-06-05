'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Play, Sparkles, Activity, DollarSign, Users, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';

export function Hero() {
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Motion values to track absolute mouse coordinates
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs to avoid jittery motions
  const springConfig = { damping: 25, stiffness: 180, mass: 0.5 };
  const rotateX = useSpring(useTransform(y, [-300, 300], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(x, [-300, 300], [-15, 15]), springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <section className="relative overflow-hidden py-20 lg:py-32 flex flex-col items-center justify-center border-b border-border/40">
      {/* Decorative background radial glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.100),white)] dark:bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.950/20),theme(colors.background))]" />
      <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-10 left-1/4 -z-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
        {/* Sparkle Tag */}
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 animate-pulse">
          <Sparkles className="h-3 w-3" />
          <span>Next-Generation SaaS eCommerce</span>
        </div>

        {/* Hero Copy */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-none bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
            Launch Your Subscription Product in Minutes
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            A production-ready eCommerce suite with customer portal, advanced metrics, SMTP mailers, and automated Stripe billing integrations.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link href="/products">
            <Button size="lg" className="inline-flex items-center gap-2">
              Browse Products
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" size="lg" className="inline-flex items-center gap-2">
              <Play className="h-4 w-4 fill-current" />
              Book a Demo
            </Button>
          </Link>
        </div>

        {/* 3D Dashboard Mockup Card */}
        <div className="pt-12 perspective-1000 flex justify-center">
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY }}
            className="w-full max-w-4xl rounded-2xl border border-border/80 bg-card/60 shadow-2xl overflow-hidden preserve-3d glass-panel"
          >
            {/* Header Row of Dashboard */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-secondary/30">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-muted-foreground font-mono">dashboard.apexsaas.com</span>
              <div className="w-12 h-2" />
            </div>

            {/* Dashboard Content Mockup */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
              {/* Stat Card 1 */}
              <div className="p-4 rounded-xl border border-border/60 bg-background/50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Monthly Recurring Revenue</p>
                  <h4 className="text-lg font-bold text-foreground mt-1">$45,290.00</h4>
                  <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">+12.4% from last month</p>
                </div>
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>

              {/* Stat Card 2 */}
              <div className="p-4 rounded-xl border border-border/60 bg-background/50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Active Customers</p>
                  <h4 className="text-lg font-bold text-foreground mt-1">1,482</h4>
                  <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">+8.1% from last week</p>
                </div>
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
              </div>

              {/* Stat Card 3 */}
              <div className="p-4 rounded-xl border border-border/60 bg-background/50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Checkout Conversions</p>
                  <h4 className="text-lg font-bold text-foreground mt-1">4.82%</h4>
                  <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">Optimum conversion level</p>
                </div>
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>

              {/* Big Row Graphic Mockup */}
              <div className="sm:col-span-3 p-5 rounded-xl border border-border/60 bg-background/50 h-48 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-foreground">Sales Revenue Forecast</h4>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-primary rounded-md font-medium">Monthly</span>
                    <span className="text-muted-foreground">Yearly</span>
                  </div>
                </div>
                {/* SVG mock Chart */}
                <div className="h-28 flex items-end justify-between gap-1 pt-4">
                  {[30, 45, 35, 60, 55, 75, 65, 80, 70, 95, 85, 100].map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div
                        style={{ height: `${val}%` }}
                        className="w-full bg-gradient-to-t from-primary/40 to-primary rounded-t"
                      />
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {['J','F','M','A','M','J','J','A','S','O','N','D'][idx]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
