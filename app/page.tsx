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
        <section className="py-12 border-b border-border/40 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Featured WordPress Plugins</h2>
                <p className="text-sm text-muted-foreground">
                  Explore our high-performance, developer-friendly extensions to scale your site.
                </p>
              </div>
              <Link href="/products" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                View entire plugin directory
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
      <section className="py-12 border-b border-border/40 bg-secondary/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Engineered for Speed & Secure Licensing
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              We build WordPress extensions that do not slow down your server. S22 Plugify ensures strict compliance with WordPress coding standards, provides simple one-click ZIP package installs, and handles license keys securely via our verification API.
            </p>

            <ul className="space-y-4.5">
              {[
                'Optimized, database-efficient queries to maintain lightning-fast load times.',
                'Secure REST verification API to activate and check plugin license slots.',
                'Instant dashboard ZIP downloads and direct updates support.',
                'Standard hooks compatibility to fit smoothly with any modern theme or block builder.',
              ].map((benefit, bidx) => (
                <li key={bidx} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative border border-border/60 bg-card rounded-2xl p-6 shadow-xl space-y-6 text-left">
            <h3 className="text-base font-semibold text-foreground border-b border-border/60 pb-3 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Licensing Checkout Review
            </h3>

            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>WooCommerce Dynamic Pricing Plugin (Monthly - 3 Months)</span>
                <span>$87.00</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Discount (WELCOME50 - 50% Off)</span>
                <span className="text-emerald-500">-$43.50</span>
              </div>
              <hr className="border-border/60" />
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>$43.50</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Processing Fee (Stripe Rate)</span>
                <span>$1.56</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (10%)</span>
                <span>$3.48</span>
              </div>
              <hr className="border-border/60" />
              <div className="flex justify-between text-base font-bold text-foreground">
                <span>Total Amount Due</span>
                <span>$48.54</span>
              </div>
            </div>

            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-center text-xs text-primary font-medium">
              Checkout values computed server-side. Activation limits provisioned upon payment confirmation.
            </div>
          </div>
        </div>
      </section>

      {/* 5. Testimonials */}
      <section className="py-12 border-b border-border/40 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Trusted by WordPress Agencies & Site Owners
            </h2>
            <p className="text-sm text-muted-foreground">
              Helping businesses secure and scale their WordPress site architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left">
            {[
              {
                quote: 'The license activation API integrated beautifully with my theme. Updates are served instantly, and our clients\' websites run faster than ever.',
                author: 'Marcus Vance',
                role: 'Lead WordPress Developer, AgencyFlux',
              },
              {
                quote: 'S22 Plugify\'s plugins saved us weeks of custom WooCommerce work. The support is top-notch, and license slots are super easy to allocate.',
                author: 'Sarah Jenkins',
                role: 'Founder, ShopGrowth E-commerce',
              },
              {
                quote: 'Since migrating our site enhancements to these lightweight plugins, our mobile conversion rate went up by 14%. Clean code, zero bloat.',
                author: 'Elena Rostova',
                role: 'E-commerce Ops Director, TechSphere',
              },
            ].map((test, tidx) => (
              <Card key={tidx} className="border-border/60 bg-card p-6 flex flex-col justify-between gap-6 relative">
                <MessageSquareQuote className="absolute top-4 right-4 h-10 w-10 text-muted/30 pointer-events-none" />
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

      {/* 7. FAQ Accordions */}
      <FAQ />

      {/* 8. Contact CTA */}
      <section className="py-12 bg-gradient-to-br from-primary to-indigo-700 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Need a Custom Extension? Let&apos;s Build It
          </h2>
          <p className="text-sm sm:text-base text-primary-foreground/80 max-w-xl mx-auto leading-relaxed">
            Need custom WooCommerce features, integration with corporate APIs, or custom license setups? We are here to help.
          </p>
          <div className="pt-4">
            <Button href="/contact" size="lg" variant="secondary" className="inline-flex items-center gap-2 font-bold">
              Get In Touch
              <ArrowRight className="h-4 w-4 text-primary" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
