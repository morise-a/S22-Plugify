'use server';

import { createActionClient } from '../../lib/supabase/action';
import { getStripeServerInstance } from '../../lib/stripe/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendEmail } from '../../lib/email/mailer';

export interface CheckoutBillingInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  domain: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface CheckoutItem {
  id: string; // Product UUID
  variantId?: string; // Selected Variant UUID
  quantity: number;
  billingCycle?: 'monthly' | 'yearly';
  durationMonths?: number;
  isRenewal?: boolean;
  renewalLicenseKey?: string;
}

// Flat tax rate and Stripe transaction fees
const TAX_RATE = 0.08;
const STRIPE_PERCENT = 0.029;
const STRIPE_FLAT = 0.30;

// Valid coupon validation helpers
const COUPONS: Record<string, number> = {
  'SAVE10': 10,
  'WELCOME50': 50,
  'ENTERPRISE20': 20,
};

/**
 * Creates a Stripe Payment Intent and saves a pending Order record in Supabase.
 */
export async function createPaymentIntentAction(
  items: CheckoutItem[],
  billingInfo: CheckoutBillingInput,
  couponCode?: string
) {
  if (!items || items.length === 0) {
    return { success: false, error: 'Cart is empty.' };
  }

  const supabase = await createActionClient();
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Retrieve user (optional - allow guest checkout or force logged in)
  let user = null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    user = userData?.user || null;
  } catch (err) {
    console.error('Failed to retrieve user session during checkout (e.g. offline/timeout):', err);
  }

  // 1. Fetch products from database to prevent price manipulation
  const productIds = items.map((i) => i.id);
  const { data: dbProducts, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds);

  if (fetchError || !dbProducts || dbProducts.length === 0) {
    return { success: false, error: 'Failed to retrieve products from database.' };
  }

  // 1b. Fetch variants if referenced
  const variantIds = items.map((i) => i.variantId).filter(Boolean) as string[];
  let dbVariants: any[] = [];
  if (variantIds.length > 0) {
    const { data: vData, error: vError } = await supabase
      .from('product_variants')
      .select('*')
      .in('id', variantIds);
    if (vError) {
      console.error('Failed to retrieve variants:', vError);
      return { success: false, error: 'Failed to retrieve product variants.' };
    }
    dbVariants = vData || [];
  }

  // 2. Perform server-side calculation of subtotal, tax, processing fee, and total
  let subtotal = 0;
  const itemDetails: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    isRenewal: boolean;
    renewalLicenseKey: string | null;
  }[] = [];

  for (const item of items) {
    const dbProduct = dbProducts.find((p) => p.id === item.id);
    if (!dbProduct || !dbProduct.is_active) {
      return { success: false, error: `Product not found or inactive: ${item.id}` };
    }

    let price = Number(dbProduct.price);
    let displayName = dbProduct.name;

    let isExplicitYearlyVariant = false;

    if (item.variantId) {
      const dbVariant = dbVariants.find((v) => v.id === item.variantId && v.product_id === item.id);
      if (!dbVariant) {
        return { success: false, error: `Variant not found: ${item.variantId}` };
      }
      price = Number(dbVariant.price);
      displayName = `${dbProduct.name} - ${dbVariant.name}`;
      if (dbVariant.billing_cycle === 'yearly') {
        isExplicitYearlyVariant = true;
      }
    }

    // Apply billing cycle price multiplier and format display name
    const months = (isExplicitYearlyVariant || item.billingCycle === 'yearly') ? 12 : (item.durationMonths || 1);
    const cycleLabel = (isExplicitYearlyVariant || item.billingCycle === 'yearly') ? 'Yearly - 12 Months' : `Monthly - ${months} Month${months > 1 ? 's' : ''}`;
    displayName = `${displayName} (${cycleLabel})`;

    if (isExplicitYearlyVariant) {
      // It is already yearly price, no multiplier
      price = price;
    } else if (item.billingCycle === 'yearly') {
      price = price * 10; // 2 months free discount
    } else {
      price = price * months;
    }
    subtotal += price * item.quantity;
    itemDetails.push({
      id: dbProduct.id,
      name: displayName,
      price: price,
      quantity: item.quantity,
      isRenewal: item.isRenewal || false,
      renewalLicenseKey: item.renewalLicenseKey || null,
    });
  }

  // 3. Compute Coupon Discount
  let discount = 0;
  let discountPercent = 0;
  if (couponCode) {
    const code = couponCode.toUpperCase().trim();
    if (COUPONS[code] !== undefined) {
      discountPercent = COUPONS[code];
      discount = Number(((subtotal * discountPercent) / 100).toFixed(2));
    }
  }

  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = Number((afterDiscount * TAX_RATE).toFixed(2));
  const processingFee = afterDiscount > 0
    ? Number((afterDiscount * STRIPE_PERCENT + STRIPE_FLAT).toFixed(2))
    : 0;
  const total = Number((afterDiscount + tax + processingFee).toFixed(2));

  // Stripe amount in cents (integer)
  const amountInCents = Math.round(total * 100);

  if (amountInCents <= 0) {
    return { success: false, error: 'Invalid checkout amount.' };
  }

  // Generate unique order number
  const orderNumber = `APX-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  try {
    // 4. Initialize Stripe on server
    const stripe = await getStripeServerInstance();

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'aud',
      metadata: {
        orderNumber,
        userId: user?.id || 'guest',
        email: billingInfo.email,
        couponCode: couponCode || '',
        domain: billingInfo.domain || '',
      },
    });

    // 5. Database Transaction: Save Pending Order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user?.id || null,
        order_number: orderNumber,
        status: 'pending',
        subtotal,
        tax,
        processing_fee: processingFee,
        total,
        coupon_code: couponCode || null,
        coupon_discount: discount,
        billing_first_name: billingInfo.firstName,
        billing_last_name: billingInfo.lastName,
        billing_email: billingInfo.email,
        billing_phone: billingInfo.phone,
        billing_address_line1: billingInfo.addressLine1,
        billing_address_line2: billingInfo.addressLine2 || null,
        billing_city: billingInfo.city,
        billing_state: billingInfo.state,
        billing_postal_code: billingInfo.postalCode,
        billing_country: billingInfo.country,
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Order creation error:', orderError);
      return { success: false, error: `Failed to store pending order: ${orderError?.message}` };
    }

    // Save Order Items
    for (const detail of itemDetails) {
      const { error: itemErr } = await supabaseAdmin.from('order_items').insert({
        order_id: order.id,
        product_id: detail.id,
        product_name: detail.name,
        price: detail.price,
        quantity: detail.quantity,
        is_renewal: detail.isRenewal,
        renewal_license_key: detail.renewalLicenseKey,
      });
      if (itemErr) {
        console.error('Order item insertion error:', itemErr);
        throw new Error(`Failed to store order item: ${itemErr.message}`);
      }
    }

    // Save Pending Payment record
    const { error: paymentErr } = await supabaseAdmin.from('payments').insert({
      order_id: order.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: total,
      currency: 'aud',
      status: 'pending',
      processing_fee: processingFee,
    });
    if (paymentErr) {
      console.error('Payment insertion error:', paymentErr);
      throw new Error(`Failed to store pending payment: ${paymentErr.message}`);
    }

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      orderNumber,
    };
  } catch (stripeError: any) {
    console.error('Stripe processing error:', stripeError);
    return { success: false, error: `Payment gateway error: ${stripeError.message}` };
  }
}

/**
 * Fetch all orders placed by the currently logged-in customer.
 */
export async function getCustomerOrdersAction() {
  const supabase = await createActionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get customer orders error:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch all orders in the system (Admin only).
 */
export async function getAdminOrdersAction() {
  const supabase = await createActionClient();

  // Verify Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!dbUser || dbUser.role !== 'admin') {
    throw new Error('Unauthorized. Admin role required.');
  }

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      users!orders_user_id_fkey (first_name, last_name, email),
      order_items (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get admin orders error:', error);
    return [];
  }

  return data || [];
}

/**
 * Retrieve order details by ID or order number (guarded by authorization checks).
 */
export async function getOrderDetailsAction(identifier: string) {
  const supabase = await createActionClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Query order
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*),
      payments (*)
    `)
    .or(`id.eq.${identifier},order_number.eq.${identifier}`)
    .single();

  if (error || !order) {
    console.error('Get order error:', error);
    return null;
  }

  // Guard: Admin can view any order. Guest checkouts can view by email match or session match.
  // Registered users can only view their own order.
  if (order.user_id !== null && (!user || user.id !== order.user_id)) {
    // Check if the user is admin
    if (user) {
      const { data: roleCheck } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (roleCheck?.role === 'admin') {
        return order;
      }
    }
    return null; // Access Denied
  }

  return order;
}

/**
 * Retrieve downloadable products for a paid order (used by real-time client verification).
 */
export async function getOrderDownloadableProductsAction(orderNumber: string) {
  // Use service-role client on the server to bypass RLS policies for order/download lookup
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      stripe_payment_intent_id,
      order_items (
        product_id
      )
    `)
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (error || !order) {
    return { success: false, status: 'not_found', products: [] };
  }

  // Fallback: Check if Stripe payment succeeded but webhook failed or has not completed yet.
  if (order.status !== 'paid' && order.stripe_payment_intent_id) {
    try {
      const stripe = await getStripeServerInstance();
      const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
      
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log(`Self-healing fallback triggered: Fulfilling order ${orderNumber} via client polling check.`);
        // Run fulfillment logic synchronously
        await fulfillOrderAction(orderNumber, paymentIntent);
        
        // Re-fetch updated order state from database
        const { data: updatedOrder } = await supabase
          .from('orders')
          .select(`
            id,
            status,
            order_items (
              product_id
            )
          `)
          .eq('order_number', orderNumber)
          .maybeSingle();
          
        if (updatedOrder) {
          order.status = updatedOrder.status;
          order.order_items = updatedOrder.order_items as any;
        }
      }
    } catch (stripeErr) {
      console.error('Failed to verify/fulfill order via Stripe fallback:', stripeErr);
    }
  }

  if (order.status !== 'paid') {
    return { success: true, status: order.status, products: [] };
  }

  const productIds = order.order_items?.map((item: any) => item.product_id).filter(Boolean) || [];
  if (productIds.length === 0) {
    return { success: true, status: 'paid', products: [] };
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, name, plugin_file_url')
    .in('id', productIds);

  const downloadableProducts = (products || [])
    .filter((p: any) => p.plugin_file_url)
    .map((p: any) => ({
      name: p.name,
      url: p.plugin_file_url,
    }));

  return {
    success: true,
    status: 'paid',
    products: downloadableProducts,
  };
}

/**
 * Verifies a coupon code server-side and returns discount percent.
 */
export async function verifyCouponAction(code: string) {
  const uppercaseCode = code.toUpperCase().trim();
  const discount = COUPONS[uppercaseCode];

  if (discount !== undefined) {
    return { valid: true, discountPercent: discount };
  }
  return { valid: false, discountPercent: 0 };
}

/**
 * Retrieves the public Stripe publishable key dynamically from DB settings.
 */
export async function getPublicStripePublishableKeyAction() {
  const supabase = await createActionClient();
  const { data, error } = await supabase
    .from('stripe_settings')
    .select('publishable_key')
    .eq('id', 1)
    .single();
  return data?.publishable_key;
}

/**
 * Updates a domain slot configured by the user.
 */
export async function updatePurchasedDomainAction(domainId: string, domainName: string) {
  const supabase = await createActionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  const trimmedDomain = domainName.trim().toLowerCase();
  if (!trimmedDomain) {
    return { success: false, error: 'Domain name cannot be empty.' };
  }

  // Basic domain check: letters, digits, dots, hyphens or localhost
  const isValidDomainOrLocalhost = (val: string) => {
    const clean = val.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split(':')[0].trim().toLowerCase();
    if (clean === 'localhost') return true;
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (ipRegex.test(clean)) return true;
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(clean);
  };

  if (!isValidDomainOrLocalhost(trimmedDomain)) {
    return { success: false, error: 'Please enter a valid domain name (e.g., example.com or localhost).' };
  }

  const { data, error } = await supabase
    .from('purchased_domains')
    .update({ domain_name: trimmedDomain })
    .eq('id', domainId)
    .eq('user_id', user.id)
    .select();

  if (error) {
    console.error('Update domain error:', error);
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'Domain slot not found or access denied.' };
  }

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/customer/dashboard', 'layout');

  return { success: true };
}

/**
 * Marks a pending order and its associated payment as failed in the database.
 */
export async function markOrderAsFailedAction(orderNumber: string) {
  const supabase = await createActionClient();

  try {
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', orderNumber)
      .single();

    if (findError || !order) {
      console.error(`Order not found for failure mark: ${orderNumber}`, findError);
      return { success: false, error: 'Order not found.' };
    }

    // Update order status to failed
    const { error: orderErr } = await supabase
      .from('orders')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (orderErr) {
      console.error(`Failed to update order status to failed: ${order.id}`, orderErr);
    }

    // Update payment status to failed
    const { error: paymentErr } = await supabase
      .from('payments')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order.id);

    if (paymentErr) {
      console.error(`Failed to update payment status to failed for order: ${order.id}`, paymentErr);
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to run markOrderAsFailedAction:', err);
    return { success: false, error: 'Failed to process order failure update.' };
  }
}

/**
 * Fulfills an order after a successful payment has been confirmed.
 * This provisions subscription, domain slots, license keys, sends email, and logs status.
 */
export async function fulfillOrderAction(orderNumber: string, paymentIntent: any) {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Retrieve order row
  const { data: order, error: findError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (findError || !order) {
    console.error(`Order not found for orderNumber: ${orderNumber}`, findError);
    return { success: false, error: 'Pending order record not found.' };
  }

  // Guard: Prevent double-updating already-paid orders
  if (order.status === 'paid') {
    return { success: true, message: 'Already marked as paid.' };
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
    return { success: false, error: 'Order update failed.' };
  }

  // Retrieve charge details for receipt URL
  const charge = paymentIntent.latest_charge;
  let receiptUrl = null;
  if (typeof charge === 'object' && charge !== null) {
    receiptUrl = charge.receipt_url;
  } else if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
    receiptUrl = paymentIntent.charges.data[0].receipt_url;
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
    let domainIndexOffset = 0;
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

      const isRenewal = item.is_renewal || false;
      const renewalLicenseKey = item.renewal_license_key || null;

      if (isRenewal && renewalLicenseKey) {
        // RENEWAL PROCESS: Update existing license key expiry date based on plan duration
        const { data: existingLicense } = await supabaseAdmin
          .from('license_keys')
          .select('*')
          .eq('license_key', renewalLicenseKey)
          .maybeSingle();

        if (existingLicense) {
          const currentExpiry = new Date(existingLicense.expiry_date);
          const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
          const newExpiry = new Date(baseDate);
          newExpiry.setMonth(baseDate.getMonth() + durationMonths);

          const { error: updateLicErr } = await supabaseAdmin
            .from('license_keys')
            .update({
              expiry_date: newExpiry.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingLicense.id);

          if (updateLicErr) {
            console.error(`Failed to renew license key ${renewalLicenseKey}:`, updateLicErr);
          }
        } else {
          console.error(`Renewal license key not found in db: ${renewalLicenseKey}`);
        }
      } else {
        // NEW PURCHASE PROCESS: Provision domains and generate new license key
        const checkoutDomain = paymentIntent.metadata.domain || '';
        const domainsList = checkoutDomain
          ? checkoutDomain.split(',').map((d: string) => d.trim().toLowerCase()).filter(Boolean)
          : [];

        const totalSlots = slotsCount * item.quantity;
        for (let i = 0; i < totalSlots; i++) {
          const domainName = domainsList[domainIndexOffset + i] || null;

          await supabaseAdmin.from('purchased_domains').insert({
            user_id: order.user_id,
            order_id: order.id,
            product_id: item.product_id,
            domain_name: domainName,
            variant_name: variantName,
          });
        }
        domainIndexOffset += totalSlots;

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

      // Send email in background, passing the admin service role client for settings retrieval
      sendEmail(
        {
          to: order.billing_email,
          subject,
          html: emailBody,
        },
        supabaseAdmin
      ).catch((emailErr) => {
        console.error('Email confirmation dispatch failure in background:', emailErr);
      });
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

  return { success: true };
}
