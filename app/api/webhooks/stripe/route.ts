import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../../lib/email/mailer';
import crypto from 'crypto';
import { fulfillOrderAction } from '../../../actions/orders';

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature') || '';
  const body = await request.text();

  // Create a service-role Supabase client to bypass RLS in background webhooks
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch Stripe Webhook configuration dynamically from DB
  const { data: stripeSettings, error: dbError } = await supabaseAdmin
    .from('stripe_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (dbError || !stripeSettings) {
    console.error('Stripe credentials not found in database:', dbError);
    return NextResponse.json({ error: 'Stripe settings are not configured.' }, { status: 500 });
  }

  const secretKey = stripeSettings.secret_key;
  const webhookSecret = stripeSettings.webhook_secret;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Gateway secrets are missing.' }, { status: 500 });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2026-05-27.dahlia' as any,
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature validation failed:', err.message);
    return NextResponse.json({ error: `Signature Error: ${err.message}` }, { status: 400 });
  }

  // Record webhook events inside payment logs table
  try {
    await supabaseAdmin.from('payment_logs').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event,
    });
  } catch (logErr) {
    console.error('Failed to write payment log:', logErr);
  }

  const eventType = event.type;

  // ====================================================================
  // HANDLE SUCCESSFUL TRANSACTION
  // ====================================================================
  if (eventType === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderNumber = paymentIntent.metadata.orderNumber;

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order reference metadata is missing in transaction.' }, { status: 400 });
    }

    const result = await fulfillOrderAction(orderNumber, paymentIntent);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Fulfillment failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true, message: (result as any).message || 'Order fulfilled successfully.' });
  }

  // ====================================================================
  // HANDLE TRANSACTION FAILURE
  // ====================================================================
  if (eventType === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderNumber = paymentIntent.metadata.orderNumber;

    if (orderNumber) {
      // Find order
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, user_id')
        .eq('order_number', orderNumber)
        .single();

      if (order) {
        // Mark order and payment as failed
        await supabaseAdmin
          .from('orders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', order.id);

        await supabaseAdmin
          .from('payments')
          .update({
            status: 'failed',
            stripe_response: paymentIntent,
            updated_at: new Date().toISOString(),
          })
          .eq('order_id', order.id);

        // Notify user in dashboard
        if (order.user_id) {
          await supabaseAdmin.from('notifications').insert({
            user_id: order.user_id,
            title: 'Payment Declined',
            message: `Card transaction failed for order reference #${orderNumber}. Please try another card.`,
            read: false,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
