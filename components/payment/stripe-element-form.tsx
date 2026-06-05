'use client';

import * as React from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../lib/store/use-cart-store';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';

interface StripeElementFormProps {
  clientSecret: string;
  orderNumber: string;
  totalAmount: number;
}

export function StripeElementForm({ clientSecret, orderNumber, totalAmount }: StripeElementFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { showToast } = useToast();
  const clearCart = useCartStore((state) => state.clearCart);
  
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    try {
      // Confirm the card payment details using the clientSecret
      const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        showToast('Payment Failed', 'error', error.message || 'Declined.');
        router.push(`/checkout/failed?orderNumber=${orderNumber}&error=${encodeURIComponent(error.message || '')}`);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        showToast('Payment Confirmed!', 'success', 'Your order has been placed.');
        clearCart(); // Clear Zustand Cart
        router.push(`/checkout/success?orderNumber=${orderNumber}`);
      } else {
        router.push(`/checkout/success?orderNumber=${orderNumber}&status=${paymentIntent?.status}`);
      }
    } catch (err: any) {
      showToast('Error', 'error', 'An unexpected error occurred during confirmation.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-input bg-card rounded-lg shadow-inner">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '14px',
                color: 'var(--foreground)',
                fontFamily: 'system-ui, sans-serif',
                '::placeholder': {
                  color: '#9ca3af', // Gray 400 placeholder
                },
              },
              invalid: {
                color: '#ef4444',
              },
            },
          }}
        />
      </div>
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full h-11 inline-flex items-center justify-center" 
        isLoading={isProcessing}
      >
        Pay ${totalAmount.toFixed(2)}
      </Button>
    </form>
  );
}
