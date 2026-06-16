'use client';

import * as React from 'react';
import { Download, FileArchive, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';

export interface AutoDownloaderProps {
  products: {
    name: string;
    url: string;
  }[];
}

export function AutoDownloader({ products }: AutoDownloaderProps) {
  const [downloadStatus, setDownloadStatus] = React.useState<'pending' | 'success' | 'blocked'>('pending');

  React.useEffect(() => {
    if (!products || products.length === 0) return;

    const timers: NodeJS.Timeout[] = [];

    // Trigger download for each url with a small offset delay to prevent browser blockages
    products.forEach((prod, index) => {
      const timer = setTimeout(() => {
        try {
          const link = document.createElement('a');
          link.href = prod.url;
          // Extract filename or fall back to name + zip
          const filename = prod.url.split('/').pop() || `${prod.name.replace(/\s+/g, '_')}_plugin.zip`;
          link.setAttribute('download', filename);
          link.setAttribute('target', '_blank');
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          if (index === products.length - 1) {
            setDownloadStatus('success');
          }
        } catch (err) {
          console.error('Download error:', err);
          setDownloadStatus('blocked');
        }
      }, index * 1000);

      timers.push(timer);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [products]);

  const handleManualDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    const filename = url.split('/').pop() || `${name.replace(/\s+/g, '_')}_plugin.zip`;
    link.setAttribute('download', filename);
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-4 animate-fade-in">
      {/* Dynamic Status Header */}
      {downloadStatus === 'pending' && (
        <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 text-xs font-semibold shadow-[0_2px_10px_rgba(99,102,241,0.03)]">
          <div className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
          </div>
          <p className="text-left">
            We are preparing and automatically downloading your plugin files. Please do not close this window.
          </p>
        </div>
      )}

      {downloadStatus === 'success' && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-850 text-xs font-semibold shadow-[0_2px_10px_rgba(16,185,129,0.03)]">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <p className="text-left">
            Automatic downloads started! Look at your browser downloads bar.
          </p>
        </div>
      )}

      {downloadStatus === 'blocked' && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-850 text-xs font-semibold shadow-[0_2px_10px_rgba(245,158,11,0.03)]">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-left">
            Your browser may have blocked multiple automatic downloads. Please use the manual download links below.
          </p>
        </div>
      )}

      {/* Manual Downloads List Card */}
      <div className="border border-border/60 bg-card rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-3">
        <h3 className="text-xs font-bold text-slate-500 capitalize tracking-widest text-left">Your Downloadable Plugins</h3>
        <div className="divide-y divide-border/40">
          {products.map((prod, idx) => (
            <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex justify-between items-center gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                  <FileArchive className="h-5 w-5" />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate">{prod.name}</span>
                  <span className="text-[9px] text-slate-400 font-mono truncate block">Plugin Package Archive (.zip)</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleManualDownload(prod.url, prod.name)}
                className="inline-flex items-center gap-1.5 h-8.5 px-3.5 bg-indigo-50 border border-indigo-200/80 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 rounded-lg text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
