'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LayoutDashboard, Receipt, User, ArrowRight, CheckCircle2, AlertCircle, Clock, ShieldAlert, Cpu, Activity, Download, Zap, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../lib/store/use-cart-store';
import { getProductAction } from '../../app/actions/products';
import { updateProfileAction, changePasswordAction } from '../../app/actions/settings';
import { Modal } from '../ui/modal';
import { updatePurchasedDomainAction } from '../../app/actions/orders';

const profileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().min(12, 'Phone format: XXXX XXX XXX').max(12).regex(/^\d{4} \d{3} \d{3}$/, 'Must be XXXX XXX XXX'),
  bio: z.string().max(300).optional(),
});

type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

const passwordChangeSchema = z.object({
  password: z.string().min(8, 'New password must be at least 8 characters').regex(/[A-Z]/, 'Must contain one uppercase').regex(/[0-9]/, 'Must contain one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

interface CustomerDashboardProps {
  profile: any;
  subscriptions: any[];
  orders: any[];
  notifications: any[];
  purchasedDomains: any[];
  licenseKeys: any[];
}

export function CustomerDashboardClient({ profile, subscriptions, orders, notifications, purchasedDomains, licenseKeys }: CustomerDashboardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const addToCart = useCartStore((state) => state.addToCart);

  const [profileLoading, setProfileLoading] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(false);
  const [extendingProductId, setExtendingProductId] = React.useState<string | null>(null);
  const [clientDate, setClientDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setClientDate(new Date());
  }, []);

  // Domains slot & Invoice print state
  const [domainInputs, setDomainInputs] = React.useState<Record<string, string>>({});
  const [savingDomainId, setSavingDomainId] = React.useState<string | null>(null);
  const [editingDomainId, setEditingDomainId] = React.useState<string | null>(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = React.useState<any>(null);

  const handleSaveDomain = async (slotId: string) => {
    const name = domainInputs[slotId];
    if (!name || !name.trim()) {
      showToast('Validation Error', 'error', 'Domain name cannot be empty.');
      return;
    }
    setSavingDomainId(slotId);
    try {
      const res = await updatePurchasedDomainAction(slotId, name);
      if (res.success) {
        showToast('Domain Registered', 'success', 'Your license domain slot has been configured.');
        setEditingDomainId(null);
        window.location.reload();
      } else {
        showToast('Registration Failed', 'error', res.error);
      }
    } catch (err) {
      showToast('Error', 'error', 'Failed to configure domain.');
    } finally {
      setSavingDomainId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // 1. Profile form
  const {
    register: regProf,
    handleSubmit: subProf,
    setValue: setValProf,
    formState: { errors: errProf },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      phone: profile?.phone_number || '',
      bio: profile?.profiles?.bio || '',
    },
  });

  // 2. Password form
  const {
    register: regPass,
    handleSubmit: subPass,
    reset: resetPass,
    formState: { errors: errPass },
  } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const handleExtendPlan = async (item: any, lic: any, sub: any) => {
    setExtendingProductId(item.product_id);
    try {
      const product = await getProductAction(item.product_id);
      if (!product) {
        showToast('Error', 'error', 'Failed to retrieve product details.');
        return;
      }

      // Determine if it is yearly based on name or existing subscription
      const nameLower = (item.product_name || '').toLowerCase();
      const isYearly = nameLower.includes('yearly');

      // Find matching variant by name
      const variantName = lic?.plan_name || 'Standard';
      const variant = product.product_variants?.find((v: any) =>
        v.name.toLowerCase() === variantName.toLowerCase() &&
        (isYearly ? v.billing_cycle === 'yearly' : v.billing_cycle === 'monthly')
      ) || product.product_variants?.find((v: any) =>
        v.name.toLowerCase() === variantName.toLowerCase()
      ) || product.product_variants?.[0] || null;

      // Expiry/renewal dates
      const start = new Date(sub?.current_period_end || lic?.expiry_date || new Date());
      const end = new Date(start);
      const months = isYearly ? 12 : 1;
      end.setMonth(start.getMonth() + months);

      const format = (dVal: Date) => {
        return dVal.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      };

      const price = variant ? Number(variant.price) : Number(product.price);
      const displayPrice = isYearly && variant?.billing_cycle !== 'yearly' ? price * 10 : price;

      const mainImage = product.product_images?.find((img: any) => !img.is_screenshot)?.image_url
        || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';

      const cycleLabel = isYearly ? 'Yearly' : 'Monthly';
      const itemVariantName = variant
        ? `${variant.name} (Renewal - ${cycleLabel})`
        : `Standard (Renewal - ${cycleLabel})`;

      // Find associated domain for renewal prefill
      const assocDomain = purchasedDomains?.find((d: any) => d.order_id === lic?.order_id && d.product_id === product.id)
        || purchasedDomains?.find((d: any) => d.product_id === product.id);
      const domainName = assocDomain?.domain_name || 'renewal.com';

      addToCart({
        id: product.id,
        name: product.name,
        price: displayPrice,
        image_url: mainImage,
        variantId: variant?.id,
        variantName: itemVariantName,
        domain_count: variant?.domain_count,
        layout_count: variant?.layout_count,
        billingCycle: isYearly ? 'yearly' : 'monthly',
        durationMonths: months,
        startDate: format(start),
        endDate: format(end),
        isRenewal: true,
        renewalLicenseKey: lic?.license_key,
        domain: domainName,
      } as any, 1);

      showToast('Added to Cart', 'success', `"${product.name}" added to cart for renewal.`);
      router.push('/cart');
    } catch (err) {
      console.error(err);
      showToast('Error', 'error', 'An unexpected error occurred while adding to cart.');
    } finally {
      setExtendingProductId(null);
    }
  };

  const onProfileUpdate = async (data: ProfileUpdateInput) => {
    setProfileLoading(true);
    try {
      const res = await updateProfileAction({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        bio: data.bio,
      });

      if (res.success) {
        showToast('Profile Saved', 'success', 'Your profile details have been updated.');
      } else {
        showToast('Update Failed', 'error', res.error);
      }
    } catch (err) {
      showToast('Error', 'error', 'An unexpected error occurred.');
    } finally {
      setProfileLoading(false);
    }
  };

  const onPasswordChange = async (data: PasswordChangeInput) => {
    setPasswordLoading(true);
    try {
      const res = await changePasswordAction(data.password);
      if (res.success) {
        showToast('Password Updated', 'success', 'Your password credentials have been updated.');
        resetPass();
      } else {
        showToast('Update Failed', 'error', res.error);
      }
    } catch (err) {
      showToast('Error', 'error', 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

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
    setValProf('phone', formatted, { shouldValidate: true });
  };

  // Get paid items from orders to list purchased software
  const purchasedItems: any[] = [];
  orders
    .filter((o) => o.status === 'paid')
    .forEach((o) => {
      if (o.order_items) {
        o.order_items.forEach((item: any) => {
          if (!purchasedItems.some((p) => p.product_id === item.product_id)) {
            purchasedItems.push(item);
          }
        });
      }
    });

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid grid-cols-3 w-full max-w-md border-b border-border/40 pb-2">
        <TabsTrigger value="overview" className="inline-flex items-center gap-1.5 py-2">
          <LayoutDashboard className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="billing" className="inline-flex items-center gap-1.5 py-2">
          <Receipt className="h-4 w-4" />
          Billing History
        </TabsTrigger>
        <TabsTrigger value="settings" className="inline-flex items-center gap-1.5 py-2">
          <User className="h-4 w-4" />
          Profile Settings
        </TabsTrigger>
      </TabsList>

      {/* ====================================================================
          1. OVERVIEW TAB
         ==================================================================== */}
      <TabsContent value="overview" className="space-y-6">
        {/* Welcome and Premium Metrics Banner */}
        <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_8px_30px_rgb(99,102,241,0.12)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-20 -translate-y-20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1.5 text-left">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                Welcome back, {profile?.first_name || 'Customer'}!
                <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
              </h2>
              <p className="text-xs text-indigo-100 font-medium max-w-md">
                Manage your active software deployments, configure domain licenses, and check subscription expiry periods.
              </p>
            </div>

            <div className="flex items-center justify-between md:justify-start gap-2 w-full md:w-auto shrink-0 bg-white/10 p-2 rounded-2xl backdrop-blur-sm">
              <div className="text-center px-4 py-2 flex-1 md:flex-none">
                <span className="text-lg font-bold block">{subscriptions.length}</span>
                <span className="text-[9px] font-bold text-indigo-150 capitalize tracking-wider">Subs</span>
              </div>
              <div className="w-px bg-white/20 self-stretch my-2" />
              <div className="text-center px-4 py-2 flex-1 md:flex-none">
                <span className="text-lg font-bold block">{purchasedDomains.length}</span>
                <span className="text-[9px] font-bold text-indigo-150 capitalize tracking-wider">Licenses</span>
              </div>
              <div className="w-px bg-white/20 self-stretch my-2" />
              <div className="text-center px-4 py-2 flex-1 md:flex-none">
                <span className="text-lg font-bold block">{purchasedItems.length}</span>
                <span className="text-[9px] font-bold text-indigo-150 capitalize tracking-wider">Products</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Active Products, Subscriptions & Domains */}
          <div className="lg:col-span-2 space-y-6">

            {/* Unified WordPress Plugins Card Grid */}
            <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden text-left">
              <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-800 capitalize tracking-wider">My Licensed WordPress Plugins</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-medium mt-0.5">Manage plugin downloads, check license expiry dates, and configure domain slots.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {purchasedItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center font-medium">No purchased WordPress plugins found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {purchasedItems.map((item, idx) => {
                      // Find associated subscription
                      const sub = subscriptions.find((s) => s.product_id === item.product_id);

                      // Find license key from license_keys table matching product_id and order_id (or product_id as fallback)
                      const lic = licenseKeys.find((l) => l.product_id === item.product_id && l.order_id === item.order_id)
                        || licenseKeys.find((l) => l.product_id === item.product_id);
                      const licenseKey = lic?.license_key || 'N/A';

                      const nowTime = clientDate ? clientDate.getTime() : Date.now();
                      const daysRemaining = lic
                        ? Math.max(0, Math.ceil((new Date(lic.expiry_date).getTime() - nowTime) / (1000 * 3600 * 24)))
                        : 0;
                      const isBelowMonth = lic ? daysRemaining <= 30 : false;

                      const totalDays = lic
                        ? Math.max(1, Math.ceil((new Date(lic.expiry_date).getTime() - new Date(lic.purchased_date).getTime()) / (1000 * 3600 * 24)))
                        : 1;
                      const progressPercent = lic
                        ? Math.min(100, Math.max(0, ((totalDays - daysRemaining) / totalDays) * 100))
                        : 100;
                      const remainingPercent = 100 - progressPercent;

                      const isLicActive = lic && new Date(lic.expiry_date) > (clientDate || new Date());

                      return (
                        <div
                          key={idx}
                          className="group border border-slate-150 bg-slate-50/30 hover:bg-white rounded-3xl p-5.5 flex flex-col justify-between gap-5 transition-all duration-305 hover:shadow-[0_12px_24px_rgba(99,102,241,0.04)] hover:-translate-y-0.5"
                        >
                          {/* Card Header: Product Name + Activation Status */}
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-slate-800 leading-tight">{item.product_name.split(' (')[0]}</h4>
                              <p className="text-[9px] text-slate-400 font-bold capitalize tracking-wider font-mono">License Key: <span className="text-indigo-650 select-all font-mono font-bold">{licenseKey}</span></p>
                            </div>
                            {isLicActive ? (
                              <Badge variant="success" className="rounded-md font-bold px-2 py-0.5 text-[9px] capitalize tracking-wider">Active</Badge>
                            ) : (
                              <Badge variant="destructive" className="rounded-md font-bold px-2 py-0.5 text-[9px] capitalize tracking-wider">Expired</Badge>
                            )}
                          </div>

                          {/* Expiry / Timeline Indicator */}
                          {lic ? (
                            <div className="space-y-2.5 bg-white border border-slate-100 p-3.5 rounded-2xl">
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-550 font-mono">
                                <span suppressHydrationWarning>Start: {new Date(lic.purchased_date).toLocaleDateString('en-US')}</span>
                                <span suppressHydrationWarning>Expiry: {new Date(lic.expiry_date).toLocaleDateString('en-US')}</span>
                              </div>

                              {/* Progress bar timeline */}
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${daysRemaining <= 7 ? 'bg-red-500 animate-pulse' : daysRemaining <= 30 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                  style={{ width: `${remainingPercent}%` }}
                                />
                              </div>

                              {/* Days countdown indicator */}
                              <div className="flex justify-between items-center pt-0.5">
                                <span className="text-[9px] font-semibold text-slate-400">Subscription Timeline</span>
                                {isBelowMonth ? (
                                  daysRemaining === 0 ? (
                                    <span className="text-[9px] font-bold text-red-500 animate-pulse flex items-center gap-1">
                                      ⚠️ Expired Today
                                    </span>
                                  ) : daysRemaining <= 7 ? (
                                    <span className="text-[9px] font-bold text-red-655 animate-pulse flex items-center gap-1">
                                      ⚠️ Only {daysRemaining} days left!
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-amber-600 flex items-center gap-1">
                                      ⏳ {daysRemaining} days left
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[9px] font-bold text-indigo-650 ">
                                    Expires in {Math.ceil(daysRemaining / 30)} mos
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-red-50/50 border border-red-100 text-red-650 rounded-2xl text-[10px] font-bold text-center">
                              No active license key found. Please renew to access downloads & updates.
                            </div>
                          )}

                          {/* Action Buttons Row */}
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            {/* Zip Download */}
                            {item.products?.plugin_file_url ? (
                              <Button
                                href={item.products.plugin_file_url}
                                target="_blank"
                                download={`${item.product_name.replace(/\s+/g, '_')}_plugin.zip`}
                                variant="outline"
                                className="w-full inline-flex items-center justify-center gap-1.5 h-9 text-[11px] font-bold bg-white hover:bg-slate-50 border-slate-200 text-slate-800 rounded-xl shadow-sm cursor-pointer"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download Plugin
                              </Button>
                            ) : (
                              <div className="w-full border border-dashed border-slate-200 text-slate-400 rounded-xl h-9 flex items-center justify-center text-[10px] font-medium italic">
                                No zip configured
                              </div>
                            )}

                            {/* Extend Subscription */}
                            <Button
                              type="button"
                              onClick={() => handleExtendPlan(item, lic, sub)}
                              isLoading={extendingProductId === item.product_id}
                              className="w-full inline-flex items-center justify-center gap-1.5 h-9 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/10 transition-all hover:scale-102 active:scale-98 cursor-pointer"
                            >
                              <Zap className="h-3.5 w-3.5" />
                              Extend Plan
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Domain Configuration Slots Section */}
            <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-100 text-left">
                <CardTitle className="text-sm font-bold text-slate-800 capitalize tracking-wider">License Domain Allocations</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-medium mt-0.5">Configure the active domain names authorized to run your layout licenses</CardDescription>
              </CardHeader>
              <CardContent className="p-6 divide-y divide-slate-100">
                {purchasedDomains.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center font-medium">No domain license slots found.</p>
                ) : (
                  purchasedDomains.map((slot) => {
                    const isEditing = editingDomainId === slot.id || !slot.domain_name;
                    return (
                      <div key={slot.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="max-w-sm text-left">
                          <h4 className="text-xs font-bold text-slate-800">{slot.products?.name || 'Digital Product'}</h4>
                          <p className="text-[10px] text-slate-455 font-bold mt-1">
                            Plan Variant: <span className="text-indigo-650 font-bold">{slot.variant_name}</span>
                          </p>
                        </div>
                        <div className="w-full sm:w-auto flex items-center justify-end gap-3 shrink-0">
                          {isEditing ? (
                            <div className="flex gap-2 w-full sm:w-64">
                              <Input
                                placeholder="my-domain.com"
                                className="h-8.5 py-1 px-2.5 text-xs bg-slate-50 border-slate-200 focus:ring-indigo-500 rounded-lg"
                                value={domainInputs[slot.id] !== undefined ? domainInputs[slot.id] : (slot.domain_name || '')}
                                onChange={(e) => setDomainInputs({ ...domainInputs, [slot.id]: e.target.value })}
                              />
                              <Button
                                size="sm"
                                className="h-8.5 px-3 text-[11px] font-bold"
                                onClick={() => handleSaveDomain(slot.id)}
                                isLoading={savingDomainId === slot.id}
                              >
                                Save
                              </Button>
                              {slot.domain_name && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8.5 px-2.5 text-[11px] font-bold"
                                  onClick={() => setEditingDomainId(null)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant="success" className="font-mono text-[10px] py-1 px-2.5 rounded-lg font-bold bg-indigo-50 border-indigo-150 text-indigo-700">
                                {slot.domain_name}
                              </Badge>
                              {/* <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-[10px] inline-flex items-center gap-1 cursor-pointer font-bold"
                                onClick={() => {
                                  setEditingDomainId(slot.id);
                                  setDomainInputs({ ...domainInputs, [slot.id]: slot.domain_name });
                                }}
                              >
                                Edit Domain
                              </Button> */}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profile Sidebar summary */}
          <div className="space-y-6">
            <Card className="border-border/60 bg-card shadow-sm p-6 text-center space-y-4">
              <div className="h-20 w-20 bg-primary/10 text-primary border-2 border-primary/20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                {profile?.first_name ? profile.first_name[0].toUpperCase() : 'U'}
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-foreground">{profile?.first_name} {profile?.last_name}</h3>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
                <Badge variant="outline" className="mt-2 capitalize tracking-wider text-[9px]">{profile?.role}</Badge>
              </div>
              {profile?.profiles?.bio && (
                <p className="text-xs text-muted-foreground italic border-t border-border/40 pt-3 mt-3">
                  &ldquo;{profile.profiles.bio}&rdquo;
                </p>
              )}
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* ====================================================================
          2. BILLING HISTORY TAB
         ==================================================================== */}
      <TabsContent value="billing">
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold capitalize tracking-wider">Billing Statements & Invoices</CardTitle>
            <CardDescription>Review paid items, pending orders, and download receipts.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {orders.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No checkout transactions on record.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Billing Email</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                      <TableCell className="text-xs text-muted-foreground" suppressHydrationWarning>{new Date(o.created_at).toLocaleDateString('en-US')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.billing_email}</TableCell>
                      <TableCell className="font-bold text-foreground">${Number(o.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === 'paid' ? 'success' : o.status === 'pending' ? 'warning' : 'destructive'}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {o.status === 'paid' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceOrder(o)}
                            className="text-xs text-primary hover:underline font-semibold cursor-pointer bg-transparent border-0"
                          >
                            Download PDF
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">n/a</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ====================================================================
          3. PROFILE SETTINGS TAB
         ==================================================================== */}
      <TabsContent value="settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile details form */}
          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold capitalize tracking-wider">Update Account Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={subProf(onProfileUpdate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    error={errProf.firstName?.message}
                    {...regProf('firstName')}
                  />
                  <Input
                    label="Last Name"
                    error={errProf.lastName?.message}
                    {...regProf('lastName')}
                  />
                </div>

                <Input
                  label="Phone Number"
                  placeholder="0800 123 456"
                  maxLength={12}
                  error={errProf.phone?.message}
                  {...regProf('phone', { onChange: handlePhoneFormat })}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground/80">Account Bio</label>
                  <textarea
                    rows={3}
                    placeholder="Short bio description..."
                    className="flex w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...regProf('bio')}
                  />
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={profileLoading}>
                  Save Profile Details
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change password form */}
          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold capitalize tracking-wider">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={subPass(onPasswordChange)} className="space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="••••••••"
                  error={errPass.password?.message}
                  {...regPass('password')}
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  error={errPass.confirmPassword?.message}
                  {...regPass('confirmPassword')}
                />

                <Button type="submit" className="w-full mt-2" isLoading={passwordLoading}>
                  Change Credentials
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Printable Invoice Modal */}
      {selectedInvoiceOrder && (
        <Modal
          isOpen={!!selectedInvoiceOrder}
          onClose={() => setSelectedInvoiceOrder(null)}
          title="Download Invoice"
          size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedInvoiceOrder(null)}
              >
                Close
              </Button>
              <Button onClick={handlePrint} className="inline-flex items-center gap-1.5 font-bold cursor-pointer">
                <Receipt className="h-4 w-4" />
                Print / Save PDF
              </Button>
            </div>
          }
        >
          <div id="print-invoice-area" className="p-6 bg-white rounded-xl space-y-6">
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #print-invoice-area, #print-invoice-area * {
                  visibility: visible;
                }
                #print-invoice-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  padding: 20px;
                  color: #000 !important;
                  background-color: #fff !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div className="text-left">
                <h1 className="text-2xl font-bold tracking-tight text-indigo-650">SOLUTION22</h1>
                <p className="text-xs text-slate-500 font-medium mt-1">Premium SaaS Integrations & Layouts</p>
                <p className="text-[10px] text-slate-400 mt-0.5">https://solution22.store</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-slate-700">INVOICE</h2>
                <p className="text-xs font-mono text-slate-500 mt-1">#{selectedInvoiceOrder.order_number}</p>
                <p className="text-[10px] text-slate-400 mt-0.5" suppressHydrationWarning>Date: {new Date(selectedInvoiceOrder.created_at).toLocaleDateString('en-US')}</p>
              </div>
            </div>

            {/* Billing Parties */}
            <div className="grid grid-cols-2 gap-8 text-xs text-left">
              <div>
                <h3 className="font-bold text-slate-400 capitalize tracking-widest text-[9px] mb-2">Company Details</h3>
                <p className="font-bold text-slate-700">Solution22 Pty Ltd</p>
                <p className="text-slate-500 mt-0.5">123 Tech Hub Boulevard</p>
                <p className="text-slate-500">Sydney, NSW 2000</p>
                <p className="text-slate-500">Australia</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-400 capitalize tracking-widest text-[9px] mb-2">Billed To</h3>
                <p className="font-bold text-slate-700">
                  {selectedInvoiceOrder.billing_first_name} {selectedInvoiceOrder.billing_last_name}
                </p>
                <p className="text-slate-500 mt-0.5">{selectedInvoiceOrder.billing_email}</p>
                <p className="text-slate-500">{selectedInvoiceOrder.billing_phone}</p>
                <p className="text-slate-500 mt-1">
                  {selectedInvoiceOrder.billing_address_line1}
                  {selectedInvoiceOrder.billing_address_line2 ? `, ${selectedInvoiceOrder.billing_address_line2}` : ''}
                </p>
                <p className="text-slate-500">
                  {selectedInvoiceOrder.billing_city}, {selectedInvoiceOrder.billing_state} {selectedInvoiceOrder.billing_postal_code}
                </p>
                <p className="text-slate-500">{selectedInvoiceOrder.billing_country}</p>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden text-left">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 border-b border-slate-100">
                    <TableHead className="font-bold text-slate-500 text-xs py-3 pl-4">Description</TableHead>
                    <TableHead className="font-bold text-slate-550 text-xs py-3 text-center">Qty</TableHead>
                    <TableHead className="font-bold text-slate-550 text-xs py-3 text-right pr-4">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {selectedInvoiceOrder.order_items?.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="py-3 pl-4 text-xs font-semibold text-slate-800">
                        {item.product_name}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-slate-500 text-center font-mono">{item.quantity}</TableCell>
                      <TableCell className="py-3 text-xs font-bold text-slate-700 text-right pr-4">
                        ${Number(item.price).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Calculations Breakdown */}
            <div className="flex justify-end text-xs">
              <div className="w-64 space-y-2.5">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono">${Number(selectedInvoiceOrder.subtotal).toFixed(2)}</span>
                </div>
                {Number(selectedInvoiceOrder.coupon_discount) > 0 && (
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span>Discount:</span>
                    <span className="font-mono">-${Number(selectedInvoiceOrder.coupon_discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Tax (10%):</span>
                  <span className="font-mono">${Number(selectedInvoiceOrder.tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Processing Fee:</span>
                  <span className="font-mono">${Number(selectedInvoiceOrder.processing_fee).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2.5 flex justify-between font-bold text-sm text-slate-800">
                  <span>Total Paid:</span>
                  <span className="font-mono text-indigo-650">${Number(selectedInvoiceOrder.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs">
              <div className="text-left">
                <span className="text-slate-400 font-bold capitalize tracking-widest text-[8px] block">Payment status</span>
                <span className="font-bold text-slate-700 capitalize mt-0.5 inline-block">{selectedInvoiceOrder.status}</span>
              </div>
              <div className="text-left">
                <span className="text-slate-400 font-bold capitalize tracking-widest text-[8px] block">Payment Gateway</span>
                <span className="font-semibold text-slate-700 mt-0.5 inline-block">Stripe PCI Secured</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Tabs>
  );
}
