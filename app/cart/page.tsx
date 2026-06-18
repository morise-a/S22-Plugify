'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Trash2, ArrowRight, ArrowLeft, Ticket, Tag, Mail, Lock, User as UserIcon, Phone, ShieldAlert } from 'lucide-react';
import { useCartStore } from '../../lib/store/use-cart-store';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { Card, CardContent } from '../../components/ui/card';
import { ConfirmationModal } from '../../components/ui/confirmation-modal';
import { Modal } from '../../components/ui/modal';
import { getProductAction } from '../actions/products';
import { signInAction, signUpAction, getCurrentUser } from '../actions/auth';

export default function CartPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const {
    items,
    couponCode,
    couponDiscountPercent,
    updateQuantity,
    removeFromCart,
    applyCoupon,
    removeCoupon,
    getTotals,
  } = useCartStore();

  const [couponInput, setCouponInput] = React.useState('');
  const [deleteItem, setDeleteItem] = React.useState<{ id: string; variantId?: string; name: string } | null>(null);
  const [productsDetails, setProductsDetails] = React.useState<Record<string, any>>({});

  // Auth modal states
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [authTab, setAuthTab] = React.useState<'signin' | 'signup'>('signin');
  const [isAuthSubmitting, setIsAuthSubmitting] = React.useState(false);

  // Sign in form state
  const [signInEmail, setSignInEmail] = React.useState('');
  const [signInPassword, setSignInPassword] = React.useState('');
  const [signInError, setSignInError] = React.useState('');

  // Sign up form state
  const [signUpFirstName, setSignUpFirstName] = React.useState('');
  const [signUpLastName, setSignUpLastName] = React.useState('');
  const [signUpEmail, setSignUpEmail] = React.useState('');
  const [signUpPhone, setSignUpPhone] = React.useState('');
  const [signUpPassword, setSignUpPassword] = React.useState('');
  const [signUpError, setSignUpError] = React.useState('');

  React.useEffect(() => {
    const fetchDetails = async () => {
      const missingIds = items
        .map((item) => item.id)
        .filter((id) => !productsDetails[id]);

      if (missingIds.length === 0) return;

      const newDetails = { ...productsDetails };
      let updated = false;
      for (const id of missingIds) {
        try {
          const prod = await getProductAction(id);
          if (prod) {
            newDetails[id] = prod;
            updated = true;
          }
        } catch (err) {
          console.error('Error fetching product details in cart:', err);
        }
      }
      if (updated) {
        setProductsDetails(newDetails);
      }
    };

    fetchDetails();
  }, [items, productsDetails]);

  const handleToggleCycle = async (item: any, newCycle: 'monthly' | 'yearly') => {
    if ((item.billingCycle || 'monthly') === newCycle) return;

    let product = productsDetails[item.id];
    if (!product) {
      try {
        product = await getProductAction(item.id);
        if (product) {
          setProductsDetails((prev) => ({ ...prev, [item.id]: product }));
        }
      } catch (err) {
        console.error('Failed to fetch product details:', err);
      }
    }

    if (!product) {
      showToast('Error', 'error', 'Could not retrieve product pricing details.');
      return;
    }

    let targetVariant = null;
    let newPrice = 0;
    let newVariantId = undefined;
    let newVariantName = '';

    const newCycleLabel = newCycle === 'yearly' ? 'Yearly' : 'Monthly';

    // 1. If product has variants
    if (product.product_variants && product.product_variants.length > 0) {
      const currentVariant = product.product_variants.find((v: any) => v.id === item.variantId);

      const cleanVariantName = (name: string) =>
        name
          .replace(/\s*\(.*Monthly.*\)/i, '')
          .replace(/\s*\(.*Yearly.*\)/i, '')
          .replace(/\s*\(.*Renewal.*\)/i, '')
          .trim();

      const targetName = currentVariant ? cleanVariantName(currentVariant.name) : '';

      targetVariant = product.product_variants.find((v: any) =>
        v.billing_cycle === newCycle &&
        (currentVariant ? cleanVariantName(v.name) === targetName : true)
      );

      if (!targetVariant && currentVariant) {
        targetVariant = product.product_variants.find((v: any) =>
          v.billing_cycle === newCycle &&
          v.domain_count === currentVariant.domain_count
        );
      }

      if (!targetVariant) {
        targetVariant = product.product_variants.find((v: any) => v.billing_cycle === newCycle);
      }

      if (targetVariant) {
        newVariantId = targetVariant.id;
        newPrice = Number(targetVariant.price);
        if (item.isRenewal) {
          newVariantName = `${targetVariant.name} (Renewal - ${newCycleLabel})`;
        } else {
          newVariantName = `${targetVariant.name} (${newCycleLabel})`;
        }
      } else {
        newPrice = newCycle === 'yearly' ? Number(product.price) * 10 : Number(product.price);
        if (item.isRenewal) {
          newVariantName = `Standard (Renewal - ${newCycleLabel})`;
        } else {
          newVariantName = `Standard (${newCycleLabel})`;
        }
      }
    } else {
      newPrice = newCycle === 'yearly' ? Number(product.price) * 10 : Number(product.price);
      if (item.isRenewal) {
        newVariantName = `Standard (Renewal - ${newCycleLabel})`;
      } else {
        newVariantName = `Standard (${newCycleLabel})`;
      }
    }

    const updatedFields: any = {
      billingCycle: newCycle,
      price: newPrice,
      variantId: newVariantId,
      variantName: newVariantName,
      durationMonths: newCycle === 'yearly' ? 12 : 1,
    };

    if (item.startDate) {
      const start = new Date(item.startDate);
      const end = new Date(start);
      end.setMonth(start.getMonth() + (newCycle === 'yearly' ? 12 : 1));

      const format = (dVal: Date) => dVal.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      updatedFields.endDate = format(end);
    } else {
      const start = new Date();
      const end = new Date(start);
      end.setMonth(start.getMonth() + (newCycle === 'yearly' ? 12 : 1));

      const format = (dVal: Date) => dVal.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      updatedFields.startDate = format(start);
      updatedFields.endDate = format(end);
    }

    useCartStore.getState().updateCartItem(item.id, item.variantId, updatedFields);
    showToast('Plan Updated', 'success', `Switched "${item.name}" to ${newCycleLabel} billing.`);
  };

  const handleVariantChange = async (item: any, newVariantId: string) => {
    let product = productsDetails[item.id];
    if (!product) {
      try {
        product = await getProductAction(item.id);
        if (product) {
          setProductsDetails((prev) => ({ ...prev, [item.id]: product }));
        }
      } catch (err) {
        console.error('Failed to fetch product details:', err);
      }
    }

    if (!product) {
      showToast('Error', 'error', 'Could not retrieve product details.');
      return;
    }

    const newVariant = product.product_variants?.find((v: any) => v.id === newVariantId);
    if (!newVariant) return;

    const itemCycle = item.billingCycle || 'monthly';
    const isYearlyVariant = newVariant.billing_cycle === 'yearly';

    // Calculate new price based on billing cycle
    let newPrice = Number(newVariant.price);
    if (!isYearlyVariant) {
      if (itemCycle === 'yearly') {
        newPrice = newPrice * 10;
      } else {
        newPrice = newPrice * (item.durationMonths || 1);
      }
    }

    const newCycleLabel = itemCycle === 'yearly' ? 'Yearly' : 'Monthly';
    let newVariantName = '';
    if (item.isRenewal) {
      newVariantName = `${newVariant.name} (Renewal - ${newCycleLabel})`;
    } else {
      newVariantName = `${newVariant.name} (${newCycleLabel})`;
    }

    const updatedFields: any = {
      variantId: newVariant.id,
      variantName: newVariantName,
      price: newPrice,
      domain_count: newVariant.domain_count,
      layout_count: newVariant.layout_count,
    };

    useCartStore.getState().updateCartItem(item.id, item.variantId, updatedFields);
    showToast('Variant Updated', 'success', `Switched "${item.name}" to variant: ${newVariant.name}.`);
  };

  const { subtotal, discount, processingFee, tax, total } = getTotals();

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    const res = applyCoupon(couponInput);
    if (res.success) {
      showToast('Coupon Applied', 'success', res.message);
      setCouponInput('');
    } else {
      showToast('Invalid Coupon', 'error', res.message);
    }
  };

  const handleCheckout = async () => {
    const user = await getCurrentUser();
    if (user) {
      router.push('/checkout');
    } else {
      setSignInEmail('');
      setSignInPassword('');
      setSignInError('');
      setSignUpFirstName('');
      setSignUpLastName('');
      setSignUpEmail('');
      setSignUpPhone('');
      setSignUpPassword('');
      setSignUpError('');
      setAuthTab('signin');
      setIsAuthModalOpen(true);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    if (!signInEmail || !signInPassword) {
      setSignInError('Please enter both email and password.');
      return;
    }
    setIsAuthSubmitting(true);
    try {
      const res = await signInAction({ email: signInEmail, password: signInPassword });
      if (res.success && res.user) {
        showToast('Welcome back!', 'success', 'Successfully signed in.');
        setIsAuthModalOpen(false);
        router.push('/checkout');
        router.refresh();
      } else {
        setSignInError(res.error || 'Invalid email or password.');
      }
    } catch (err) {
      setSignInError('An unexpected error occurred during sign in.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
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
    setSignUpPhone(formatted);
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');

    if (!signUpFirstName || !signUpLastName || !signUpEmail || !signUpPhone || !signUpPassword) {
      setSignUpError('All fields are required.');
      return;
    }

    if (signUpPassword.length < 8) {
      setSignUpError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(signUpPassword)) {
      setSignUpError('Password must contain at least one uppercase letter.');
      return;
    }

    if (!/[0-9]/.test(signUpPassword)) {
      setSignUpError('Password must contain at least one number.');
      return;
    }

    if (!/[^A-Za-z0-9]/.test(signUpPassword)) {
      setSignUpError('Password must contain at least one special character.');
      return;
    }

    if (signUpPhone.length !== 12) {
      setSignUpError('Phone format must be XXXX XXX XXX.');
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const res = await signUpAction({
        firstName: signUpFirstName,
        lastName: signUpLastName,
        email: signUpEmail,
        phone: signUpPhone,
        password: signUpPassword
      });
      if (res.success && res.user) {
        showToast('Welcome!', 'success', 'Account created and signed in successfully.');
        setIsAuthModalOpen(false);
        router.push('/checkout');
        router.refresh();
      } else {
        setSignUpError(res.error || 'Failed to create account.');
      }
    } catch (err: any) {
      setSignUpError(err.message || 'An unexpected error occurred during sign up.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 flex-1 flex flex-col justify-center items-center gap-6">
        <div className="p-5 bg-secondary/50 rounded-full border border-border">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-1 text-center">
          <h2 className="text-xl font-bold text-foreground">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Add items from our software catalog to begin the checkout process.
          </p>
        </div>
        <Button href="/products" className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex-1 flex flex-col gap-8">
      <div className="border-b border-border/40 pb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Shopping Cart
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your items and proceed to billing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="divide-y divide-border/60 border border-border/60 bg-card rounded-2xl overflow-hidden shadow-sm">
            {items.map((item) => (
              <div key={`${item.id}-${item.variantId || 'default'}`} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-4 items-center">
                  <div className="h-16 w-20 bg-secondary/30 rounded-lg overflow-hidden border border-border flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1">{item.name}</h3>
                    {item.variantName && (
                      <span className="block text-[10px] text-indigo-650 font-bold mt-0.5">{item.variantName}</span>
                    )}
                    {item.isRenewal && item.startDate && item.endDate && (
                      <span className="block text-[10px] text-amber-600 font-bold mt-0.5">
                        🔄 Renewal Period: {item.startDate} - {item.endDate}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">${item.price} each</p>

                    {/* Billing Cycle Option Selector */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Billing:</span>
                      <div className="inline-flex p-0.5 bg-secondary rounded-lg border border-border/40">
                        <button
                          type="button"
                          onClick={() => handleToggleCycle(item, 'monthly')}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${(item.billingCycle || 'monthly') === 'monthly' ? 'bg-background text-foreground shadow-sm border border-border/10' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCycle(item, 'yearly')}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${item.billingCycle === 'yearly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Yearly
                          <span className={`text-[8px] px-1 rounded-full text-[7px] font-extrabold uppercase ${item.billingCycle === 'yearly' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/20'}`}>
                            Save 20%
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Select License Variant Option Selector */}
                    {(() => {
                      const itemCycle = item.billingCycle || 'monthly';
                      const productVariants = (productsDetails[item.id]?.product_variants || []).filter(
                        (v: any) => (v.billing_cycle || 'monthly') === itemCycle
                      );
                      if (item.isRenewal || productVariants.length <= 1) return null;
                      return (
                        <div className="flex items-center gap-2 mt-2.5">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">License:</span>
                          <div className="relative inline-block">
                            <select
                              value={item.variantId || ''}
                              onChange={(e) => handleVariantChange(item, e.target.value)}
                              className="text-[10px] font-bold h-7 pl-2.5 pr-8 bg-secondary rounded-lg border border-border/40 hover:border-foreground/20 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer appearance-none transition-all"
                            >
                              {productVariants.map((v: any) => (
                                <option key={v.id} value={v.id}>
                                  {v.name} - ${Number(v.price).toFixed(2)}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                              <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  {/* Quantity Control */}
                  <div className="flex items-center border border-input bg-card rounded-lg overflow-hidden h-9">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-2.5 h-full hover:bg-secondary/40 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-3 text-xs font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2.5 h-full hover:bg-secondary/40 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-foreground block">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeleteItem({ id: item.id, variantId: item.variantId, name: item.name })}
                      className="text-xs text-destructive hover:underline inline-flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link href="/products" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="h-3.5 w-3.5" />
            Continue shopping
          </Link>
        </div>

        {/* Right Column: Cart Summary */}
        <div className="space-y-6">
          <Card className="border-border/60 bg-card shadow-md">
            <CardContent className="p-6 space-y-6">
              <h2 className="text-lg font-bold text-foreground leading-none">Order Summary</h2>

              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                {couponCode && (
                  <div className="flex justify-between text-emerald-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      Discount ({couponCode} - {couponDiscountPercent}%)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span>-${discount.toFixed(2)}</span>
                      <button
                        onClick={removeCoupon}
                        className="text-[10px] text-destructive hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>Processing Fee (Stripe Rate)</span>
                  <span>${processingFee.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>

                <hr className="border-border/60" />

                <div className="flex justify-between text-base font-bold text-foreground">
                  <span>Total Due</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Coupon input form */}
              {!couponCode && (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Promo Code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                    <Ticket className="absolute left-2.5 top-3 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <Button type="submit" size="sm" variant="outline" className="h-9">
                    Apply
                  </Button>
                </form>
              )}

              <Button onClick={handleCheckout} className="w-full inline-flex items-center justify-center gap-2 h-11">
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Checkout note */}
          <div className="p-3.5 bg-secondary/30 rounded-xl border border-border/40 text-[11px] text-muted-foreground leading-normal">
            By clicking Checkout, you agree to our terms of service. Products are immediately available in your customer dashboard upon confirmation of paid transaction status via webhooks.
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteItem !== null}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => {
          if (deleteItem) {
            removeFromCart(deleteItem.id, deleteItem.variantId);
            showToast('Item Removed', 'info', `Removed "${deleteItem.name}" from your cart.`);
            setDeleteItem(null);
          }
        }}
        title="Remove Item from Cart?"
        message="Are you sure you want to remove this item from your shopping cart?"
        confirmText="Yes, remove"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Checkout Authentication Modal */}
      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title={authTab === 'signin' ? 'Sign In to Continue' : 'Create an Account'}
        description={authTab === 'signin' ? 'Sign in to access your dashboard and checkout.' : 'Register to save your licenses and proceed to checkout.'}
        size="md"
      >
        <div className="space-y-6">
          {/* Tab selector */}
          <div className="flex border-b border-border/60 font-semibold text-sm">
            <button
              onClick={() => {
                setAuthTab('signin');
                setSignInError('');
                setSignUpError('');
              }}
              className={`flex-1 pb-2 border-b-2 text-center transition-all cursor-pointer ${authTab === 'signin'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthTab('signup');
                setSignInError('');
                setSignUpError('');
              }}
              className={`flex-1 pb-2 border-b-2 text-center transition-all cursor-pointer ${authTab === 'signup'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              Sign Up
            </button>
          </div>

          {authTab === 'signin' ? (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              {signInError && (
                <div className="flex gap-2.5 bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-destructive text-xs font-semibold animate-shake">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                  <span>{signInError}</span>
                </div>
              )}

              <div className="relative">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="pl-10 text-xs h-10"
                  required
                />
                <Mail className="absolute left-3 top-9.5 h-4 w-4 text-muted-foreground" />
              </div>

              <div className="relative">
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="pl-10 text-xs h-10"
                  required
                />
                <Lock className="absolute left-3 top-9.5 h-4 w-4 text-muted-foreground" />
              </div>

              <Button type="submit" className="w-full mt-2 h-10 font-bold" isLoading={isAuthSubmitting}>
                Sign In & Checkout
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              {signUpError && (
                <div className="flex gap-2.5 bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-destructive text-xs font-semibold animate-shake">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                  <span>{signUpError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Input
                    label="First Name"
                    placeholder="Jane"
                    value={signUpFirstName}
                    onChange={(e) => setSignUpFirstName(e.target.value)}
                    className="pl-10 text-xs h-10"
                    required
                  />
                  <UserIcon className="absolute left-3 top-9.5 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input
                    label="Last Name"
                    placeholder="Doe"
                    value={signUpLastName}
                    onChange={(e) => setSignUpLastName(e.target.value)}
                    className="pl-10 text-xs h-10"
                    required
                  />
                  <UserIcon className="absolute left-3 top-9.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="relative">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="jane@example.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  className="pl-10 text-xs h-10"
                  required
                />
                <Mail className="absolute left-3 top-9.5 h-4 w-4 text-muted-foreground" />
              </div>

              <div className="relative">
                <Input
                  label="Phone Number"
                  placeholder="0400 000 000"
                  value={signUpPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  maxLength={12}
                  className="pl-10 text-xs h-10"
                  required
                  helperText="Format: XXXX XXX XXX"
                />
                <Phone className="absolute left-3 top-9.5 h-4 w-4 text-muted-foreground" />
              </div>

              <div className="relative">
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  className="pl-10 text-xs h-10"
                  required
                  helperText="Min. 8 chars, 1 uppercase, 1 number, 1 special char"
                />
                <Lock className="absolute left-3 top-9.5 h-4 w-4 text-muted-foreground" />
              </div>

              <Button type="submit" className="w-full mt-2 h-10 font-bold" isLoading={isAuthSubmitting}>
                Sign Up & Checkout
              </Button>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
