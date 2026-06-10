'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, TrendingUp, RefreshCw, Mail, Cpu } from 'lucide-react';

const FEATURE_LIST = [
  {
    icon: <Shield className="h-6 w-6 text-indigo-500" />,
    title: 'Enterprise Security',
    description: 'Supabase Row Level Security (RLS) policies configured out of the box to guarantee complete database partitioning.',
  },
  {
    icon: <Zap className="h-6 w-6 text-amber-500" />,
    title: 'Instant stripe Payments',
    description: 'Collect one-off charges or set up complex subscription periods. Verified securely via Stripe webhook confirmations.',
  },
  {
    icon: <TrendingUp className="h-6 w-6 text-emerald-500" />,
    title: 'Advanced Analytics',
    description: 'Monitor active subscriber status, total MRR, and conversion metrics in real-time inside your dashboard.',
  },
  {
    icon: <RefreshCw className="h-6 w-6 text-blue-500" />,
    title: 'Zustand Cart Persist',
    description: 'Keep customer checkout states synced and local-storage persisted automatically to avoid transaction drop-offs.',
  },
  {
    icon: <Mail className="h-6 w-6 text-primary" />,
    title: 'Mail Template Builder',
    description: 'Compose transactional emails with custom template variables and trigger SMTP notifications instantly.',
  },
  {
    icon: <Cpu className="h-6 w-6 text-rose-500" />,
    title: 'Next.js App Router',
    description: 'Optimized rendering speeds and instant transitions using Next.js 16 server actions and caching strategies.',
  },
];

export function Features() {
  return (
    <section className="py-12 bg-secondary/10 border-b border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Fully Loaded Infrastructure
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Everything you need to launch a high-performance eCommerce application and scale it globally.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {FEATURE_LIST.map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="p-6 rounded-2xl border border-border/60 bg-card hover:shadow-lg hover:border-border transition-all duration-300 flex flex-col gap-4 group"
            >
              <div className="p-3 bg-secondary/60 rounded-xl w-fit group-hover:scale-105 transition-transform duration-300">
                {feat.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
