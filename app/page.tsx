import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, MessageSquareQuote, ChevronRight, ShoppingCart } from 'lucide-react';
import { Hero } from '../components/sections/hero';
import { Features } from '../components/sections/features';
import { Pricing } from '../components/sections/pricing';
import { FAQ } from '../components/sections/faq';
import { getProductsAction } from './actions/products';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ProductCard } from '../components/product/product-card';

export const revalidate = 3600; // Cache landing page database reads for 1 hour (revalidates in bg)

export default async function LandingPage() {
  // Fetch active products for highlights section
  const products = await getProductsAction();
  const highlightedProducts = products.slice(0, 3); // Display top 3 products

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Features Grid */}
      <Features />

      {/* 3. Product Highlights */}
      {highlightedProducts.length > 0 && (
        <section className="py-20 lg:py-28 border-b border-border/40 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Featured Products</h2>
                <p className="text-sm text-muted-foreground">
                  Explore our premium ready-to-use software solutions.
                </p>
              </div>
              <Link href="/products" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                View entire catalog
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
              {highlightedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Benefits Section */}
      <section className="py-20 lg:py-28 border-b border-border/40 bg-secondary/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Designed for Speed and Conversions
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              We did not just write code; we built an optimized checkout funnel. ApexSaaS solves layout shifting, ensures robust Stripe integrations, and processes mailers automatically to maximize conversions.
            </p>

            <ul className="space-y-4.5">
              {[
                'Zero layout shifting and optimized image compression loads.',
                'Immediate client UI updates with Next.js Server Actions.',
                'Persisted cart flows to allow shoppers to complete sessions later.',
                'Stripe Webhooks guarantee zero double billing issues.',
              ].map((benefit, bidx) => (
                <li key={bidx} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative border border-border/60 bg-card rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-base font-semibold text-foreground border-b border-border/60 pb-3 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Checkout Review
            </h3>

            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Starter Subscription</span>
                <span>$29.00</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Discount (WELCOME50 - 50% Off)</span>
                <span className="text-emerald-500">-$14.50</span>
              </div>
              <hr className="border-border/60" />
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>$14.50</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Processing Fee (Stripe Rate)</span>
                <span>$0.72</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (8%)</span>
                <span>$1.16</span>
              </div>
              <hr className="border-border/60" />
              <div className="flex justify-between text-base font-bold text-foreground">
                <span>Total Amount Due</span>
                <span>$16.38</span>
              </div>
            </div>

            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-center text-xs text-primary font-medium">
              Checkout values computed server-side to prevent client pricing overrides.
            </div>
          </div>
        </div>
      </section>

      {/* 5. Testimonials */}
      <section className="py-20 lg:py-28 border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              What Developers and Teams Say
            </h2>
            <p className="text-sm text-muted-foreground">
              Trusted by creators scaling subscription products globally.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {[
              {
                quote: 'The 3D hero section and fluid transitions wowed our initial investors immediately. Extremely performant.',
                author: 'Sarah Jenkins',
                role: 'CEO, SynthWave UI',
              },
              {
                quote: 'Using Next.js 16 server actions combined with Supabase RLS is a breeze. It cut our SaaS deployment cycle in half.',
                author: 'Marcus Vance',
                role: 'Fullstack Dev, CloudFlux',
              },
              {
                quote: 'The custom mail template editor is a game changer for our operations. No-code team members manage emails directly.',
                author: 'Elena Rostova',
                role: 'Ops Director, TechSphere',
              },
            ].map((test, tidx) => (
              <Card key={tidx} className="border-border/60 bg-card p-6 flex flex-col justify-between gap-6 relative">
                <MessageSquareQuote className="absolute top-4 right-4 h-10 w-10 text-muted/30" />
                <p className="text-sm text-muted-foreground italic leading-relaxed relative z-10">
                  &ldquo;{test.quote}&rdquo;
                </p>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-foreground">{test.author}</h4>
                  <p className="text-xs text-muted-foreground">{test.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Pricing Section */}
      <Pricing />

      {/* 7. FAQ Accordions */}
      <FAQ />

      {/* 8. Contact CTA */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-primary to-indigo-700 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Have Questions? Talk to Our Team
          </h2>
          <p className="text-sm sm:text-base text-primary-foreground/80 max-w-xl mx-auto leading-relaxed">
            Need custom integrations, custom enterprise billing setup, or email templates walkthrough? We are here to help.
          </p>
          <div className="pt-4">
            <Link href="/contact">
              <Button size="lg" variant="secondary" className="inline-flex items-center gap-2">
                Get In Touch
                <ArrowRight className="h-4 w-4 text-primary" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
