'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Trash2, ArrowRight, ArrowLeft, Ticket, Tag } from 'lucide-react';
import { useCartStore } from '../../lib/store/use-cart-store';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { Card, CardContent } from '../../components/ui/card';

export default function CartPage() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const {
    items,
    couponCode,
    couponDiscountPercent,
    updateQuantity,
    removeFromCart,
    applyCoupon,
    removeCoupon,
    getTotals,
  } = useCartStore();

  const [couponInput, setCouponInput] = React.useState('');

  const { subtotal, discount, processingFee, tax, total } = getTotals();

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    const res = applyCoupon(couponInput);
    if (res.success) {
      showToast('Coupon Applied', 'success', res.message);
      setCouponInput('');
    } else {
      showToast('Invalid Coupon', 'error', res.message);
    }
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 flex-1 flex flex-col justify-center items-center gap-6">
        <div className="p-5 bg-secondary/50 rounded-full border border-border">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-1 text-center">
          <h2 className="text-xl font-bold text-foreground">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Add items from our software catalog to begin the checkout process.
          </p>
        </div>
        <Link href="/products">
          <Button className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex-1 flex flex-col gap-8">
      <div className="border-b border-border/40 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Shopping Cart
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your items and proceed to billing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="divide-y divide-border/60 border border-border/60 bg-card rounded-2xl overflow-hidden shadow-sm">
            {items.map((item) => (
              <div key={item.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-4 items-center">
                  <div className="h-16 w-20 bg-secondary/30 rounded-lg overflow-hidden border border-border flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">${item.price} each</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  {/* Quantity Control */}
                  <div className="flex items-center border border-input bg-card rounded-lg overflow-hidden h-9">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-2.5 h-full hover:bg-secondary/40 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-3 text-xs font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2.5 h-full hover:bg-secondary/40 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-foreground block">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        removeFromCart(item.id);
                        showToast('Item Removed', 'info', `Removed "${item.name}" from your cart.`);
                      }}
                      className="text-xs text-destructive hover:underline inline-flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link href="/products" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="h-3.5 w-3.5" />
            Continue shopping
          </Link>
        </div>

        {/* Right Column: Cart Summary */}
        <div className="space-y-6">
          <Card className="border-border/60 bg-card shadow-md">
            <CardContent className="p-6 space-y-6">
              <h2 className="text-lg font-bold text-foreground">Order Summary</h2>
              
              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                {couponCode && (
                  <div className="flex justify-between text-emerald-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      Discount ({couponCode} - {couponDiscountPercent}%)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span>-${discount.toFixed(2)}</span>
                      <button
                        onClick={removeCoupon}
                        className="text-[10px] text-destructive hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>Processing Fee (Stripe Rate)</span>
                  <span>${processingFee.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>

                <hr className="border-border/60" />

                <div className="flex justify-between text-base font-bold text-foreground">
                  <span>Total Due</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Coupon input form */}
              {!couponCode && (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Promo Code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                    <Ticket className="absolute left-2.5 top-3 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <Button type="submit" size="sm" variant="outline" className="h-9">
                    Apply
                  </Button>
                </form>
              )}

              <Button onClick={handleCheckout} className="w-full inline-flex items-center justify-center gap-2 h-11">
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Checkout note */}
          <div className="p-3.5 bg-secondary/30 rounded-xl border border-border/40 text-[11px] text-muted-foreground leading-normal">
            By clicking Checkout, you agree to our terms of service. Products are immediately available in your customer dashboard upon confirmation of paid transaction status via webhooks.
          </div>
        </div>
      </div>
    </div>
  );
}
