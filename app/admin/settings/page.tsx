import * as React from 'react';
import { getAppSettingsAction, getSmtpSettingsAction, getStripeSettingsAction } from '../../actions/settings';
import { SettingsClient } from '../../../components/admin/settings-client';

export const revalidate = 0; // Prevent cache to read active key configs

export default async function AdminSettingsPage() {
  const appSettings = await getAppSettingsAction();
  const smtpSettings = await getSmtpSettingsAction();
  const stripeSettings = await getStripeSettingsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          System Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure SMTP mail servers, Stripe API endpoints, and global application metadata.
        </p>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
        <SettingsClient
          appSettings={appSettings}
          smtpSettings={smtpSettings as any}
          stripeSettings={stripeSettings}
        />
      </div>
    </div>
  );
}
