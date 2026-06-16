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
    <section className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex items-center justify-center border-b border-border/40 py-12 lg:py-0">
      {/* Decorative background radial glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15)_0%,transparent_75%)]" />
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl opacity-60" />
      <div className="absolute bottom-10 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl opacity-60" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Hero Text */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6 flex flex-col items-center lg:items-start">
            {/* Sparkle Tag */}
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 animate-pulse">
              <Sparkles className="h-3 w-3" />
              <span>Premium WordPress Plugins Hub</span>
            </div>

            {/* Hero Copy */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
                Elevate Your WordPress Sites with Premium Plugins
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                Explore high-performance, lightweight, and developer-friendly WordPress extensions. Get instant license key activations, direct zip downloads, and automatic dashboard updates.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4 w-full sm:w-auto">
              <Button href="/products" size="lg" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold">
                Explore Plugins
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="/contact" variant="outline" size="lg" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold">
                Request Custom Plugin
              </Button>
            </div>
          </div>

          {/* Right Column: 3D Dashboard Mockup Card */}
          <div className="lg:col-span-5 perspective-1000 flex justify-center w-full">
            <motion.div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ rotateX, rotateY }}
              className="w-full max-w-md rounded-2xl border border-border/80 bg-card/60 shadow-2xl overflow-hidden preserve-3d glass-panel"
            >
              {/* Header Row of Dashboard */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-secondary/30">
                <div className="flex gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">licensing.s22plugify.com</span>
                <div className="w-8 h-2" />
              </div>

              {/* Dashboard Content Mockup */}
              <div className="p-5 space-y-5 text-left">
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Stat Card 1 */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-background/50 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">Active Activations</p>
                      <h4 className="text-sm font-bold text-foreground mt-0.5">14,290+</h4>
                    </div>
                    <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Stat Card 2 */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-background/50 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">PageSpeed Grade</p>
                      <h4 className="text-sm font-bold text-foreground mt-0.5">99/100 A</h4>
                    </div>
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                      <TrendingUp className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>

                {/* Big Row Graphic Mockup */}
                <div className="p-4 rounded-xl border border-border/60 bg-background/50 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-semibold text-foreground">API Activations Trend</h4>
                    <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/10 text-primary rounded font-medium">Live</span>
                  </div>
                  {/* SVG mock Chart */}
                  <div className="h-24 flex items-end justify-between gap-1 pt-2">
                    {[30, 45, 35, 60, 55, 75, 65, 80, 70, 95, 85, 100].map((val, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div
                          style={{ height: `${val}%` }}
                          className="w-full bg-gradient-to-t from-primary/30 to-primary rounded-t"
                        />
                        <span className="text-[8px] text-muted-foreground font-mono">
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
      </div>
    </section>
  );
}
