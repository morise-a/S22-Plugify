import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface FailedPageProps {
  searchParams: Promise<{ orderNumber?: string; error?: string }>;
}

export default async function CheckoutFailedPage(props: FailedPageProps) {
  // AWAIT searchParams in compliance with Next.js 16
  const { orderNumber, error } = await props.searchParams;

  const errorMessage = error || 'The bank card could not be validated. Please check the credentials and try again.';

  return (
    <div className="mx-auto w-full max-w-md px-4 py-24 text-center space-y-6 flex-1 flex flex-col justify-center items-center">
      <div className="p-4 bg-destructive/10 text-destructive rounded-full border border-destructive/20">
        <AlertCircle className="h-16 w-16" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Payment Failed
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          We encountered an issue while processing your card transaction.
        </p>
      </div>

      <div className="p-5 border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 rounded-2xl w-full text-xs text-left space-y-3">
        {orderNumber && (
          <div className="flex justify-between font-semibold border-b border-destructive/20 pb-2">
            <span className="text-muted-foreground">Order Reference:</span>
            <span className="font-mono text-foreground">{orderNumber}</span>
          </div>
        )}
        <div>
          <h4 className="font-bold text-foreground">Reason for Failure:</h4>
          <p className="text-muted-foreground mt-1 leading-normal italic">{errorMessage}</p>
        </div>
      </div>

      <div className="space-y-3 w-full">
        <Button href="/checkout" className="w-full inline-flex items-center justify-center gap-2 h-11">
          <RefreshCw className="h-4 w-4" />
          Retry Checkout
        </Button>
        <Button href="/cart" variant="outline" className="w-full inline-flex items-center justify-center gap-2 h-11">
          <ArrowLeft className="h-4 w-4" />
          Return to Cart
        </Button>
      </div>
    </div>
  );
}
