'use client';

import * as React from 'react';
import { Button } from './button';
import { Download } from 'lucide-react';
import { useToast } from './toast';

interface DownloadPdfButtonProps {
  targetId: string;
  filename: string;
}

export function DownloadPdfButton({ targetId, filename }: DownloadPdfButtonProps) {
  const [downloading, setDownloading] = React.useState(false);
  const { showToast } = useToast();

  const handleDownload = async () => {
    const element = document.getElementById(targetId);
    if (!element) {
      showToast('Error', 'error', 'Could not locate document content.');
      return;
    }

    setDownloading(true);
    try {
      // Dynamically import html2pdf.js locally (only on client)
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;

      // Configure PDF Options
      const opt: any = {
        margin:       15,
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc: Document) => {
            const allElements = clonedDoc.getElementsByTagName('*');
            for (let i = 0; i < allElements.length; i++) {
              const el = allElements[i] as HTMLElement;
              if (el.style) {
                // Strip/replace oklch or oklab variables with standard fallbacks
                if (el.style.color && (el.style.color.includes('okl') || el.style.color.includes('oka'))) {
                  el.style.color = '#0f172a';
                }
                if (el.style.backgroundColor && (el.style.backgroundColor.includes('okl') || el.style.backgroundColor.includes('oka'))) {
                  el.style.backgroundColor = '#ffffff';
                }
                if (el.style.borderColor && (el.style.borderColor.includes('okl') || el.style.borderColor.includes('oka'))) {
                  el.style.borderColor = '#e2e8f0';
                }
              }
            }
          }
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Generate the PDF
      await html2pdf().from(element).set(opt).save();
      showToast('PDF Downloaded', 'success', 'Document PDF saved successfully.');
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      showToast('Download Failed', 'error', err.message || 'An error occurred during PDF generation.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      isLoading={downloading}
      variant="outline"
      size="sm"
      className="inline-flex items-center gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all font-semibold rounded-xl"
    >
      {!downloading && <Download className="h-3.5 w-3.5 text-primary" />}
      Download PDF
    </Button>
  );
}
