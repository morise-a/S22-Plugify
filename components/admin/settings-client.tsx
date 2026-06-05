'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Settings, Mail, CreditCard, Send, Activity, ShieldAlert, Sparkles, Key } from 'lucide-react';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  updateAppSettingsAction,
  updateSmtpSettingsAction,
  testSmtpConnectionAction,
  updateStripeSettingsAction,
  testStripeConnectionAction,
} from '../../app/actions/settings';

interface AppSettings {
  app_name: string;
  app_description?: string;
}

interface SmtpSettings {
  host: string;
  port: number;
  username?: string;
  password?: string;
  from_email: string;
  from_name: string;
}

interface StripeSettings {
  publishable_key: string;
  secret_key?: string;
  webhook_secret?: string;
}

interface SettingsClientProps {
  appSettings: AppSettings;
  smtpSettings: SmtpSettings;
  stripeSettings: StripeSettings;
}

export function SettingsClient({ appSettings, smtpSettings, stripeSettings }: SettingsClientProps) {
  const { showToast } = useToast();

  // Loading States
  const [appLoading, setAppLoading] = React.useState(false);
  const [smtpLoading, setSmtpLoading] = React.useState(false);
  const [smtpTestLoading, setSmtpTestLoading] = React.useState(false);
  const [stripeLoading, setStripeLoading] = React.useState(false);
  const [stripeTestLoading, setStripeTestLoading] = React.useState(false);

  // 1. App Form
  const { register: regApp, handleSubmit: subApp } = useForm({
    defaultValues: {
      appName: appSettings.app_name,
      appDescription: appSettings.app_description || '',
    },
  });

  // 2. SMTP Form
  const { register: regSmtp, handleSubmit: subSmtp, watch: watchSmtp } = useForm({
    defaultValues: {
      host: smtpSettings.host,
      port: smtpSettings.port,
      username: smtpSettings.username || '',
      password: smtpSettings.password || '',
      from_email: smtpSettings.from_email,
      from_name: smtpSettings.from_name,
      test_recipient: '',
    },
  });

  const watchedSmtp = watchSmtp();

  // 3. Stripe Form
  const { register: regStripe, handleSubmit: subStripe, watch: watchStripe } = useForm({
    defaultValues: {
      publishable_key: stripeSettings.publishable_key,
      secret_key: stripeSettings.secret_key || '',
      webhook_secret: stripeSettings.webhook_secret || '',
    },
  });

  const watchedStripe = watchStripe();

  // App save
  const onAppSave = async (data: any) => {
    setAppLoading(true);
    try {
      const res = await updateAppSettingsAction(data);
      if (res.success) {
        showToast('Success', 'success', 'Application settings updated successfully.');
        window.location.reload();
      } else {
        showToast('Save Failed', 'error', res.error);
      }
    } catch (err) {
      showToast('Error', 'error', 'An unexpected error occurred.');
    } finally {
      setAppLoading(false);
    }
  };

  // SMTP save
  const onSmtpSave = async (data: any) => {
    setSmtpLoading(true);
    try {
      const res = await updateSmtpSettingsAction(data);
      if (res.success) {
        showToast('Success', 'success', 'SMTP server settings updated.');
      } else {
        showToast('Save Failed', 'error', res.error);
      }
    } catch (err) {
      showToast('Error', 'error', 'Failed to update SMTP configurations.');
    } finally {
      setSmtpLoading(false);
    }
  };

  // SMTP Test Email Trigger
  const onSmtpTest = async () => {
    const recipient = watchedSmtp.test_recipient;
    if (!recipient) {
      showToast('Validation Error', 'error', 'Please enter a test recipient email address.');
      return;
    }

    setSmtpTestLoading(true);
    try {
      const res = await testSmtpConnectionAction({
        host: watchedSmtp.host,
        port: Number(watchedSmtp.port),
        username: watchedSmtp.username,
        password: watchedSmtp.password,
        from_email: watchedSmtp.from_email,
        from_name: watchedSmtp.from_name,
        test_recipient: recipient,
      });

      if (res.success) {
        showToast('SMTP Verified', 'success', res.message);
      } else {
        showToast('SMTP Verification Failed', 'error', res.error);
      }
    } catch (err: any) {
      showToast('SMTP Test Error', 'error', err.message || 'SMTP call failed.');
    } finally {
      setSmtpTestLoading(false);
    }
  };

  // Stripe Save
  const onStripeSave = async (data: any) => {
    setStripeLoading(true);
    try {
      const res = await updateStripeSettingsAction(data);
      if (res.success) {
        showToast('Success', 'success', 'Stripe API configurations updated.');
      } else {
        showToast('Save Failed', 'error', res.error);
      }
    } catch (err) {
      showToast('Error', 'error', 'Failed to update Stripe keys.');
    } finally {
      setStripeLoading(false);
    }
  };

  // Stripe Test Connection
  const onStripeTest = async () => {
    setStripeTestLoading(true);
    try {
      const res = await testStripeConnectionAction(watchedStripe.secret_key);
      if (res.success) {
        showToast('Stripe Verified', 'success', res.message);
      } else {
        showToast('Stripe verification failed', 'error', res.error);
      }
    } catch (err: any) {
      showToast('Stripe Test Error', 'error', err.message || 'Stripe API call failed.');
    } finally {
      setStripeTestLoading(false);
    }
  };

  return (
    <Tabs defaultValue="app" className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Platform Settings</h1>
          <p className="text-xs text-slate-500">Configure global metadata, Stripe API variables, and transactional SMTP configs</p>
        </div>
        <TabsList className="bg-slate-100/85 border border-slate-200/50 p-1 rounded-xl max-w-sm shrink-0">
          <TabsTrigger value="app" className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold">
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            Application
          </TabsTrigger>
          <TabsTrigger value="smtp" className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold">
            <Mail className="h-3.5 w-3.5 text-slate-500" />
            SMTP Server
          </TabsTrigger>
          <TabsTrigger value="stripe" className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold">
            <CreditCard className="h-3.5 w-3.5 text-slate-500" />
            Stripe
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ====================================================================
          1. APPLICATION SETTINGS TAB
         ==================================================================== */}
      <TabsContent value="app">
        <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl">
          <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center gap-3">
            <div className="h-9 w-9 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center border border-indigo-100/40">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">Application Details</CardTitle>
              <CardDescription className="text-[10px] text-slate-400 mt-0.5">Configure system identity variables applied globally.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={subApp(onAppSave)} className="space-y-5">
              <Input
                label="Application Name"
                placeholder="ApexSaaS Store"
                {...regApp('appName', { required: 'Name is required' })}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Application Description</label>
                <textarea
                  rows={4}
                  placeholder="Enterprise subscription solutions..."
                  className="flex w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
                  {...regApp('appDescription')}
                />
              </div>

              <div className="pt-4 flex justify-end border-t border-slate-100">
                <Button type="submit" isLoading={appLoading} className="h-10 px-5 rounded-xl cursor-pointer">
                  Save Details
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ====================================================================
          2. SMTP SETTINGS TAB
         ==================================================================== */}
      <TabsContent value="smtp">
        <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl">
          <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center gap-3">
            <div className="h-9 w-9 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center border border-indigo-100/40">
              <Mail className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">SMTP Server Settings</CardTitle>
              <CardDescription className="text-[10px] text-slate-400 mt-0.5">Configure email delivery servers for dispatching checkout receipts.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={subSmtp(onSmtpSave)} className="space-y-6">
              
              {/* Form Grid Section 1: Server Config */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">1. Server Connection</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="SMTP Host"
                      placeholder="smtp.mailtrap.io"
                      {...regSmtp('host', { required: 'Hostname is required' })}
                    />
                  </div>
                  <Input
                    label="SMTP Port"
                    type="number"
                    placeholder="2525"
                    {...regSmtp('port', { valueAsNumber: true, required: 'Port is required' })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="SMTP Username"
                    placeholder="mail-username"
                    {...regSmtp('username')}
                  />
                  <Input
                    label="SMTP Password"
                    type="password"
                    placeholder="••••••••"
                    {...regSmtp('password')}
                  />
                </div>
              </div>

              {/* Form Grid Section 2: Sender Details */}
              <div className="space-y-4 pt-2 border-t border-slate-50">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">2. Sender Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Sender Email Address"
                    type="email"
                    placeholder="noreply@domain.com"
                    {...regSmtp('from_email', { required: 'From email is required' })}
                  />
                  <Input
                    label="Sender Display Name"
                    placeholder="ApexSaaS support"
                    {...regSmtp('from_name', { required: 'From name is required' })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button type="submit" isLoading={smtpLoading} className="h-10 px-5 rounded-xl cursor-pointer">
                  Save SMTP Settings
                </Button>
              </div>
            </form>

            {/* Test Connection Zone */}
            <div className="mt-8 border-t border-slate-200/60 pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 bg-indigo-50 text-indigo-650 rounded-lg flex items-center justify-center">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  SMTP Connection Diagnostic
                </h4>
              </div>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed font-medium">
                Enter an email address to dispatch a diagnostic email test. Make sure settings are saved before running diagnostics!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 max-w-md items-end pt-1">
                <div className="flex-1 w-full">
                  <Input
                    label="Test Recipient Email"
                    type="email"
                    placeholder="verify@domain.com"
                    {...regSmtp('test_recipient')}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 inline-flex items-center gap-1.5 cursor-pointer rounded-xl border-slate-200 hover:bg-slate-50 text-slate-650 font-bold shrink-0"
                  onClick={onSmtpTest}
                  isLoading={smtpTestLoading}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Test Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ====================================================================
          3. STRIPE SETTINGS TAB
         ==================================================================== */}
      <TabsContent value="stripe">
        <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl">
          <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center gap-3">
            <div className="h-9 w-9 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center border border-indigo-100/40">
              <Key className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">Stripe Configuration</CardTitle>
              <CardDescription className="text-[10px] text-slate-400 mt-0.5">Manage API credentials and webhook integration endpoints.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={subStripe(onStripeSave)} className="space-y-5">
              
              <div className="flex gap-3 bg-amber-50/70 border border-amber-200/60 p-4 rounded-xl text-amber-800 text-xs leading-relaxed font-semibold">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                <p>
                  Stripe API credentials are used to process secure customer checkouts. Keep these details confidential. Use Test Mode keys (<code className="font-mono bg-amber-100/50 px-1 rounded">sk_test_...</code>) during development.
                </p>
              </div>

              <Input
                label="Stripe Publishable Key"
                placeholder="pk_test_..."
                {...regStripe('publishable_key', { required: 'Publishable key is required' })}
              />

              <Input
                label="Stripe Secret Key"
                type="password"
                placeholder="sk_test_..."
                {...regStripe('secret_key')}
              />

              <Input
                label="Stripe Webhook Secret"
                type="password"
                placeholder="whsec_..."
                {...regStripe('webhook_secret')}
              />

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 gap-4">
                {/* Test Connection Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="inline-flex items-center gap-1.5 cursor-pointer rounded-xl border-slate-200 text-slate-650 font-bold h-10 px-4 hover:bg-slate-50"
                  onClick={onStripeTest}
                  isLoading={stripeTestLoading}
                >
                  <Activity className="h-4 w-4 text-indigo-650" />
                  Test Gateway Connection
                </Button>

                <Button type="submit" isLoading={stripeLoading} className="h-10 px-5 rounded-xl cursor-pointer">
                  Save Stripe Keys
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
