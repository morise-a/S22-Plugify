import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromiseCache: Promise<Stripe | null> | null = null;

/**
 * Loads Stripe.js on the client, fetching the publishable key from the DB
 * or falling back to the environment variables.
 */
export function getStripeClientInstance(customPublishableKey?: string): Promise<Stripe | null> {
  if (stripePromiseCache) {
    return stripePromiseCache;
  }

  let publishableKey = customPublishableKey;

  if (!publishableKey) {
    // If not supplied, let's fetch it via a server action or use process.env
    publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  }

  if (!publishableKey || publishableKey.includes('placeholder')) {
    console.warn('Stripe publishable key is placeholder or empty.');
    return Promise.resolve(null);
  }

  stripePromiseCache = loadStripe(publishableKey);
  return stripePromiseCache;
}

