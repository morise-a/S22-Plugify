import Stripe from 'stripe';
import { createActionClient } from '../supabase/action';

/**
 * Initializes a Stripe instance on the server dynamically,
 * prioritizing database settings over environment variables.
 */
export async function getStripeServerInstance() {
  const supabase = await createActionClient();

  const { data: stripeSettings } = await supabase
    .from('stripe_settings')
    .select('*')
    .eq('id', 1)
    .single();

  const secretKey = stripeSettings?.secret_key;

  if (!secretKey || secretKey.includes('placeholder')) {
    throw new Error('Stripe Secret Key is not configured. Please set it up in the Admin Settings.');
  }

  return new Stripe(secretKey, {
    apiVersion: '2026-05-27.dahlia' as any, // Set a modern API version compatibility
  });
}
