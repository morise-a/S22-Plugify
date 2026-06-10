'use server';

import { createActionClient } from '../../lib/supabase/action';
import { getStripeServerInstance } from '../../lib/stripe/server';

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

  // Retrieve user (optional - allow guest checkout or force logged in)
  const { data: { user } } = await supabase.auth.getUser();

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
  const itemDetails: { id: string; name: string; price: number; quantity: number }[] = [];

  for (const item of items) {
    const dbProduct = dbProducts.find((p) => p.id === item.id);
    if (!dbProduct || !dbProduct.is_active) {
      return { success: false, error: `Product not found or inactive: ${item.id}` };
    }

    let price = Number(dbProduct.price);
    let displayName = dbProduct.name;

    if (item.variantId) {
      const dbVariant = dbVariants.find((v) => v.id === item.variantId && v.product_id === item.id);
      if (!dbVariant) {
        return { success: false, error: `Variant not found: ${item.variantId}` };
      }
      price = Number(dbVariant.price);
      displayName = `${dbProduct.name} - ${dbVariant.name}`;
    }

    // Apply billing cycle price multiplier and format display name
    const months = item.billingCycle === 'yearly' ? 12 : (item.durationMonths || 1);
    const cycleLabel = item.billingCycle === 'yearly' ? 'Yearly - 12 Months' : `Monthly - ${months} Month${months > 1 ? 's' : ''}`;
    displayName = `${displayName} (${cycleLabel})`;

    if (item.billingCycle === 'yearly') {
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
      },
    });

    // 5. Database Transaction: Save Pending Order
    const { data: order, error: orderError } = await supabase
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
        domain: billingInfo.domain,
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
      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: detail.id,
        product_name: detail.name,
        price: detail.price,
        quantity: detail.quantity,
      });
    }

    // Save Pending Payment record
    await supabase.from('payments').insert({
      order_id: order.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: total,
      currency: 'aud',
      status: 'pending',
      processing_fee: processingFee,
    });

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
  const supabase = await createActionClient();

  const { data: order, error } = await supabase
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

  if (error || !order) {
    return { success: false, status: 'not_found', products: [] };
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
  const { data } = await supabase
    .from('stripe_settings')
    .select('publishable_key')
    .eq('id', 1)
    .single();

  return data?.publishable_key || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
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
