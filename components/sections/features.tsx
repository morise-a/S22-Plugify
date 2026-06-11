'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, TrendingUp, RefreshCw, Mail, Cpu } from 'lucide-react';

const FEATURE_LIST = [
  {
    icon: <Shield className="h-6 w-6 text-indigo-500" />,
    title: 'Direct ZIP Downloads',
    description: 'Get immediate access to your WordPress plugin ZIP archive files immediately after payment completes, with polling auto-downloads.',
  },
  {
    icon: <Zap className="h-6 w-6 text-amber-500" />,
    title: 'WordPress License Keys',
    description: 'Every purchase includes a unique license key. Validate and authorize your slots through our secure verification API.',
  },
  {
    icon: <TrendingUp className="h-6 w-6 text-emerald-500" />,
    title: 'Auto-Update API Integration',
    description: 'Manage versioning and check updates directly. Our verification endpoint allows plugins to query updates dynamically.',
  },
  {
    icon: <RefreshCw className="h-6 w-6 text-blue-500" />,
    title: 'Optimized & Lightweight',
    description: 'Clean coding practices and zero bloat. Engineered to keep server overhead minimal and PageSpeed score at its peak.',
  },
  {
    icon: <Mail className="h-6 w-6 text-primary" />,
    title: 'Multi-Site Licensing Options',
    description: 'Flexible options for developers and agencies. Choose standard single-site keys or multi-domain developer packs.',
  },
  {
    icon: <Cpu className="h-6 w-6 text-rose-500" />,
    title: 'Developer Hooks Extensibility',
    description: 'Standard filter and action hooks built right in. Extend functions easily without altering core plugin structures.',
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
