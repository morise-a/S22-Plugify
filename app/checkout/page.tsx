'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Elements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react';
import { useCartStore } from '../../lib/store/use-cart-store';
import { useToast } from '../../components/ui/toast';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { createPaymentIntentAction, getPublicStripePublishableKeyAction } from '../actions/orders';
import { getCurrentUser } from '../actions/auth';
import { getStripeClientInstance } from '../../lib/stripe/client';
import { StripeElementForm } from '../../components/payment/stripe-element-form';
import { z } from 'zod';

const isValidDomainOrLocalhost = (val: string) => {
  const clean = val.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split(':')[0].trim().toLowerCase();
  if (clean === 'localhost') return true;
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (ipRegex.test(clean)) return true;
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  return domainRegex.test(clean);
};

const billingSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().min(12, 'Phone format: XXXX XXX XXX').max(12).regex(/^\d{4} \d{3} \d{3}$/, 'Must be XXXX XXX XXX'),
  domain: z.string()
    .min(1, 'Domain name is required')
    .trim()
    .toLowerCase()
    .refine((val) => {
      const items = useCartStore.getState().items;
      const isMultiDomain = items.some((item) => item.domain_count && item.domain_count > 1);
      if (!isMultiDomain) {
        return !val.includes(',');
      }
      return true;
    }, {
      message: 'Single domain plan only allows a single domain (no commas allowed).'
    })
    .refine((val) => {
      const items = useCartStore.getState().items;
      const isMultiDomain = items.some((item) => item.domain_count && item.domain_count > 1);

      if (!isMultiDomain) {
        return isValidDomainOrLocalhost(val);
      } else {
        const domains = val.split(',').map(d => d.trim()).filter(Boolean);
        if (domains.length === 0) return false;
        return domains.every(d => isValidDomainOrLocalhost(d));
      }
    }, {
      message: 'Please enter valid domain name(s) (e.g. example.com or localhost).'
    }),
  addressLine1: z.string().min(1, 'Address is required').max(150),
  addressLine2: z.string().max(100).optional(),
  city: z.string().min(1, 'City is required').max(50),
  state: z.string().min(1, 'State is required').max(50),
  postalCode: z.string().min(3, 'Postal code is required').max(15),
  country: z.string().min(1, 'Country is required').max(50),
});

type BillingFormData = z.infer<typeof billingSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { items, couponCode, getTotals } = useCartStore();

  const [stripePromise, setStripePromise] = React.useState<any>(null);
  const [clientSecret, setClientSecret] = React.useState<string>('');
  const [orderNumber, setOrderNumber] = React.useState<string>('');
  const [isSubmittingBilling, setIsSubmittingBilling] = React.useState(false);

  const { subtotal, discount, processingFee, tax, total } = getTotals();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BillingFormData>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      domain: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
    },
  });

  // Load user data for prefill and fetch Stripe Publishable Key
  React.useEffect(() => {
    async function loadInitialData() {
      // Prefill user details if logged in
      const user = await getCurrentUser();
      if (user) {
        setValue('firstName', user.first_name || '');
        setValue('lastName', user.last_name || '');
        setValue('email', user.email || '');
        setValue('phone', user.phone_number || '');
      }

      // Fetch dynamic Stripe publishable key
      try {
        const publishableKey = await getPublicStripePublishableKeyAction();
        if (publishableKey) {
          const promise = getStripeClientInstance(publishableKey);
          setStripePromise(promise);
        } else {
          showToast('Payment Gateway Error', 'error', 'Stripe credentials are not set up.');
        }
      } catch (err: any) {
        showToast('Gateway Error', 'error', 'Could not load Stripe client.');
      }
    }

    loadInitialData();
  }, [setValue, showToast]);

  const handlePhoneFormat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = '';
    if (raw.length > 0) {
      formatted = raw.slice(0, 4);
      if (raw.length > 4) {
        formatted += ' ' + raw.slice(4, 7);
      }
      if (raw.length > 7) {
        formatted += ' ' + raw.slice(7, 10);
      }
    }
    setValue('phone', formatted, { shouldValidate: true });
  };

  const onBillingSubmit = async (data: BillingFormData) => {
    if (items.length === 0) {
      showToast('Empty Cart', 'error', 'Your shopping cart is empty.');
      return;
    }

    setIsSubmittingBilling(true);

    const checkoutItems = items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      variantId: i.variantId,
      billingCycle: (i as any).billingCycle || 'monthly',
      durationMonths: (i as any).durationMonths || 1,
    }));

    try {
      const res = await createPaymentIntentAction(checkoutItems, data, couponCode || undefined);
      if (res.success && res.clientSecret && res.orderNumber) {
        setClientSecret(res.clientSecret);
        setOrderNumber(res.orderNumber);
        showToast('Billing Registered', 'success', 'Please complete your payment.');
      } else {
        showToast('Checkout Failed', 'error', res.error || 'Could not initiate Stripe order.');
      }
    } catch (err: any) {
      showToast('Checkout Error', 'error', 'An unexpected error occurred during checkout.');
    } finally {
      setIsSubmittingBilling(false);
    }
  };

  // Guard: Empty cart redirect
  React.useEffect(() => {
    if (items.length === 0 && !clientSecret) {
      router.push('/cart');
    }
  }, [items, clientSecret, router]);

  if (items.length === 0 && !clientSecret) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex-1 flex flex-col gap-8">
      {/* Header */}
      <div className="border-b border-border/40 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Checkout Flow
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete your billing details and settle payment.
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/cart')} className="inline-flex items-center gap-1 text-xs">
          <ArrowLeft className="h-4 w-4" />
          Edit Cart
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {/* Left Column: Billing or Stripe Card Elements */}
        <div className="lg:col-span-2 space-y-6">
          {!clientSecret ? (
            <Card className="border-border/60 bg-card shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Billing Information</CardTitle>
                <CardDescription>
                  Enter your address details to complete your order record.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onBillingSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      placeholder="Jane"
                      error={errors.firstName?.message}
                      {...register('firstName')}
                    />
                    <Input
                      label="Last Name"
                      placeholder="Doe"
                      error={errors.lastName?.message}
                      {...register('lastName')}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="jane@example.com"
                      error={errors.email?.message}
                      {...register('email')}
                    />
                    <Input
                      label="Phone Number"
                      placeholder="0700 123 456"
                      maxLength={12}
                      error={errors.phone?.message}
                      {...register('phone', { onChange: handlePhoneFormat })}
                    />
                  </div>

                  {(() => {
                    const isMultiDomain = items.some((item) => item.domain_count && item.domain_count > 1);
                    return (
                      <div className="space-y-1">
                        <Input
                          label={isMultiDomain ? "Domain(s) for License Registration" : "Domain for License Registration"}
                          placeholder={isMultiDomain ? "example.com or domain1.com, domain2.com" : "example.com"}
                          error={errors.domain?.message}
                          {...register('domain')}
                        />
                        {isMultiDomain ? (
                          <p className="text-[10px] text-muted-foreground font-semibold px-1">
                            You are purchasing a multiple-domain plan. You can register multiple domains by separating them with commas (e.g. <span className="font-mono font-bold text-slate-700 dark:text-slate-355">domain1.com, domain2.com</span>).
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground font-semibold px-1">
                            You are purchasing a single-domain plan. Please enter a single valid domain (no commas allowed).
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <Input
                    label="Address Line 1"
                    placeholder="123 Main St"
                    error={errors.addressLine1?.message}
                    {...register('addressLine1')}
                  />

                  <Input
                    label="Address Line 2 (Optional)"
                    placeholder="Apt, Suite, Unit"
                    error={errors.addressLine2?.message}
                    {...register('addressLine2')}
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="col-span-2 sm:col-span-2">
                      <Input
                        label="City"
                        placeholder="San Francisco"
                        error={errors.city?.message}
                        {...register('city')}
                      />
                    </div>
                    <Input
                      label="State"
                      placeholder="CA"
                      error={errors.state?.message}
                      {...register('state')}
                    />
                    <Input
                      label="Postal Code"
                      placeholder="94103"
                      error={errors.postalCode?.message}
                      {...register('postalCode')}
                    />
                  </div>

                  <Input
                    label="Country"
                    placeholder="United States"
                    error={errors.country?.message}
                    {...register('country')}
                  />

                  <Button type="submit" className="w-full mt-4 h-11" isLoading={isSubmittingBilling}>
                    Continue to Payment Method
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 bg-card shadow-md animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Method
                </CardTitle>
                <CardDescription>
                  Enter your card credentials below. Payments are secured and processed by Stripe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {stripePromise && clientSecret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <StripeElementForm
                      clientSecret={clientSecret}
                      orderNumber={orderNumber}
                      totalAmount={total}
                    />
                  </Elements>
                ) : (
                  <div className="h-28 flex items-center justify-center text-muted-foreground text-sm">
                    Connecting to payment gateways...
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/20 p-3 rounded-lg border border-border/40">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>Payments are PCI-compliant. Card data is never stored on our servers.</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Order Review */}
        <div className="space-y-6">
          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                Order Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Items List */}
              <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 divide-y divide-border/40">
                {items.map((item, idx) => (
                  <div key={item.id} className={`flex justify-between items-center gap-2 ${idx > 0 ? 'pt-3' : ''}`}>
                    <div className="flex gap-2.5 items-center">
                      <div className="h-10 w-12 bg-secondary/30 rounded border border-border flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground line-clamp-1">{item.name}</h4>
                        {item.variantName && (
                          <span className="block text-[10px] text-indigo-650 dark:text-indigo-400 font-bold">{item.variantName}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{item.quantity}x @ ${item.price}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <hr className="border-border/60" />

              {/* Calculations */}
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span>Discount Coupon</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>Processing Fee</span>
                  <span>${processingFee.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>

                <hr className="border-border/60" />

                <div className="flex justify-between text-sm font-bold text-foreground">
                  <span>Total Amount Due</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
