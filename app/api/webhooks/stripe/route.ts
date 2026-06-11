import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../../lib/email/mailer';
import crypto from 'crypto';

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

  const secretKey = stripeSettings.secret_key || process.env.STRIPE_SECRET_KEY;
  const webhookSecret = stripeSettings.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Gateway secrets are missing.' }, { status: 500 });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-01-27.acacia' as any,
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

    // Retrieve order row
    const { data: order, error: findError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (findError || !order) {
      console.error(`Order not found for orderNumber: ${orderNumber}`, findError);
      return NextResponse.json({ error: 'Pending order record not found.' }, { status: 404 });
    }

    // Guard: Prevent double-updating already-paid orders
    if (order.status === 'paid') {
      return NextResponse.json({ received: true, message: 'Already marked as paid.' });
    }

    // 1. Update Order Status
    const { error: orderUpdateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (orderUpdateErr) {
      console.error('Failed to update order status:', orderUpdateErr);
      return NextResponse.json({ error: 'Order update failed.' }, { status: 500 });
    }

    // Retrieve charge details for receipt URL
    const charge = paymentIntent.latest_charge as Stripe.Charge;
    let receiptUrl = null;
    if (typeof charge === 'object' && charge !== null) {
      receiptUrl = charge.receipt_url;
    } else if ((paymentIntent as any).charges && (paymentIntent as any).charges.data.length > 0) {
      receiptUrl = (paymentIntent as any).charges.data[0].receipt_url;
    }

    // 2. Update Payment records
    const { error: paymentUpdateErr } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'succeeded',
        receipt_url: receiptUrl || null,
        stripe_charge_id: typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : paymentIntent.latest_charge?.id || null,
        stripe_response: paymentIntent,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order.id);

    if (paymentUpdateErr) {
      console.error('Failed to write payment details:', paymentUpdateErr);
    }

    // 3. Retrieve order items to check if subscription provisioning is needed
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (orderItems && order.user_id) {
      for (const item of orderItems) {
        // If product name includes Subscription or Plan or Pro or Plugin, write to subscriptions table
        const name = item.product_name.toLowerCase();

        // Generate a secure license key for each product in the order
        const itemLicenseKey = `S22-${crypto.randomBytes(16).toString('hex').toUpperCase().match(/.{4}/g)?.join('-')}`;
        const purchasedDate = new Date();
        const expiryDate = new Date();
        
        let durationMonths = 12; // Default to 12 months
        if (name.includes('subscription') || name.includes('plan') || name.includes('pro') || name.includes('starter') || name.includes('enterprise') || name.includes('plugin') || name.includes('license') || name.includes('monthly') || name.includes('yearly')) {
          durationMonths = 1;
          if (name.includes('yearly')) {
            durationMonths = 12;
          } else {
            const match = name.match(/monthly - (\d+) month/);
            if (match) {
              durationMonths = parseInt(match[1]);
            }
          }
        }
        expiryDate.setMonth(purchasedDate.getMonth() + durationMonths);
        if (name.includes('subscription') || name.includes('plan') || name.includes('pro') || name.includes('starter') || name.includes('enterprise') || name.includes('plugin') || name.includes('license') || name.includes('monthly') || name.includes('yearly')) {
          let durationMonths = 1;
          if (name.includes('yearly')) {
            durationMonths = 12;
          } else {
            const match = name.match(/monthly - (\d+) month/);
            if (match) {
              durationMonths = parseInt(match[1]);
            }
          }
          
          // Check if there is already an active subscription for this user and product
          const { data: existingSub } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', order.user_id)
            .eq('product_id', item.product_id)
            .eq('status', 'active')
            .gt('current_period_end', new Date().toISOString())
            .order('current_period_end', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingSub) {
            // Extend the existing subscription end date
            const newEndDate = new Date(existingSub.current_period_end);
            newEndDate.setMonth(newEndDate.getMonth() + durationMonths);

            await supabaseAdmin
              .from('subscriptions')
              .update({
                current_period_end: newEndDate.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingSub.id);
          } else {
            // Insert a new subscription
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(startDate.getMonth() + durationMonths);

            await supabaseAdmin.from('subscriptions').insert({
              user_id: order.user_id,
              product_id: item.product_id,
              status: 'active',
              stripe_subscription_id: `sub_${Math.random().toString(36).substring(2, 9)}`,
              current_period_start: startDate.toISOString(),
              current_period_end: endDate.toISOString(),
            });
          }
        }

        // Provision purchased domains slots dynamically using domain_count stored on variant
        let slotsCount = 1;
        let variantName = 'Standard';
        let foundVariant = false;

        const nameWithoutCycle = item.product_name.split(' (')[0];
        const nameParts = nameWithoutCycle.split(' - ');
        if (nameParts.length > 1) {
          const parsedVariantName = nameParts.slice(1).join(' - ').trim();
          
          // Look up variant details
          const { data: pv } = await supabaseAdmin
            .from('product_variants')
            .select('domain_count, name')
            .eq('product_id', item.product_id)
            .eq('name', parsedVariantName)
            .maybeSingle();

          if (pv) {
            slotsCount = pv.domain_count || 1;
            variantName = pv.name;
            foundVariant = true;
          } else {
            // Case-insensitive/like lookup just in case
            const { data: pvLike } = await supabaseAdmin
              .from('product_variants')
              .select('domain_count, name')
              .eq('product_id', item.product_id)
              .ilike('name', `%${parsedVariantName}%`)
              .limit(1);
            if (pvLike && pvLike.length > 0) {
              slotsCount = pvLike[0].domain_count || 1;
              variantName = pvLike[0].name;
              foundVariant = true;
            }
          }
        }

        // Fallback: query database for first variant of this product if none matches explicitly
        if (!foundVariant) {
          const { data: fallbackPv } = await supabaseAdmin
            .from('product_variants')
            .select('domain_count, name')
            .eq('product_id', item.product_id)
            .limit(1);
            
          if (fallbackPv && fallbackPv.length > 0) {
            slotsCount = fallbackPv[0].domain_count || 1;
            variantName = fallbackPv[0].name;
          }
        }
        
        const checkoutDomain = paymentIntent.metadata.domain || '';
        const domainsList = checkoutDomain
          ? checkoutDomain.split(',').map((d: string) => d.trim().toLowerCase()).filter(Boolean)
          : [];

        for (let i = 0; i < slotsCount; i++) {
          const domainName = domainsList[i] || null;
          
          await supabaseAdmin.from('purchased_domains').insert({
            user_id: order.user_id,
            order_id: order.id,
            product_id: item.product_id,
            domain_name: domainName,
            variant_name: variantName,
          });
        }

        // Insert into license_keys table (with resolved variant name saved in plan_name)
        const { error: licErr } = await supabaseAdmin
          .from('license_keys')
          .insert({
            user_id: order.user_id,
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.product_name,
            plan_name: variantName,
            license_key: itemLicenseKey,
            purchased_date: purchasedDate.toISOString(),
            expiry_date: expiryDate.toISOString(),
          });
          
        if (licErr) {
          console.error('Failed to create product license key:', licErr);
        }
      }
    }

    // 4. Send Confirmation Email via SMTP
    if (order.billing_email) {
      try {
        const { data: template } = await supabaseAdmin
          .from('mail_templates')
          .select('*')
          .eq('template_name', 'order_confirmation')
          .single();

        const customerName = `${order.billing_first_name} ${order.billing_last_name}`;
        const itemsList = orderItems
          ? orderItems.map((i) => `${i.product_name} (x${i.quantity})`).join(', ')
          : 'Software License';

        const subject = template?.subject
          ? template.subject.replace(/{{order_number}}/g, order.order_number)
          : `Order Confirmation - #${order.order_number}`;

        const defaultHtml = `
          <h2>Thank you for your order!</h2>
          <p>Hi {{customer_name}},</p>
          <p>We received your payment of <strong>{{payment_amount}}</strong> for <strong>{{product_name}}</strong>.</p>
          <p>Order reference: <strong>{{order_number}}</strong></p>
          <p>Your Product License Key: <strong style="font-family: monospace; font-size: 1.1em; letter-spacing: 0.5px;">{{license_key}}</strong></p>
        `;

        const rawHtml = template?.html_content || defaultHtml;

        // Fetch all generated license keys for this order
        let generatedLicenses: any[] = [];
        if (order.user_id) {
          const { data: licenses } = await supabaseAdmin
            .from('license_keys')
            .select('product_name, license_key')
            .eq('order_id', order.id);
          generatedLicenses = licenses || [];
        }

        let licenseKeysDisplay = 'N/A';
        if (generatedLicenses.length > 0) {
          if (generatedLicenses.length === 1) {
            licenseKeysDisplay = generatedLicenses[0].license_key;
          } else {
            licenseKeysDisplay = generatedLicenses.map((l: any) => `${l.product_name}: ${l.license_key}`).join('<br/>');
          }
        }

        let emailBody = rawHtml
          .replace(/{{customer_name}}/g, customerName)
          .replace(/{{order_number}}/g, order.order_number)
          .replace(/{{product_name}}/g, itemsList)
          .replace(/{{payment_amount}}/g, `$${order.total.toFixed(2)}`)
          .replace(/{{license_key}}/g, licenseKeysDisplay);

        // If the custom template didn't have the license_key placeholder, append it cleanly at the bottom
        if (template?.html_content && !template.html_content.includes('{{license_key}}')) {
          if (generatedLicenses.length > 1) {
            emailBody += `<div style="margin-top: 20px; padding: 15px; background-color: #f8fafc; border: 1px dashed #e2e8f0; border-radius: 8px;"><strong>Your Product License Keys:</strong><br/>${licenseKeysDisplay}</div>`;
          } else {
            emailBody += `<p style="margin-top: 20px; padding: 15px; background-color: #f8fafc; border: 1px dashed #e2e8f0; border-radius: 8px;">Your Product License Key: <strong style="font-family: monospace; font-size: 1.1em; letter-spacing: 0.5px;">${licenseKeysDisplay}</strong></p>`;
          }
        }

        // Send email, passing the admin service role client for settings retrieval
        await sendEmail(
          {
            to: order.billing_email,
            subject,
            html: emailBody,
          },
          supabaseAdmin
        );
      } catch (emailErr) {
        console.error('Email confirmation dispatch failure:', emailErr);
      }
    }

    // 5. Create System Notification
    if (order.user_id) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: order.user_id,
          title: 'Order Confirmed',
          message: `Your payment for order #${order.order_number} has been processed successfully.`,
          read: false,
        });
      } catch (notifErr) {
        console.error('Failed to create customer dashboard notification:', notifErr);
      }
    }
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
