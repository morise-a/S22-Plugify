'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Settings, Mail, CreditCard, Send, Activity, ShieldAlert, Sparkles, Key, Eye, EyeOff, FileText, ShieldCheck, Bold, Italic, Heading, Type, Link, Upload, Monitor, Smartphone, Tablet, Columns, Code } from 'lucide-react';
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
  uploadSettingsImageAction,
} from '../../app/actions/settings';

interface AppSettings {
  app_name: string;
  app_description?: string;
  terms_content?: string;
  privacy_content?: string;
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

function parsePlainTextToHtml(text: string): string {
  if (!text) return '';

  const lines = text.split('\n');
  const htmlResult: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let lastWasEmptyLine = true;

  const closeListIfOpen = () => {
    if (inList && listType) {
      htmlResult.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '') {
      closeListIfOpen();
      lastWasEmptyLine = true;
      continue;
    }

    // Heading 1
    if (line.startsWith('# ')) {
      closeListIfOpen();
      htmlResult.push(`<h1>${line.substring(2).trim()}</h1>`);
      lastWasEmptyLine = false;
      continue;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      closeListIfOpen();
      htmlResult.push(`<h2>${line.substring(3).trim()}</h2>`);
      lastWasEmptyLine = false;
      continue;
    }

    // Heading 3
    if (line.startsWith('### ')) {
      closeListIfOpen();
      htmlResult.push(`<h3>${line.substring(4).trim()}</h3>`);
      lastWasEmptyLine = false;
      continue;
    }

    // Unordered List
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList || listType !== 'ul') {
        closeListIfOpen();
        htmlResult.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      htmlResult.push(`  <li>${line.substring(2).trim()}</li>`);
      lastWasEmptyLine = false;
      continue;
    }

    // Ordered List
    const matchOl = line.match(/^(\d+)\.\s+(.*)/);
    if (matchOl) {
      if (!inList || listType !== 'ol') {
        closeListIfOpen();
        htmlResult.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      htmlResult.push(`  <li>${matchOl[2].trim()}</li>`);
      lastWasEmptyLine = false;
      continue;
    }

    // Plain text paragraph or continuation
    closeListIfOpen();

    let formattedLine = line;
    // Bold
    formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedLine = formattedLine.replace(/__(.*?)__/g, '<strong>$1</strong>');
    // Italic
    formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formattedLine = formattedLine.replace(/_(.*?)_/g, '<em>$1</em>');
    // Links
    formattedLine = formattedLine.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #4f46e5; text-decoration: underline;">$1</a>');

    if (!lastWasEmptyLine && htmlResult.length > 0 && htmlResult[htmlResult.length - 1].startsWith('<p>')) {
      const lastIdx = htmlResult.length - 1;
      const prevContent = htmlResult[lastIdx].slice(3, -4);
      htmlResult[lastIdx] = `<p>${prevContent} ${formattedLine}</p>`;
    } else {
      htmlResult.push(`<p>${formattedLine}</p>`);
    }
    lastWasEmptyLine = false;
  }

  closeListIfOpen();
  return htmlResult.join('\n');
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
  const [showSecretKey, setShowSecretKey] = React.useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = React.useState(false);

  // HTML Editor & Image Uploader States/Refs
  const [termsImageUploading, setTermsImageUploading] = React.useState(false);
  const [privacyImageUploading, setPrivacyImageUploading] = React.useState(false);

  const [termsPreviewMode, setTermsPreviewMode] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [privacyPreviewMode, setPrivacyPreviewMode] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const [termsLayoutMode, setTermsLayoutMode] = React.useState<'split' | 'editor' | 'preview'>('split');
  const [privacyLayoutMode, setPrivacyLayoutMode] = React.useState<'split' | 'editor' | 'preview'>('split');

  const termsTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const privacyTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const termsImageInputRef = React.useRef<HTMLInputElement | null>(null);
  const privacyImageInputRef = React.useRef<HTMLInputElement | null>(null);

  // 1. App Form
  const { register: regApp, handleSubmit: subApp, watch: watchApp, setValue: setAppVal } = useForm({
    defaultValues: {
      appName: appSettings.app_name,
      appDescription: appSettings.app_description || '',
      termsContent: appSettings.terms_content || '',
      privacyContent: appSettings.privacy_content || '',
    },
  });

  const watchedApp = watchApp();

  // Insert HTML tag into a textarea
  const insertHtmlToField = (
    field: 'termsContent' | 'privacyContent',
    ref: React.RefObject<HTMLTextAreaElement | null>,
    tagOpen: string,
    tagClose: string
  ) => {
    const textarea = ref.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = watchedApp[field] || '';

    const selectedText = currentText.substring(start, end);
    const newText = currentText.substring(0, start) + tagOpen + selectedText + tagClose + currentText.substring(end);

    setAppVal(field, newText, { shouldValidate: true });

    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selectedText.length);
    }, 50);
  };

  // Image Upload handler
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'termsContent' | 'privacyContent',
    ref: React.RefObject<HTMLTextAreaElement | null>,
    setUploading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    showToast('Uploading', 'info', 'Uploading image to storage bucket...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await uploadSettingsImageAction(formData);
      if (res.success && res.url) {
        showToast('Success', 'success', 'Image uploaded successfully!');
        
        // Insert img tag
        const imgTag = `<img src="${res.url}" alt="Image" style="max-width: 100%; height: auto; margin: 16px 0; border-radius: 8px;" />`;
        
        const textarea = ref.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const currentText = watchedApp[field] || '';
          
          const newText = currentText.substring(0, start) + imgTag + currentText.substring(end);
          setAppVal(field, newText, { shouldValidate: true });
          
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + imgTag.length, start + imgTag.length);
          }, 50);
        } else {
          // Fallback if textarea not focused/ref empty
          const currentText = watchedApp[field] || '';
          setAppVal(field, currentText + imgTag, { shouldValidate: true });
        }
      } else {
        showToast('Upload Failed', 'error', res.error || 'Failed to upload image.');
      }
    } catch (err: any) {
      showToast('Error', 'error', err.message || 'An error occurred during image upload.');
    } finally {
      setUploading(false);
      // Reset input value to allow uploading same file again
      e.target.value = '';
    }
  };

  // Auto-Convert plain text/markdown structure into HTML
  const handleAutoConvert = (field: 'termsContent' | 'privacyContent') => {
    const currentText = watchedApp[field] || '';
    if (!currentText.trim()) {
      showToast('Empty Field', 'error', 'Please enter some text before converting.');
      return;
    }
    
    if (/<[a-z][\s\S]*>/i.test(currentText)) {
      if (!confirm('This text seems to already contain HTML. Auto-converting will wrap the existing content in HTML elements. Do you want to proceed?')) {
        return;
      }
    }

    const htmlContent = parsePlainTextToHtml(currentText);
    setAppVal(field, htmlContent, { shouldValidate: true });
    showToast('Converted', 'success', 'Text converted to HTML successfully!');
  };

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
        <TabsList className="bg-slate-100/85 border border-slate-200/50 p-1 rounded-xl shrink-0">
          <TabsTrigger value="app" className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold">
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            Application
          </TabsTrigger>
          <TabsTrigger value="terms" className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold">
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            Terms
          </TabsTrigger>
          <TabsTrigger value="privacy" className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="smtp" className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold">
            <Mail className="h-3.5 w-3.5 text-slate-500" />
            SMTP
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
              <CardTitle className="text-xs font-bold text-slate-800 capitalize tracking-wider">Application Details</CardTitle>
              <CardDescription className="text-[10px] text-slate-400 mt-0.5">Configure system identity variables applied globally.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={subApp(onAppSave)} className="space-y-5">
              <Input
                label="Application Name"
                placeholder="Solution22 Store"
                {...regApp('appName', { required: 'Name is required' })}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 capitalize tracking-wide">Application Description</label>
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
          1b. TERMS & CONDITIONS TAB
         ==================================================================== */}
      <TabsContent value="terms">
        <div className="flex justify-between items-center mb-4 gap-4">
          <p className="text-[11px] text-slate-500 font-medium">Configure store terms and conditions layout. Use controls to adjust editor and preview sizes.</p>
          <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50 shrink-0">
            <button
              type="button"
              onClick={() => setTermsLayoutMode('editor')}
              className={`p-1.5 rounded-md transition-all cursor-pointer text-xs font-semibold flex items-center gap-1.5 ${
                termsLayoutMode === 'editor'
                  ? 'bg-white shadow-sm text-indigo-655 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Editor Only"
            >
              <Code className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[10px]">Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setTermsLayoutMode('split')}
              className={`p-1.5 rounded-md transition-all cursor-pointer text-xs font-semibold flex items-center gap-1.5 ${
                termsLayoutMode === 'split'
                  ? 'bg-white shadow-sm text-indigo-655 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Split View"
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[10px]">Split</span>
            </button>
            <button
              type="button"
              onClick={() => setTermsLayoutMode('preview')}
              className={`p-1.5 rounded-md transition-all cursor-pointer text-xs font-semibold flex items-center gap-1.5 ${
                termsLayoutMode === 'preview'
                  ? 'bg-white shadow-sm text-indigo-655 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Preview Only"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[10px]">Preview</span>
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-6 items-start transition-all duration-300 ${
          termsLayoutMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'
        }`}>
          
          {/* Editor Column */}
          {termsLayoutMode !== 'preview' && (
          <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl">
            <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center gap-3">
              <div className="h-9 w-9 bg-indigo-50 text-indigo-655 rounded-xl flex items-center justify-center border border-indigo-100/40">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-slate-800 capitalize tracking-wider">Terms & Conditions Editor</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-0.5">Customize your terms and service conditions using HTML formatting.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={subApp(onAppSave)} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 capitalize tracking-wide">HTML Content Markup</label>
                  
                  {/* Toolbar */}
                  <div className="flex items-center justify-between gap-2 p-1 bg-slate-50 border border-slate-200/60 rounded-t-xl border-b-0 overflow-x-auto whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {[
                        { label: 'Bold', icon: <Bold className="h-3 w-3" />, act: () => insertHtmlToField('termsContent', termsTextareaRef, '<strong>', '</strong>') },
                        { label: 'Italic', icon: <Italic className="h-3 w-3" />, act: () => insertHtmlToField('termsContent', termsTextareaRef, '<em>', '</em>') },
                        { label: 'Heading', icon: <Heading className="h-3 w-3" />, act: () => insertHtmlToField('termsContent', termsTextareaRef, '<h2>', '</h2>') },
                        { label: 'Paragraph', icon: <Type className="h-3 w-3" />, act: () => insertHtmlToField('termsContent', termsTextareaRef, '<p>', '</p>') },
                        { label: 'Link', icon: <Link className="h-3 w-3" />, act: () => insertHtmlToField('termsContent', termsTextareaRef, '<a href="" style="color: #4f46e5; text-decoration: underline;">', '</a>') },
                      ].map((btn, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={btn.act}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-semibold rounded-lg cursor-pointer text-slate-650 transition-colors shadow-sm shrink-0"
                        >
                          {btn.icon}
                          {btn.label}
                        </button>
                      ))}
                      
                      {/* Image Upload Button */}
                      <button
                        type="button"
                        onClick={() => termsImageInputRef.current?.click()}
                        disabled={termsImageUploading}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-semibold rounded-lg cursor-pointer text-slate-650 transition-colors shadow-sm disabled:opacity-50 shrink-0"
                      >
                        <Upload className="h-3 w-3" />
                        {termsImageUploading ? 'Uploading...' : 'Image'}
                      </button>
                      <input
                        type="file"
                        ref={termsImageInputRef}
                        onChange={(e) => handleImageUpload(e, 'termsContent', termsTextareaRef, setTermsImageUploading)}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    {/* Auto-Convert Button */}
                    <button
                      type="button"
                      onClick={() => handleAutoConvert('termsContent')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 hover:border-indigo-300 text-[10px] font-bold rounded-lg cursor-pointer text-indigo-750 transition-colors shadow-sm shrink-0"
                      title="Convert plain text/markdown structure into HTML automatically"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-indigo-650" />
                    </button>
                  </div>

                  <textarea
                    rows={16}
                    placeholder="Define your store terms and conditions in HTML format here..."
                    className="flex w-full rounded-b-xl border border-slate-200 bg-[#0f172a] px-3.5 py-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
                    {...regApp('termsContent')}
                    ref={(e) => {
                      regApp('termsContent').ref(e);
                      (termsTextareaRef as any).current = e;
                    }}
                  />
                </div>

                <div className="pt-4 flex justify-end border-t border-slate-100">
                  <Button type="submit" isLoading={appLoading} className="h-10 px-5 rounded-xl cursor-pointer">
                    Save Terms & Conditions
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          )}

          {/* Live Preview Column */}
          {termsLayoutMode !== 'editor' && (
          <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl flex flex-col h-full min-h-[580px]">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-xs font-bold text-slate-800 capitalize tracking-wider">Live Preview</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-0.5">Real-time simulation of the terms layout</CardDescription>
              </div>
              <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setTermsPreviewMode('desktop')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    termsPreviewMode === 'desktop'
                      ? 'bg-white shadow-sm text-indigo-655'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTermsPreviewMode('tablet')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    termsPreviewMode === 'tablet'
                      ? 'bg-white shadow-sm text-indigo-655'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Tablet Preview"
                >
                  <Tablet className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTermsPreviewMode('mobile')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    termsPreviewMode === 'mobile'
                      ? 'bg-white shadow-sm text-indigo-655'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Mobile Preview"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-start">
              
              {/* Browser Shell Frame */}
              <div className={`border border-slate-200 rounded-xl overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col flex-1 bg-white transition-all duration-300 ${
                termsPreviewMode === 'mobile' ? 'max-w-[360px] mx-auto w-full' :
                termsPreviewMode === 'tablet' ? 'max-w-[768px] mx-auto w-full' : 'w-full'
              }`}>
                {/* Browser Header Bar */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-4">
                  {/* Window Controls */}
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-400 rounded-full inline-block" />
                    <span className="w-2.5 h-2.5 bg-amber-400 rounded-full inline-block" />
                    <span className="w-2.5 h-2.5 bg-emerald-450 rounded-full inline-block" />
                  </div>

                  {/* Address/SSL Bar */}
                  <div className="flex-1 max-w-xs bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold shadow-inner truncate">
                    <span className="text-emerald-500 font-bold">🔒 https://</span>
                    <span className="text-slate-655">localhost:3000/terms</span>
                  </div>

                  <div className="w-8" />
                </div>

                {/* HTML Iframe Canvas Body */}
                <div className="flex-1 bg-white overflow-hidden p-4 min-h-[400px]">
                  {watchedApp.termsContent ? (
                    <iframe
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <meta charset="utf-8">
                            <style>
                              body {
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                                font-size: 14px;
                                line-height: 1.6;
                                color: #1e293b;
                                padding: 20px;
                                margin: 0;
                              }
                              h1 { font-size: 24px; font-weight: 750; margin-top: 24px; margin-bottom: 12px; color: #0f172a; }
                              h2 { font-size: 20px; font-weight: 700; margin-top: 20px; margin-bottom: 10px; color: #0f172a; }
                              h3 { font-size: 16px; font-weight: 650; margin-top: 16px; margin-bottom: 8px; color: #0f172a; }
                              p { margin-top: 0; margin-bottom: 16px; }
                              a { color: #4f46e5; text-decoration: underline; font-weight: 500; }
                              ul { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
                              ol { list-style-type: decimal; padding-left: 20px; margin-bottom: 16px; }
                              li { margin-bottom: 6px; }
                              img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
                              strong, b { font-weight: 700; color: #0f172a; }
                              em, i { font-style: italic; }
                              blockquote { border-left: 4px solid #e2e8f0; padding-left: 12px; font-style: italic; color: #64748b; margin: 16px 0; }
                              pre, code { font-family: monospace; background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 13px; }
                            </style>
                          </head>
                          <body>
                            ${watchedApp.termsContent}
                          </body>
                        </html>
                      `}
                      title="Terms Live Preview"
                      className="w-full h-full min-h-[400px] border-0"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold text-center p-8">
                      Write HTML content on the left to preview output layout.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </TabsContent>

      {/* ====================================================================
          1c. PRIVACY POLICY TAB
         ==================================================================== */}
      <TabsContent value="privacy">
        <div className="flex justify-between items-center mb-4 gap-4">
          <p className="text-[11px] text-slate-500 font-medium">Configure store privacy policy layout. Use controls to adjust editor and preview sizes.</p>
          <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50 shrink-0">
            <button
              type="button"
              onClick={() => setPrivacyLayoutMode('editor')}
              className={`p-1.5 rounded-md transition-all cursor-pointer text-xs font-semibold flex items-center gap-1.5 ${
                privacyLayoutMode === 'editor'
                  ? 'bg-white shadow-sm text-indigo-655 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Editor Only"
            >
              <Code className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[10px]">Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setPrivacyLayoutMode('split')}
              className={`p-1.5 rounded-md transition-all cursor-pointer text-xs font-semibold flex items-center gap-1.5 ${
                privacyLayoutMode === 'split'
                  ? 'bg-white shadow-sm text-indigo-655 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Split View"
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[10px]">Split</span>
            </button>
            <button
              type="button"
              onClick={() => setPrivacyLayoutMode('preview')}
              className={`p-1.5 rounded-md transition-all cursor-pointer text-xs font-semibold flex items-center gap-1.5 ${
                privacyLayoutMode === 'preview'
                  ? 'bg-white shadow-sm text-indigo-655 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Preview Only"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[10px]">Preview</span>
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-6 items-start transition-all duration-300 ${
          privacyLayoutMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'
        }`}>
          
          {/* Editor Column */}
          {privacyLayoutMode !== 'preview' && (
          <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl">
            <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center gap-3">
              <div className="h-9 w-9 bg-indigo-50 text-indigo-655 rounded-xl flex items-center justify-center border border-indigo-100/40">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-slate-800 capitalize tracking-wider">Privacy Policy Editor</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-0.5">Customize your privacy and cookies policies using HTML formatting.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={subApp(onAppSave)} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 capitalize tracking-wide">HTML Content Markup</label>
                  
                  {/* Toolbar */}
                  <div className="flex items-center justify-between gap-2 p-1 bg-slate-50 border border-slate-200/60 rounded-t-xl border-b-0 overflow-x-auto whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {[
                        { label: 'Bold', icon: <Bold className="h-3 w-3" />, act: () => insertHtmlToField('privacyContent', privacyTextareaRef, '<strong>', '</strong>') },
                        { label: 'Italic', icon: <Italic className="h-3 w-3" />, act: () => insertHtmlToField('privacyContent', privacyTextareaRef, '<em>', '</em>') },
                        { label: 'Heading', icon: <Heading className="h-3 w-3" />, act: () => insertHtmlToField('privacyContent', privacyTextareaRef, '<h2>', '</h2>') },
                        { label: 'Paragraph', icon: <Type className="h-3 w-3" />, act: () => insertHtmlToField('privacyContent', privacyTextareaRef, '<p>', '</p>') },
                        { label: 'Link', icon: <Link className="h-3 w-3" />, act: () => insertHtmlToField('privacyContent', privacyTextareaRef, '<a href="" style="color: #4f46e5; text-decoration: underline;">', '</a>') },
                      ].map((btn, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={btn.act}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-semibold rounded-lg cursor-pointer text-slate-650 transition-colors shadow-sm shrink-0"
                        >
                          {btn.icon}
                          {btn.label}
                        </button>
                      ))}
                      
                      {/* Image Upload Button */}
                      <button
                        type="button"
                        onClick={() => privacyImageInputRef.current?.click()}
                        disabled={privacyImageUploading}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-semibold rounded-lg cursor-pointer text-slate-655 transition-colors shadow-sm disabled:opacity-50 shrink-0"
                      >
                        <Upload className="h-3 w-3" />
                        {privacyImageUploading ? 'Uploading...' : 'Image'}
                      </button>
                      <input
                        type="file"
                        ref={privacyImageInputRef}
                        onChange={(e) => handleImageUpload(e, 'privacyContent', privacyTextareaRef, setPrivacyImageUploading)}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    {/* Auto-Convert Button */}
                    <button
                      type="button"
                      onClick={() => handleAutoConvert('privacyContent')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 hover:border-indigo-300 text-[10px] font-bold rounded-lg cursor-pointer text-indigo-750 transition-colors shadow-sm shrink-0"
                      title="Convert plain text/markdown structure into HTML automatically"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-indigo-650" />
                    </button>
                  </div>

                  <textarea
                    rows={16}
                    placeholder="Define your store privacy policies in HTML format here..."
                    className="flex w-full rounded-b-xl border border-slate-200 bg-[#0f172a] px-3.5 py-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
                    {...regApp('privacyContent')}
                    ref={(e) => {
                      regApp('privacyContent').ref(e);
                      (privacyTextareaRef as any).current = e;
                    }}
                  />
                </div>

                <div className="pt-4 flex justify-end border-t border-slate-100">
                  <Button type="submit" isLoading={appLoading} className="h-10 px-5 rounded-xl cursor-pointer">
                    Save Privacy Policy
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          )}

          {/* Live Preview Column */}
          {privacyLayoutMode !== 'editor' && (
          <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl flex flex-col h-full min-h-[580px]">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-xs font-bold text-slate-800 capitalize tracking-wider">Live Preview</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-0.5">Real-time simulation of the privacy layout</CardDescription>
              </div>
              <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setPrivacyPreviewMode('desktop')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    privacyPreviewMode === 'desktop'
                      ? 'bg-white shadow-sm text-indigo-655'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacyPreviewMode('tablet')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    privacyPreviewMode === 'tablet'
                      ? 'bg-white shadow-sm text-indigo-655'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Tablet Preview"
                >
                  <Tablet className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacyPreviewMode('mobile')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    privacyPreviewMode === 'mobile'
                      ? 'bg-white shadow-sm text-indigo-655'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Mobile Preview"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-start">
              
              {/* Browser Shell Frame */}
              <div className={`border border-slate-200 rounded-xl overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col flex-1 bg-white transition-all duration-300 ${
                privacyPreviewMode === 'mobile' ? 'max-w-[360px] mx-auto w-full' :
                privacyPreviewMode === 'tablet' ? 'max-w-[768px] mx-auto w-full' : 'w-full'
              }`}>
                {/* Browser Header Bar */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-4">
                  {/* Window Controls */}
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-400 rounded-full inline-block" />
                    <span className="w-2.5 h-2.5 bg-amber-400 rounded-full inline-block" />
                    <span className="w-2.5 h-2.5 bg-emerald-450 rounded-full inline-block" />
                  </div>

                  {/* Address/SSL Bar */}
                  <div className="flex-1 max-w-xs bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold shadow-inner truncate">
                    <span className="text-emerald-500 font-bold">🔒 https://</span>
                    <span className="text-slate-655">localhost:3000/privacy</span>
                  </div>

                  <div className="w-8" />
                </div>

                {/* HTML Iframe Canvas Body */}
                <div className="flex-1 bg-white overflow-hidden p-4 min-h-[400px]">
                  {watchedApp.privacyContent ? (
                    <iframe
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <meta charset="utf-8">
                            <style>
                              body {
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                                font-size: 14px;
                                line-height: 1.6;
                                color: #1e293b;
                                padding: 20px;
                                margin: 0;
                              }
                              h1 { font-size: 24px; font-weight: 750; margin-top: 24px; margin-bottom: 12px; color: #0f172a; }
                              h2 { font-size: 20px; font-weight: 700; margin-top: 20px; margin-bottom: 10px; color: #0f172a; }
                              h3 { font-size: 16px; font-weight: 650; margin-top: 16px; margin-bottom: 8px; color: #0f172a; }
                              p { margin-top: 0; margin-bottom: 16px; }
                              a { color: #4f46e5; text-decoration: underline; font-weight: 500; }
                              ul { list-style-type: disc; padding-left: 20px; margin-bottom: 16px; }
                              ol { list-style-type: decimal; padding-left: 20px; margin-bottom: 16px; }
                              li { margin-bottom: 6px; }
                              img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
                              strong, b { font-weight: 700; color: #0f172a; }
                              em, i { font-style: italic; }
                              blockquote { border-left: 4px solid #e2e8f0; padding-left: 12px; font-style: italic; color: #64748b; margin: 16px 0; }
                              pre, code { font-family: monospace; background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 13px; }
                            </style>
                          </head>
                          <body>
                            ${watchedApp.privacyContent}
                          </body>
                        </html>
                      `}
                      title="Privacy Live Preview"
                      className="w-full h-full min-h-[400px] border-0"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold text-center p-8">
                      Write HTML content on the left to preview output layout.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
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
              <CardTitle className="text-xs font-bold text-slate-800 capitalize tracking-wider">SMTP Server Settings</CardTitle>
              <CardDescription className="text-[10px] text-slate-400 mt-0.5">Configure email delivery servers for dispatching checkout receipts.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={subSmtp(onSmtpSave)} className="space-y-6">
              
              {/* Form Grid Section 1: Server Config */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 capitalize tracking-widest">1. Server Connection</h3>
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
                <h3 className="text-[10px] font-bold text-slate-400 capitalize tracking-widest">2. Sender Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Sender Email Address"
                    type="email"
                    placeholder="noreply@domain.com"
                    {...regSmtp('from_email', { required: 'From email is required' })}
                  />
                  <Input
                    label="Sender Display Name"
                    placeholder="Solution22 support"
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
                <h4 className="text-xs font-bold text-slate-800 capitalize tracking-wider">
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
              <CardTitle className="text-xs font-bold text-slate-800 capitalize tracking-wider">Stripe Configuration</CardTitle>
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
                type={showSecretKey ? 'text' : 'password'}
                placeholder="sk_test_..."
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...regStripe('secret_key')}
              />

              <Input
                label="Stripe Webhook Secret"
                type={showWebhookSecret ? 'text' : 'password'}
                placeholder="whsec_..."
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
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
