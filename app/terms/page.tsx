import * as React from 'react';
import { getAppSettingsAction } from '../actions/settings';
import { ShieldAlert, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DownloadPdfButton } from '../../components/ui/download-pdf-button';

export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  const settings = await getAppSettingsAction();
  const termsContent = settings?.terms_content || '';
  const lastUpdated = settings?.updated_at
    ? new Date(settings.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'June 8, 2026';

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 flex flex-col gap-8 animate-fade-in">
      <div className="p-6 sm:p-10">
        {termsContent.trim() && (
          <div className="flex justify-end mb-6">
            <DownloadPdfButton targetId="terms-content" filename="terms-and-conditions.pdf" />
          </div>
        )}
        {termsContent.trim() ? (
          <div
            id="terms-content"
            className="rich-text-content font-normal p-6 sm:p-8"
            style={{ color: '#0f172a' }}
            dangerouslySetInnerHTML={{ __html: termsContent }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4 animate-fade-in">
            <div className="p-4 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-500 border border-amber-100 dark:border-amber-900/30">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="font-bold text-base text-foreground">Terms & Conditions Pending</h3>
              <p className="text-xs text-muted-foreground leading-normal">
                The platform terms and conditions of service are currently being finalized by the administration. Please check back soon.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
