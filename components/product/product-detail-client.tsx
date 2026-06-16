'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Star, CheckCircle2, ChevronRight, Globe, Layout, Zap, Sparkles, ShieldCheck } from 'lucide-react';
import { useCartStore } from '../../lib/store/use-cart-store';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { motion } from 'framer-motion';
import { ProductCard } from './product-card';

interface ProductImage {
  id: string;
  image_url: string;
  is_screenshot: boolean;
}

interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number;
  domain_count?: number;
  layout_count?: number;
  billing_cycle?: 'monthly' | 'yearly';
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
}

export function ProductDetailClient({ product, relatedProducts }: { product: Product; relatedProducts: Product[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const addToCart = useCartStore((state) => state.addToCart);

  const images = product.product_images || [];
  const mainImage = images.find((img) => !img.is_screenshot)?.image_url
    || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
  const screenshots = images.filter((img) => img.is_screenshot);

  const [selectedImage, setSelectedImage] = React.useState<string>(mainImage);
  const [quantity, setQuantity] = React.useState<number>(1);
  const initialVariant = product.product_variants && product.product_variants.length > 0
    ? (product.product_variants.find((v) => (v.billing_cycle || 'monthly') === 'monthly') || product.product_variants[0])
    : null;
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | null>(initialVariant);

  // Billing cycle states
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');
  const [durationMonths, setDurationMonths] = React.useState<number>(1);

  React.useEffect(() => {
    setSelectedImage(mainImage);
  }, [mainImage]);

  // Dynamically select matching variant when cycle changes
  React.useEffect(() => {
    if (product.product_variants && product.product_variants.length > 0) {
      const matching = product.product_variants.find((v) => (v.billing_cycle || 'monthly') === billingCycle);
      if (matching) {
        setSelectedVariant(matching);
      } else {
        // Fallback to the first available variant if none match explicitly
        setSelectedVariant(product.product_variants[0]);
      }
    }
  }, [billingCycle, product.product_variants]);

  const basePrice = selectedVariant ? Number(selectedVariant.price) : Number(product.price);

  // A variant is yearly flat rate if its cycle is yearly. Otherwise, calculations depend on billingCycle toggle.
  const isYearlyVariant = selectedVariant && selectedVariant.billing_cycle === 'yearly';
  const displayPrice = isYearlyVariant
    ? basePrice
    : (billingCycle === 'yearly' ? basePrice * 10 : basePrice * durationMonths);

  const getDates = () => {
    const today = new Date();
    const startStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const end = new Date(today);
    const monthsToAdd = (isYearlyVariant || billingCycle === 'yearly') ? 12 : durationMonths;
    end.setMonth(today.getMonth() + monthsToAdd);
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return { startStr, endStr };
  };

  const handleAddToCart = () => {
    const { startStr, endStr } = getDates();
    const months = (isYearlyVariant || billingCycle === 'yearly') ? 12 : durationMonths;

    const cycleLabel = isYearlyVariant
      ? 'Yearly'
      : (billingCycle === 'yearly' ? 'Yearly' : `${durationMonths} Month${durationMonths > 1 ? 's' : ''}`);

    const itemVariantName = selectedVariant
      ? `${selectedVariant.name} (${cycleLabel})`
      : `Standard (${cycleLabel})`;

    addToCart({
      id: product.id,
      name: product.name,
      price: displayPrice,
      image_url: mainImage,
      variantId: selectedVariant?.id,
      variantName: itemVariantName,
      domain_count: selectedVariant?.domain_count,
      layout_count: selectedVariant?.layout_count,
      billingCycle: isYearlyVariant ? 'yearly' : billingCycle,
      durationMonths: months,
      startDate: startStr,
      endDate: endStr,
    } as any, quantity);

    showToast(
      'Added to Cart!',
      'success',
      `"${product.name}" (${itemVariantName}) has been added to your cart.`
    );
  };

  const handleBuyNow = () => {
    const { startStr, endStr } = getDates();
    const months = (isYearlyVariant || billingCycle === 'yearly') ? 12 : durationMonths;

    const cycleLabel = isYearlyVariant
      ? 'Yearly'
      : (billingCycle === 'yearly' ? 'Yearly' : `${durationMonths} Month${durationMonths > 1 ? 's' : ''}`);

    const itemVariantName = selectedVariant
      ? `${selectedVariant.name} (${cycleLabel})`
      : `Standard (${cycleLabel})`;

    addToCart({
      id: product.id,
      name: product.name,
      price: displayPrice,
      image_url: mainImage,
      variantId: selectedVariant?.id,
      variantName: itemVariantName,
      domain_count: selectedVariant?.domain_count,
      layout_count: selectedVariant?.layout_count,
      billingCycle: isYearlyVariant ? 'yearly' : billingCycle,
      durationMonths: months,
      startDate: startStr,
      endDate: endStr,
    } as any, quantity);
    router.push('/cart');
  };

  const getVariantFeatures = () => {
    const defaultFeatures = [
      'Next.js 16 integration',
      'Zustand cart persistent store',
      'Supabase Storage uploads',
      'Stripe Elements confirmations',
      'SMTP email template parsing',
      'Responsive SaaS UI layout',
    ];

    if (!selectedVariant) return defaultFeatures;

    const extraFeatures = [];
    if (selectedVariant.domain_count && selectedVariant.domain_count > 1) {
      extraFeatures.push('Priority Discord support');
      extraFeatures.push('Pre-configured CI/CD scripts');
      if (selectedVariant.domain_count >= 100) {
        extraFeatures.push('Full white-label SaaS rights');
      } else {
        extraFeatures.push('Commercial deployment rights');
      }
    } else {
      extraFeatures.push('Standard email support');
      extraFeatures.push('Personal sandbox license');
    }

    return [
      ...defaultFeatures,
      ...extraFeatures,
    ];
  };

  // Mock Reviews
  const reviews = [
    { name: 'Sarah Jenkins', rating: 5, date: 'May 12, 2026', comment: 'Absolutely brilliant. The codebase compiles cleanly and integrates with Stripe webhooks immediately.' },
    { name: 'Marcus Vance', rating: 4, date: 'April 28, 2026', comment: 'Very clean folder structure and robust RLS policies. Ideal starting kit for subscription eCommerce.' },
  ];

  return (
    <div className="space-y-16">
      {/* 1. Main Grid: Gallery + Purchasing Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left Column: Image Gallery */}
        <div className="space-y-4">
          <div className="relative h-96 w-full bg-secondary/30 rounded-2xl overflow-hidden border border-border/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt={product.name}
              className="w-full h-full object-contain transition-all duration-300"
            />
          </div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {/* Main Image Thumbnail */}
              <button
                type="button"
                onClick={() => setSelectedImage(mainImage)}
                className={`relative h-20 w-24 rounded-lg overflow-hidden border-2 flex-shrink-0 cursor-pointer ${selectedImage === mainImage ? 'border-primary' : 'border-transparent'
                  }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mainImage} alt="Main" className="w-full h-full object-cover" />
              </button>

              {/* Screenshots Thumbnails */}
              {screenshots.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImage(img.image_url)}
                  className={`relative h-20 w-24 rounded-lg overflow-hidden border-2 flex-shrink-0 cursor-pointer ${selectedImage === img.image_url ? 'border-primary' : 'border-transparent'
                    }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.image_url} alt="Screenshot" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information & Actions */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{product.name}</h1>
            <div className="flex items-center gap-2">
              <div className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">(2 customer reviews)</span>
              <Badge variant="success" className="ml-2">Active Solution</Badge>
            </div>
          </div>

          <div className="text-3xl font-bold text-foreground">
            ${displayPrice.toFixed(2)}
          </div>

          {product.product_variants && product.product_variants.length > 0 && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 capitalize tracking-wider">Select License Variant</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.product_variants
                  .filter((v) => (v.billing_cycle || 'monthly') === billingCycle)
                  .map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`flex flex-col text-left p-3.5 rounded-xl border text-xs cursor-pointer transition-all duration-150 ${isSelected
                          ? 'border-indigo-650 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-650'
                          : 'border-slate-200 bg-card hover:bg-slate-100/50 text-slate-700 '
                          }`}
                      >
                        <span className="font-bold mb-1">{v.name}</span>
                        <span className="font-bold text-[13px]">${Number(v.price).toFixed(2)}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Billing Cycle & Duration Configuration */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 capitalize tracking-wider">Select Billing Cycle</h3>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setBillingCycle('monthly');
                  setDurationMonths(1);
                }}
                className={`flex-1 flex items-center justify-between py-3.5 px-4.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer focus:outline-none ${billingCycle === 'monthly'
                  ? 'border-indigo-650 bg-indigo-50/60 text-indigo-950 ring-1 ring-indigo-650'
                  : 'border-slate-200 bg-card hover:bg-slate-100/50 text-slate-700'
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-all ${billingCycle === 'monthly' ? 'border-indigo-650 bg-indigo-650' : 'border-slate-300'
                    }`}>
                    {billingCycle === 'monthly' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  Monthly Cycle
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBillingCycle('yearly');
                  setDurationMonths(12);
                }}
                className={`flex-1 flex items-center justify-between py-3.5 px-4.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer focus:outline-none ${billingCycle === 'yearly'
                  ? 'border-indigo-650 bg-indigo-50/60 text-indigo-950 ring-1 ring-indigo-650'
                  : 'border-slate-200 bg-card hover:bg-slate-100/50 text-slate-700'
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-all ${billingCycle === 'yearly' ? 'border-indigo-650 bg-indigo-650' : 'border-slate-300'
                    }`}>
                    {billingCycle === 'yearly' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  Yearly Cycle (Discounted)
                </span>
                <span className="text-[9px] font-bold bg-emerald-500 text-white py-0.5 px-2 rounded-full capitalize tracking-wider shrink-0">
                  Save 20%
                </span>
              </button>
            </div>

            {/* If monthly (and not explicitly a yearly variant), show duration input */}
            {billingCycle === 'monthly' && !isYearlyVariant && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700">Billing Duration:</span>
                <div className="flex items-center border border-slate-200 bg-card rounded-xl overflow-hidden h-9 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setDurationMonths(Math.max(1, durationMonths - 1))}
                    className="px-3 h-full hover:bg-secondary/40 text-slate-500 hover:text-slate-800 cursor-pointer font-bold text-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={36}
                    value={durationMonths}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1) {
                        setDurationMonths(Math.min(36, val));
                      }
                    }}
                    className="w-12 text-center text-xs font-bold text-slate-800 font-mono focus:outline-none border-0 bg-transparent"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold pr-2.5 select-none font-mono">Mo.</span>
                  <button
                    type="button"
                    onClick={() => setDurationMonths(Math.min(36, durationMonths + 1))}
                    className="px-3 h-full hover:bg-secondary/40 text-slate-500 hover:text-slate-800 cursor-pointer font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Dates preview banner */}
            <div className="p-3.5 bg-indigo-500/5 border border-indigo-100/70 rounded-xl space-y-1.5 text-left">
              <span className="text-[9px] font-bold text-indigo-600 tracking-wider Capitalize block">Subscription License Period</span>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-450 font-normal">Start Date</span>
                  <span className="font-semibold text-slate-800">{getDates().startStr}</span>
                </div>
                <div className="h-4 w-px bg-indigo-150" />
                <div className="flex flex-col text-right">
                  <span className="text-[9px] text-slate-455 font-normal">Renewal / Expiry Date</span>
                  <span className="font-semibold text-slate-800">{getDates().endStr}</span>
                </div>
              </div>
              <p className="text-[10px] text-indigo-600/80 font-medium pt-1">
                {isYearlyVariant || billingCycle === 'yearly'
                  ? '🛡️ Full 1-year updates & license authorization (includes 2 months free discount).'
                  : `🛡️ Full ${durationMonths} month${durationMonths > 1 ? 's' : ''} updates & support renewals.`}
              </p>
            </div>
          </div>

          <hr className="border-border/60" />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Selected Variant Specifications & Features */}
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-sm font-semibold text-foreground">Included Features</h3>
              {selectedVariant && (
                <span className="text-[10px] font-bold text-indigo-600 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-150">
                  {selectedVariant.name}
                </span>
              )}
            </div>

            {selectedVariant && (
              <motion.div
                key={selectedVariant.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                {/* Domain Card */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="relative overflow-hidden p-3 rounded-xl border border-indigo-100/70 bg-gradient-to-br from-indigo-500/[0.02] to-purple-500/[0.02] shadow-[0_2px_8px_rgba(99,102,241,0.02)]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-600">
                      <Globe className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[9px] font-bold text-indigo-600/85 capitalize tracking-wider">Deployments</span>
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {selectedVariant.domain_count && selectedVariant.domain_count >= 100 ? 'Unlimited' : selectedVariant.domain_count || 1}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 leading-snug">
                    {selectedVariant.domain_count && selectedVariant.domain_count >= 100
                      ? 'Deploy on unlimited sites'
                      : `Up to ${selectedVariant.domain_count || 1} domain${Number(selectedVariant.domain_count) > 1 ? 's' : ''}`}
                  </div>
                </motion.div>

                {/* Layout Card */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="relative overflow-hidden p-3 rounded-xl border border-emerald-100/70 bg-gradient-to-br from-emerald-500/[0.02] to-teal-500/[0.02] shadow-[0_2px_8px_rgba(16,185,129,0.02)]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Layout className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600/85 capitalize tracking-wider">UI Templates</span>
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {selectedVariant.layout_count || 1} Layout{Number(selectedVariant.layout_count) > 1 ? 's' : ''}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 leading-snug">
                    Premium pre-built dashboard & landing layouts
                  </div>
                </motion.div>

                {/* Support/Tier Card */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="relative overflow-hidden p-3 rounded-xl border border-amber-100/70 bg-gradient-to-br from-amber-500/[0.02] to-orange-500/[0.02] shadow-[0_2px_8px_rgba(245,158,11,0.02)]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-amber-500/10 text-amber-600">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[9px] font-bold text-amber-600/85 capitalize tracking-wider">Support</span>
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {selectedVariant.domain_count && selectedVariant.domain_count > 1 ? 'Priority' : 'Standard'}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 leading-snug">
                    {selectedVariant.domain_count && selectedVariant.domain_count > 1
                      ? 'Direct developer channel'
                      : 'Standard ticket queue'}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>

          <hr className="border-border/60" />

          {/* Quantity and Actions */}
          <div className="space-y-4">
            {/* <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground/80">Quantity:</span>
              <div className="flex items-center border border-input bg-card rounded-lg overflow-hidden h-10">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 h-full hover:bg-secondary/40 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  -
                </button>
                <span className="px-4 text-sm font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 h-full hover:bg-secondary/40 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  +
                </button>
              </div>
            </div> */}

            <div className="flex gap-4 pt-2">
              <Button
                variant="outline"
                className="flex-1 inline-flex items-center justify-center gap-2 h-11"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
              <Button
                className="flex-1 h-11"
                onClick={handleBuyNow}
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Customer Reviews Tab */}
      <div className="space-y-6 border-t border-border/40 pt-12">
        <h3 className="text-xl font-bold text-foreground">Customer Reviews</h3>
        <div className="space-y-6">
          {reviews.map((rev, idx) => (
            <div key={idx} className="border border-border/60 bg-card rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{rev.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{rev.date}</p>
                </div>
                <div className="flex text-amber-500">
                  {Array.from({ length: rev.rating }).map((_, r) => (
                    <Star key={r} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
                &ldquo;{rev.comment}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Related Products */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6 border-t border-border/40 pt-12">
          <h3 className="text-xl font-bold text-foreground">Related Products</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
