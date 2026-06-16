'use client';

import * as React from 'react';
import { CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { markOrderAsFailedAction } from '../../app/actions/orders';

interface StripeElementFormProps {
  clientSecret: string;
  orderNumber: string;
  totalAmount: number;
  cardholderName?: string;
}

export function StripeElementForm({ 
  clientSecret, 
  orderNumber, 
  totalAmount, 
  cardholderName = 'CARDHOLDER NAME' 
}: StripeElementFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { showToast } = useToast();

  // Prevent amount from flashing to $0 when cart is cleared by locking it in a local state on mount
  const [staticAmount] = React.useState(totalAmount);
  
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [cardBrand, setCardBrand] = React.useState<string>('unknown');
  const [isNumberComplete, setIsNumberComplete] = React.useState(false);
  const [expiryComplete, setExpiryComplete] = React.useState(false);
  const [cvcComplete, setCvcComplete] = React.useState(false);

  const handleNumberChange = (event: any) => {
    if (event.brand) {
      setCardBrand(event.brand);
    } else {
      setCardBrand('unknown');
    }
    setIsNumberComplete(event.complete);
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const cardNumberElement = elements.getElement(CardNumberElement);

    if (!cardNumberElement) {
      setIsProcessing(false);
      return;
    }

    try {
      // Confirm the card payment details using the clientSecret
      const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: cardholderName !== 'CARDHOLDER NAME' ? cardholderName : undefined,
          }
        },
      });

      if (error) {
        await markOrderAsFailedAction(orderNumber);
        showToast('Payment Failed', 'error', error.message || 'Declined.');
        router.push(`/checkout/failed?orderNumber=${orderNumber}&error=${encodeURIComponent(error.message || '')}`);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        showToast('Payment Confirmed!', 'success', 'Your order has been placed.');
        router.push(`/checkout/success?orderNumber=${orderNumber}`);
      } else {
        router.push(`/checkout/success?orderNumber=${orderNumber}&status=${paymentIntent?.status}`);
      }
    } catch (err: any) {
      await markOrderAsFailedAction(orderNumber);
      showToast('Error', 'error', 'An unexpected error occurred during confirmation.');
      setIsProcessing(false);
    }
  };

  // Standard input options matching typical billing form inputs
  const elementOptions = {
    style: {
      base: {
        fontSize: '14px',
        color: 'var(--foreground)', // Dynamic theme-based text color
        fontFamily: 'system-ui, -apple-system, sans-serif',
        '::placeholder': {
          color: '#94a3b8', // Slate 400 placeholder
        },
      },
      invalid: {
        color: '#ef4444', // Destructive red
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* 3D Visual Credit Card Mockup */}
      <div className="w-full flex flex-col items-center">
        <div 
          onClick={handleCardClick}
          className="relative w-full max-w-[340px] h-[200px] perspective-1000 cursor-pointer select-none"
          title="Click to Flip Card"
        >
          <div className={`w-full h-full duration-500 preserve-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* Card Front */}
            <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 flex flex-col justify-between text-white shadow-xl backface-hidden border border-white/10 overflow-hidden">
              {/* Glossy overlay reflex */}
              <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-tr from-white/5 via-white/0 to-white/10 pointer-events-none transform rotate-45"></div>
              
              {/* Top Row: Chip & Brand */}
              <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-2">
                  {/* Gold Holographic Chip */}
                  <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-100 via-amber-300 to-yellow-50 relative overflow-hidden shadow border border-amber-400/20">
                    <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,rgba(0,0,0,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.15)_1px,transparent_1px)] bg-[size:3px_3px]"></div>
                    <div className="w-5 h-5 border-r border-b border-black/10 absolute top-0 left-0"></div>
                    <div className="w-5 h-5 border-l border-b border-black/10 absolute top-0 right-0"></div>
                  </div>
                  {/* Contactless waves icon */}
                  <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                
                {/* Brand Logo */}
                <div className="font-extrabold text-sm italic tracking-widest uppercase text-slate-100">
                  {cardBrand === 'visa' && <span className="text-sky-400">VISA</span>}
                  {cardBrand === 'mastercard' && <span className="text-amber-500">MASTERCARD</span>}
                  {cardBrand === 'amex' && <span className="text-teal-400">AMEX</span>}
                  {cardBrand === 'discover' && <span className="text-orange-400">DISCOVER</span>}
                  {cardBrand === 'unknown' && <span className="text-slate-400 text-xs tracking-wider opacity-60">CARD</span>}
                </div>
              </div>
              
              {/* Card Number Mask (Updates state dynamically) */}
              <div className="my-2 z-10 flex justify-center">
                <span className={`text-base sm:text-lg font-mono tracking-[0.22em] font-semibold text-slate-100 drop-shadow transition-opacity duration-300 ${isNumberComplete ? 'opacity-100' : 'opacity-70'}`}>
                  {isNumberComplete ? '•••• •••• •••• ••••' : '•••• •••• •••• ••••'}
                </span>
              </div>
              
              {/* Bottom Row: Holder and Expiry */}
              <div className="flex justify-between items-end z-10 font-mono">
                <div className="flex flex-col gap-0.5 max-w-[70%]">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400">Cardholder</span>
                  <span className="text-xs font-semibold tracking-wider uppercase truncate text-slate-200">
                    {cardholderName || 'CARDHOLDER NAME'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 items-end">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400">Expires</span>
                  <span className={`text-xs font-semibold text-slate-200 transition-opacity duration-300 ${expiryComplete ? 'opacity-100' : 'opacity-70'}`}>
                    {expiryComplete ? '••/••' : 'MM/YY'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Card Back */}
            <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 py-5 text-white shadow-xl backface-hidden border border-white/10 rotate-y-180 flex flex-col justify-between">
              {/* Magnetic Strip */}
              <div className="w-full h-10 bg-slate-950 mt-1"></div>
              
              {/* Signature Strip & CVC Placeholder */}
              <div className="px-5 flex flex-col gap-3">
                <div className="flex justify-between items-center gap-3">
                  <div className="w-[78%] h-7 bg-slate-200 rounded-sm flex items-center justify-end px-3">
                    <span className="text-slate-450 font-mono text-[8.5px] select-none tracking-widest font-bold">SECURE CHECKOUT</span>
                  </div>
                  <div className="w-[20%] h-7 bg-amber-100 rounded-sm flex items-center justify-center border border-amber-300">
                    <span className={`text-slate-900 font-mono text-xs font-bold tracking-wider transition-opacity duration-350 ${cvcComplete ? 'opacity-100' : 'opacity-60'}`}>
                      {cvcComplete ? '•••' : '•••'}
                    </span>
                  </div>
                </div>
                <p className="text-[7.5px] text-slate-400 leading-normal opacity-85 select-none font-sans">
                  Payments are compliant with the PCI Security Standards Council. Security code verification is handled securely by Stripe.
                </p>
              </div>
            </div>
            
          </div>
        </div>
        
        {/* Visual helper link to flip card manually */}
        <button
          type="button"
          onClick={handleCardClick}
          className="text-xs text-indigo-550 dark:text-indigo-400 font-semibold hover:underline mt-2.5 inline-flex items-center gap-1 cursor-pointer"
        >
          {isFlipped ? 'Show Front' : 'Show Back (CVC)'}
        </button>
      </div>

      {/* Stripe Payment Input Fields (Beautiful standard form inputs) */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground/80">Card Number</label>
          <div className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground hover:border-foreground/20 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all duration-200 items-center">
            <CardNumberElement 
              onChange={handleNumberChange} 
              onFocus={() => setIsFlipped(false)}
              options={elementOptions} 
              className="w-full" 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">Expiry Date</label>
            <div className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground hover:border-foreground/20 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all duration-200 items-center">
              <CardExpiryElement 
                onChange={(e) => setExpiryComplete(e.complete)} 
                onFocus={() => setIsFlipped(false)}
                options={elementOptions} 
                className="w-full" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">CVC</label>
            <div className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground hover:border-foreground/20 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all duration-200 items-center">
              <CardCvcElement 
                onChange={(e) => setCvcComplete(e.complete)}
                onFocus={() => setIsFlipped(true)}
                onBlur={() => setIsFlipped(false)}
                options={elementOptions} 
                className="w-full" 
              />
            </div>
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={!stripe || isProcessing} 
          className="w-full h-11 inline-flex items-center justify-center mt-3 font-bold" 
          isLoading={isProcessing}
        >
          Pay ${staticAmount.toFixed(2)}
        </Button>
      </form>
    </div>
  );
}
