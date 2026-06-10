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
}

export function CustomerDashboardClient({ profile, subscriptions, orders, notifications, purchasedDomains }: CustomerDashboardProps) {
  const { showToast } = useToast();
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(false);

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
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                Welcome back, {profile?.first_name || 'Customer'}!
                <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
              </h2>
              <p className="text-xs text-indigo-100 font-medium max-w-md">
                Manage your active software deployments, configure domain licenses, and check subscription expiry periods.
              </p>
            </div>
            
            {/* Quick Metrics grid */}
            <div className="grid grid-cols-3 gap-2 w-full md:w-auto shrink-0 bg-white/10 p-2 rounded-2xl backdrop-blur-sm">
              <div className="text-center px-4 py-2">
                <span className="text-lg font-black block">{subscriptions.length}</span>
                <span className="text-[9px] font-bold text-indigo-150 uppercase tracking-wider">Subs</span>
              </div>
              <div className="w-px bg-white/20 my-2" />
              <div className="text-center px-4 py-2">
                <span className="text-lg font-black block">{purchasedDomains.length}</span>
                <span className="text-[9px] font-bold text-indigo-150 uppercase tracking-wider">Licenses</span>
              </div>
              <div className="w-px bg-white/20 my-2" />
              <div className="text-center px-4 py-2">
                <span className="text-lg font-black block">{purchasedItems.length}</span>
                <span className="text-[9px] font-bold text-indigo-150 uppercase tracking-wider">Products</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Active Products, Subscriptions & Domains */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Active Subscriptions Section */}
            <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="text-left">
                  <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">Active Subscriptions</CardTitle>
                  <CardDescription className="text-[10px] text-slate-400 font-medium mt-0.5">Track period details, remaining time, and support extensions</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {subscriptions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center font-medium">No active software subscriptions found.</p>
                ) : (
                  subscriptions.map((sub) => {
                    const daysRemaining = Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 3600 * 24)));
                    const isBelowMonth = daysRemaining <= 30;
                    
                    return (
                      <div 
                        key={sub.id} 
                        className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-slate-50"
                      >
                        <div className="text-left space-y-1">
                          <h4 className="text-sm font-extrabold text-slate-800">{sub.products?.name || 'Software Subscription'}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-slate-450 font-bold block sm:inline">
                              Period: {new Date(sub.current_period_start).toLocaleDateString()} - {new Date(sub.current_period_end).toLocaleDateString()}
                            </span>
                            
                            {/* Dynamic Expiry Alert Badges */}
                            {isBelowMonth ? (
                              daysRemaining === 0 ? (
                                <span className="px-2.5 py-0.5 text-[9px] font-bold bg-red-100 border border-red-200 text-red-700 rounded-md animate-pulse">
                                  ⚠️ Expired Today
                                </span>
                              ) : daysRemaining <= 7 ? (
                                <span className="px-2.5 py-0.5 text-[9px] font-bold bg-red-50 border border-red-200 text-red-655 rounded-md animate-pulse">
                                  ⚠️ Expires in {daysRemaining} day{daysRemaining > 1 ? 's' : ''}!
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 text-[9px] font-bold bg-amber-50 border border-amber-250 text-amber-700 rounded-md">
                                  ⏳ {daysRemaining} days left
                                </span>
                              )
                            ) : (
                              <span className="px-2.5 py-0.5 text-[9px] font-bold bg-indigo-50 border border-indigo-150 text-indigo-650 rounded-md">
                                Expires in {Math.round(daysRemaining / 30)} months
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                          <Button
                            href={`/products/${sub.product_id}`}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-9 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                          >
                            <Zap className="h-3.5 w-3.5" />
                            Extend Subscription
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* 2. Purchased Digital Products Section */}
            <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-100 text-left">
                <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">Purchased Software & Archives</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-medium mt-0.5">Download the latest software packages and plugin bundles</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {purchasedItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center font-medium">No purchased software products found.</p>
                ) : (
                  purchasedItems.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-slate-50"
                    >
                      <div className="text-left space-y-1">
                        <h4 className="text-sm font-extrabold text-slate-800">{item.product_name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">Reference ID: {item.product_id}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        {item.products?.plugin_file_url ? (
                          <Button
                            href={item.products.plugin_file_url}
                            target="_blank"
                            download={`${item.product_name.replace(/\s+/g, '_')}_plugin.zip`}
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-9 px-4 text-xs bg-indigo-50 border border-indigo-200/80 text-indigo-750 hover:bg-indigo-100 hover:text-indigo-900 font-bold shadow-sm"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download (.zip)
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 italic px-2">No download file</span>
                        )}
                        
                        <Button 
                          href={`/products/${item.product_id}`} 
                          variant="outline" 
                          size="sm" 
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1 h-9 px-4 text-xs font-bold"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 3. Domain Configuration Slots Section */}
            <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-100 text-left">
                <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">License Domain Allocations</CardTitle>
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
                          <h4 className="text-xs font-extrabold text-slate-800">{slot.products?.name || 'Digital Product'}</h4>
                          <p className="text-[10px] text-slate-455 font-bold mt-1">
                            Plan Variant: <span className="text-indigo-650 dark:text-indigo-400 font-extrabold">{slot.variant_name}</span>
                          </p>
                        </div>
                        <div className="w-full sm:w-auto flex items-center justify-end gap-3 shrink-0">
                          {isEditing ? (
                            <div className="flex gap-2 w-full sm:w-64">
                              <Input
                                placeholder="my-domain.com"
                                className="h-8.5 py-1 px-2.5 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-indigo-500 rounded-lg"
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
                              <Badge variant="success" className="font-mono text-[10px] py-1 px-2.5 rounded-lg font-bold bg-indigo-50 border-indigo-150 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300">
                                {slot.domain_name}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-[10px] inline-flex items-center gap-1 cursor-pointer font-bold"
                                onClick={() => {
                                  setEditingDomainId(slot.id);
                                  setDomainInputs({ ...domainInputs, [slot.id]: slot.domain_name });
                                }}
                              >
                                Edit Domain
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* 4. Usage Stats Widget */}
            <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden p-6 space-y-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 text-left">
                <Activity className="h-4.5 w-4.5 text-indigo-500" />
                API License Usage
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-450">API Calls Verification (Current Cycle)</span>
                    <span className="text-slate-800">2,492 / 5,000 calls</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '49.8%' }} />
                  </div>
                </div>
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-450">Registered Sites Allocation</span>
                    <span className="text-slate-800">
                      {purchasedDomains.filter(d => d.domain_name).length} / {purchasedDomains.length} domains
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full" 
                      style={{ width: `${(purchasedDomains.filter(d => d.domain_name).length / Math.max(1, purchasedDomains.length)) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>
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
                      <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
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
          <div id="print-invoice-area" className="p-6 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl space-y-6">
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
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">INVOICE</h2>
                <p className="text-xs font-mono text-slate-500 mt-1">#{selectedInvoiceOrder.order_number}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Date: {new Date(selectedInvoiceOrder.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Billing Parties */}
            <div className="grid grid-cols-2 gap-8 text-xs text-left">
              <div>
                <h3 className="font-bold text-slate-400 capitalize tracking-widest text-[9px] mb-2">Company Details</h3>
                <p className="font-bold text-slate-700 dark:text-slate-300">Solution22 Pty Ltd</p>
                <p className="text-slate-500 mt-0.5">123 Tech Hub Boulevard</p>
                <p className="text-slate-500">Sydney, NSW 2000</p>
                <p className="text-slate-500">Australia</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-400 capitalize tracking-widest text-[9px] mb-2">Billed To</h3>
                <p className="font-bold text-slate-700 dark:text-slate-300">
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
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden text-left">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 border-b border-slate-100 dark:border-slate-800">
                    <TableHead className="font-bold text-slate-500 text-xs py-3 pl-4">Description</TableHead>
                    <TableHead className="font-bold text-slate-550 text-xs py-3 text-center">Qty</TableHead>
                    <TableHead className="font-bold text-slate-550 text-xs py-3 text-right pr-4">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {selectedInvoiceOrder.order_items?.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="py-3 pl-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {item.product_name}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-slate-500 text-center font-mono">{item.quantity}</TableCell>
                      <TableCell className="py-3 text-xs font-bold text-slate-700 dark:text-slate-300 text-right pr-4">
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
                  <span>Tax (8%):</span>
                  <span className="font-mono">${Number(selectedInvoiceOrder.tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Processing Fee:</span>
                  <span className="font-mono">${Number(selectedInvoiceOrder.processing_fee).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2.5 flex justify-between font-bold text-sm text-slate-800 dark:text-slate-100">
                  <span>Total Paid:</span>
                  <span className="font-mono text-indigo-650 dark:text-indigo-400">${Number(selectedInvoiceOrder.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-xs">
              <div className="text-left">
                <span className="text-slate-400 font-bold capitalize tracking-widest text-[8px] block">Payment status</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 capitalize mt-0.5 inline-block">{selectedInvoiceOrder.status}</span>
              </div>
              <div className="text-left">
                <span className="text-slate-400 font-bold capitalize tracking-widest text-[8px] block">Payment Gateway</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 inline-block">Stripe PCI Secured</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Tabs>
  );
}
