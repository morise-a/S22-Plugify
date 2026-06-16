'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowRight, User, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { AutoDownloader } from './auto-downloader';
import { getOrderDownloadableProductsAction } from '../../app/actions/orders';
import { useCartStore } from '../../lib/store/use-cart-store';

interface SuccessPageClientProps {
  orderNumber?: string;
}

export function SuccessPageClient({ orderNumber }: SuccessPageClientProps) {
  const [orderStatus, setOrderStatus] = React.useState<'pending' | 'paid' | 'failed' | 'not_found'>('pending');
  const [downloadableProducts, setDownloadableProducts] = React.useState<{ name: string; url: string }[]>([]);
  const [attempts, setAttempts] = React.useState(0);
  const attemptsRef = React.useRef(0);

  React.useEffect(() => {
    try {
      useCartStore.getState().clearCart();
    } catch (err) {
      console.error('Failed to clear cart:', err);
    }
  }, []);

  React.useEffect(() => {
    if (!orderNumber) {
      setOrderStatus('not_found');
      return;
    }

    attemptsRef.current = 0;
    setAttempts(0);
    let isMounted = true;

    const interval = setInterval(async () => {
      if (attemptsRef.current >= 15) {
        clearInterval(interval);
        return;
      }

      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);

      try {
        const res = await getOrderDownloadableProductsAction(orderNumber);
        if (!isMounted) return;

        if (res.success) {
          if (res.status === 'paid') {
            setOrderStatus('paid');
            setDownloadableProducts(res.products || []);
            clearInterval(interval);
          } else if (res.status === 'failed') {
            setOrderStatus('failed');
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Error polling order status:', err);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderNumber]);

  // Loading state (while pending verification)
  if (orderStatus === 'pending') {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24 text-center space-y-6 flex-1 flex flex-col justify-center items-center">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 relative">
          <Loader2 className="h-14 w-14 animate-spin text-indigo-600" />
          <Sparkles className="h-5 w-5 text-indigo-400 absolute top-2 right-2 animate-pulse" />
        </div>

        <div className="space-y-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Confirming Payment...
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Stripe is finalizing your transaction. We are preparing your license slots and automatically routing your software download links.
          </p>
        </div>

        {orderNumber && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl w-full text-xs font-semibold flex items-center justify-between">
            <span className="text-slate-400">Order Reference:</span>
            <span className="font-mono text-slate-800">{orderNumber}</span>
          </div>
        )}
      </div>
    );
  }

  // Failed state
  if (orderStatus === 'failed') {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24 text-center space-y-6 flex-1 flex flex-col justify-center items-center">
        <div className="p-4 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
          <AlertCircle className="h-16 w-16" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Transaction Failed
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Stripe reported a payment issue. Your order has been cancelled. Please check your credit card or try again.
          </p>
        </div>

        <div className="space-y-3 w-full">
          <Button href="/cart" className="w-full h-11">
            Back to Cart
          </Button>
          <Button href="/" variant="outline" className="w-full h-11">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Success state (paid)
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center space-y-6 flex-1 flex flex-col justify-center items-center animate-fade-in">
      <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
        <CheckCircle className="h-16 w-16 animate-bounce" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Payment Succeeded!
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed font-medium">
          Your order has been recorded. Your credentials and invoice receipts have been emailed to you.
        </p>
      </div>

      {orderNumber && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-xs font-semibold flex items-center justify-between">
          <span className="text-slate-400">Order Reference:</span>
          <span className="font-mono text-slate-800">{orderNumber}</span>
        </div>
      )}

      {downloadableProducts.length > 0 && (
        <AutoDownloader products={downloadableProducts} />
      )}

      <div className="space-y-3 w-full pt-4 border-t border-slate-100">
        <Button href="/customer/dashboard" className="w-full inline-flex items-center justify-center gap-2 h-11">
          <User className="h-4 w-4" />
          Go to Customer Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button href="/" variant="outline" className="w-full h-11">
          Back to Home
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground leading-normal max-w-xs font-semibold">
        Note: Access details are sent to your billing email address. Please make sure to check your spam folder if you do not receive it shortly.
      </p>
    </div>
  );
}
