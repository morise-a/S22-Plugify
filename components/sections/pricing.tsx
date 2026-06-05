'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: '$29',
    description: 'Perfect for small teams and developers testing out concepts.',
    features: [
      'Access to standard store layouts',
      'Basic product listings (up to 10)',
      'Stripe checkout integrations',
      'Standard email support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$79',
    description: 'Our most popular plan, built for growing online store teams.',
    features: [
      'Unlimited product catalog listings',
      'Mail templates customization builder',
      'Advanced sales analytics dashboards',
      'Priority email & chat support',
      'Multiple drag & drop file uploads',
    ],
    cta: 'Choose Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$199',
    description: 'Fully custom solutions for corporate scaling operations.',
    features: [
      'Custom subdomain setup',
      'Dedicated SMTP integration',
      'Unlimited administrators & members',
      'Custom database schema options',
      '24/7 SLA telephone support',
      'Automated data backup routines',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export function Pricing() {
  return (
    <section className="py-20 lg:py-28 border-b border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Simple, Transparent Pricing
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Choose a plan that fits your size. Upgrade or downgrade anytime with no hidden contract fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              className={`p-8 rounded-2xl border flex flex-col justify-between relative bg-card/60 shadow transition-all duration-300 hover:shadow-lg ${
                plan.popular
                  ? 'border-primary ring-2 ring-primary/20 scale-102 z-10'
                  : 'border-border/60 hover:border-border'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary text-primary-foreground">
                  Most Popular
                </span>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1.5">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>

                <hr className="border-border/60" />

                <ul className="space-y-3">
                  {plan.features.map((feat, fidx) => (
                    <li key={fidx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="h-4.5 w-4.5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Link href={plan.name === 'Enterprise' ? '/contact' : '/products'}>
                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
