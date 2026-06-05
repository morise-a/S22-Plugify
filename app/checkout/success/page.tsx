import * as React from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowRight, User } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface SuccessPageProps {
  searchParams: Promise<{ orderNumber?: string; status?: string }>;
}

export default async function CheckoutSuccessPage(props: SuccessPageProps) {
  // AWAIT searchParams in compliance with Next.js 16
  const { orderNumber, status } = await props.searchParams;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-24 text-center space-y-6 flex-1 flex flex-col justify-center items-center">
      <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
        <CheckCircle className="h-16 w-16 animate-bounce" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Payment Succeeded!
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          Your order has been recorded. We are preparing your license keys and credentials.
        </p>
      </div>

      {orderNumber && (
        <div className="p-4 bg-secondary/40 border border-border/60 rounded-xl w-full text-sm font-semibold flex items-center justify-between">
          <span className="text-muted-foreground">Order Reference:</span>
          <span className="font-mono text-foreground">{orderNumber}</span>
        </div>
      )}

      <div className="space-y-3 w-full">
        <Link href="/customer/dashboard" className="block w-full">
          <Button className="w-full inline-flex items-center justify-center gap-2 h-11">
            <User className="h-4 w-4" />
            Go to Customer Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/" className="block w-full">
          <Button variant="outline" className="w-full h-11">
            Back to Home
          </Button>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground leading-normal max-w-xs">
        Note: Access details are sent to your billing email address. Please make sure to check your spam folder if you do not receive it shortly.
      </p>
    </div>
  );
}
