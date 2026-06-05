'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LayoutDashboard, Receipt, User, ArrowRight, CheckCircle2, AlertCircle, Clock, ShieldAlert, Cpu, Activity } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { updateProfileAction, changePasswordAction } from '../../app/actions/settings';

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
}

export function CustomerDashboardClient({ profile, subscriptions, orders, notifications }: CustomerDashboardProps) {
  const { showToast } = useToast();
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(false);

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
      <TabsContent value="overview">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main overview metrics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Subscriptions Card */}
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Active Subscriptions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 divide-y divide-border/40">
                {subscriptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No active software subscriptions found.</p>
                ) : (
                  subscriptions.map((sub) => {
                    const daysRemaining = Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 3600 * 24)));
                    return (
                      <div key={sub.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{sub.products?.name || 'Software Subscription'}</h4>
                          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            Expires in {daysRemaining} days (Renew date: {new Date(sub.current_period_end).toLocaleDateString()})
                          </span>
                        </div>
                        <Badge variant="success">active</Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Purchased Software downloads */}
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Your Digital Software Products</CardTitle>
              </CardHeader>
              <CardContent className="p-6 divide-y divide-border/40">
                {purchasedItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No purchased digital products found.</p>
                ) : (
                  purchasedItems.map((item, idx) => (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0 flex justify-between items-center gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{item.product_name}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Reference ID: {item.product_id}</p>
                      </div>
                      <Button variant="outline" size="sm" className="inline-flex items-center gap-1 text-xs">
                        Access product
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Usage Stats Widget */}
            <Card className="border-border/60 bg-card shadow-sm p-6 space-y-5">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-4.5 w-4.5 text-indigo-500" />
                Resource Usage Statistics
              </h3>
              
              <div className="space-y-4">
                {/* Stat 1 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">API Requests (Current Cycle)</span>
                    <span className="text-foreground">2,492 / 5,000 calls</span>
                  </div>
                  <div className="w-full bg-secondary/50 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '49.8%' }} />
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Cloud Storage Storage</span>
                    <span className="text-foreground">1.2 GB / 5 GB</span>
                  </div>
                  <div className="w-full bg-secondary/50 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '24%' }} />
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
                <Badge variant="outline" className="mt-2 uppercase tracking-wider text-[9px]">{profile?.role}</Badge>
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
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Billing Statements & Invoices</CardTitle>
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
                          <a href="#" className="text-xs text-primary hover:underline font-semibold">
                            Download PDF
                          </a>
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
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Update Account Details</CardTitle>
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
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Change Password</CardTitle>
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
    </Tabs>
  );
}
