import * as React from 'react';
import { getAppSettingsAction } from '../actions/settings';
import { ShieldCheck, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DownloadPdfButton } from '../../components/ui/download-pdf-button';

export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
  const settings = await getAppSettingsAction();
  const privacyContent = settings?.privacy_content || '';
  const lastUpdated = settings?.updated_at
    ? new Date(settings.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'June 8, 2026';

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 flex flex-col gap-8 animate-fade-in">
      <div className="p-6 sm:p-10">
        {privacyContent.trim() && (
          <div className="flex justify-end mb-6">
            <DownloadPdfButton targetId="privacy-content" filename="privacy-policy.pdf" />
          </div>
        )}
        {privacyContent.trim() ? (
          <div
            id="privacy-content"
            className="rich-text-content font-normal p-6 sm:p-8"
            style={{ color: '#0f172a', }}
            dangerouslySetInnerHTML={{ __html: privacyContent }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4 animate-fade-in">
            <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 border border-emerald-100 dark:border-emerald-900/30">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="font-bold text-base text-foreground">Privacy Policy Pending</h3>
              <p className="text-xs text-muted-foreground leading-normal">
                The platform user privacy and cookie policies are currently being updated by the administration. Please check back soon.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
