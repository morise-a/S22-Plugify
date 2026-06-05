'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Edit3, Trash2, Plus, Copy, Check, Eye, EyeOff, Code, Bold, Italic, Heading, Link, Type } from 'lucide-react';
import { createTemplateAction, updateTemplateAction, deleteTemplateAction } from '../../app/actions/templates';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';

interface MailTemplate {
  id: string;
  template_name: string;
  subject: string;
  html_content: string;
}

const TEMPLATE_VARS = [
  { placeholder: '{{customer_name}}', desc: "Customer's full name" },
  { placeholder: '{{order_number}}', desc: 'Order reference number' },
  { placeholder: '{{product_name}}', desc: 'Purchased software listings' },
  { placeholder: '{{payment_amount}}', desc: 'Total transaction fee amount' },
  { placeholder: '{{customer_email}}', desc: "Customer's email address" },
  { placeholder: '{{message_content}}', desc: 'Contact page query text' },
];

const MOCK_VALUES: Record<string, string> = {
  '{{customer_name}}': 'Sarah Jenkins',
  '{{order_number}}': 'APX-MJK982-4820',
  '{{product_name}}': 'Apex Pro Subscription (x1)',
  '{{payment_amount}}': '$79.00',
  '{{customer_email}}': 'sarah@domain.com',
  '{{message_content}}': 'Looking for custom volume developer licensing details.',
};

export function TemplateBuilderClient({ initialTemplates }: { initialTemplates: MailTemplate[] }) {
  const { showToast } = useToast();
  const [templates, setTemplates] = React.useState<MailTemplate[]>(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = React.useState<MailTemplate | null>(null);
  
  const [copiedVar, setCopiedVar] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(true);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      template_name: '',
      subject: '',
      html_content: '',
    },
  });

  const watchedHtml = watch('html_content');
  const watchedSubject = watch('subject');

  // Set default selection on load if templates exist
  React.useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      handleSelectTemplate(templates[0]);
    }
  }, [templates]);

  // Trigger when a template from the list is clicked
  const handleSelectTemplate = (template: MailTemplate) => {
    setSelectedTemplate(template);
    reset({
      template_name: template.template_name,
      subject: template.subject,
      html_content: template.html_content,
    });
  };

  const handleAddNew = () => {
    setSelectedTemplate(null);
    reset({
      template_name: '',
      subject: '',
      html_content: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n</head>\n<body style="font-family: sans-serif; color: #333; line-height: 1.6; padding: 20px;">\n  <h2 style="color: #4f46e5;">Hi {{customer_name}},</h2>\n  <p>Write your message content...</p>\n</body>\n</html>',
    });
  };

  // Copy variable pill handler
  const handleCopyVar = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    setCopiedVar(placeholder);
    showToast('Copied!', 'info', `Copied "${placeholder}" to clipboard.`);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  // Insert HTML tag into the textarea cursor position
  const insertHtmlTag = (tagOpen: string, tagClose: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = watchedHtml || '';
    
    const selectedText = currentText.substring(start, end);
    const newText = currentText.substring(0, start) + tagOpen + selectedText + tagClose + currentText.substring(end);
    
    setValue('html_content', newText, { shouldValidate: true });
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selectedText.length);
    }, 50);
  };

  // Compile real-time preview replacing variables with mock values
  const getCompiledPreview = () => {
    let html = watchedHtml || '';
    let subject = watchedSubject || '';

    for (const [placeholder, val] of Object.entries(MOCK_VALUES)) {
      const regex = new RegExp(placeholder, 'g');
      html = html.replace(regex, val);
      subject = subject.replace(regex, val);
    }

    return { subject, html };
  };

  const compiled = getCompiledPreview();

  const onSave = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (selectedTemplate) {
        // Edit Action
        const res = await updateTemplateAction(selectedTemplate.id, data);
        if (res.success) {
          showToast('Template Saved', 'success', `"${data.template_name}" template updated.`);
          // Reload list
          const updatedList = templates.map((t) => (t.id === selectedTemplate.id ? { ...t, ...data } : t));
          setTemplates(updatedList);
        } else {
          showToast('Save Failed', 'error', res.error);
        }
      } else {
        // Create Action
        const res = await createTemplateAction(data);
        if (res.success) {
          showToast('Template Created', 'success', `"${data.template_name}" template added.`);
          window.location.reload();
        } else {
          showToast('Creation Failed', 'error', res.error);
        }
      }
    } catch (err: any) {
      showToast('Error', 'error', err.message || 'Saving failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await deleteTemplateAction(id);
      if (res.success) {
        showToast('Template Deleted', 'success', 'Template removed from system.');
        const updatedList = templates.filter((t) => t.id !== id);
        setTemplates(updatedList);
        if (updatedList.length > 0) {
          handleSelectTemplate(updatedList[0]);
        } else {
          handleAddNew();
        }
      } else {
        showToast('Delete Failed', 'error', res.error);
      }
    } catch (err) {
      showToast('Error', 'error', 'Failed to delete template.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in">
      {/* 1. Left Sidebar: Templates List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200/50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Mail Layouts</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Select a template to edit</p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer" 
            onClick={handleAddNew} 
            title="Create template"
          >
            <Plus className="h-4 w-4 text-slate-650" />
          </Button>
        </div>

        <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
          {templates.map((t) => {
            const isActive = selectedTemplate?.id === t.id;
            return (
              <div
                key={t.id}
                onClick={() => handleSelectTemplate(t)}
                className={`group p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-[0_4px_20px_rgba(79,70,229,0.02)] border-l-4 border-l-indigo-650'
                    : 'border-slate-200/60 bg-white hover:bg-slate-50/50 hover:border-slate-350'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className={`font-bold text-xs truncate block ${isActive ? 'text-indigo-950' : 'text-slate-700'}`}>
                      {t.template_name}
                    </span>
                  </div>
                  {t.template_name !== 'order_confirmation' && t.template_name !== 'contact_notification' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-650 rounded-lg hover:bg-slate-100 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 line-clamp-1 font-semibold">{t.subject}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Right Pane: Builder Editor + Mock Email Client Live Preview */}
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Editor Card */}
        <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl">
          <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center gap-2">
            <div className="h-9 w-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100/40">
              <Code className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">Template Editor</CardTitle>
              <CardDescription className="text-[10px] text-slate-400 mt-0.5">Customize template details and HTML markup</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <Input
                label="Template Identifier"
                placeholder="order_confirmation"
                disabled={selectedTemplate?.template_name === 'order_confirmation' || selectedTemplate?.template_name === 'contact_notification'}
                error={errors.template_name?.message}
                {...register('template_name', { required: 'Template identifier is required' })}
              />

              <Input
                label="Subject Line"
                placeholder="Thank you for your order! #{{order_number}}"
                error={errors.subject?.message}
                {...register('subject', { required: 'Subject line is required' })}
              />

              {/* Rich text helper toolbar */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 tracking-wide uppercase">HTML Content Markup</label>
                
                <div className="flex flex-wrap gap-1 p-1 bg-slate-50 border border-slate-200/60 rounded-t-xl border-b-0">
                  {[
                    { label: 'Bold', icon: <Bold className="h-3 w-3" />, act: () => insertHtmlTag('<strong>', '</strong>') },
                    { label: 'Italic', icon: <Italic className="h-3 w-3" />, act: () => insertHtmlTag('<em>', '</em>') },
                    { label: 'H2', icon: <Heading className="h-3 w-3" />, act: () => insertHtmlTag('<h2>', '</h2>') },
                    { label: 'Paragraph', icon: <Type className="h-3 w-3" />, act: () => insertHtmlTag('<p>', '</p>') },
                    { label: 'Link', icon: <Link className="h-3 w-3" />, act: () => insertHtmlTag('<a href="" style="color: #4f46e5; text-decoration: underline;">', '</a>') },
                  ].map((btn, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={btn.act}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-semibold rounded-lg cursor-pointer text-slate-650 transition-colors shadow-sm"
                    >
                      {btn.icon}
                      {btn.label}
                    </button>
                  ))}
                </div>

                <textarea
                  id="html-content-textarea"
                  rows={13}
                  placeholder="<!DOCTYPE html><html><body>..."
                  className="flex w-full rounded-b-xl border border-slate-200 bg-[#0f172a] px-3.5 py-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
                  {...register('html_content', { required: 'HTML markup is required' })}
                  ref={(e) => {
                    register('html_content').ref(e);
                    (textareaRef as any).current = e;
                  }}
                />
              </div>

              {/* Variable Helper Bar */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Insert Variables (Click to Copy)</span>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARS.map((v) => (
                    <button
                      key={v.placeholder}
                      type="button"
                      onClick={() => handleCopyVar(v.placeholder)}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-650 text-[10px] font-mono border border-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer text-slate-500 transition-all shadow-sm"
                      title={v.desc}
                    >
                      {copiedVar === v.placeholder ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
                      {v.placeholder}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full h-10 mt-4 cursor-pointer" isLoading={isSubmitting}>
                Save Mail Template
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Live Preview Card styled as a Mock Mail Client */}
        <Card className="border-slate-200/50 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl flex flex-col h-full min-h-[550px]">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">Live Preview</CardTitle>
              <CardDescription className="text-[10px] text-slate-400 mt-0.5">Simulated dynamic email content</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-xs cursor-pointer hover:bg-slate-50 border-slate-200 text-slate-650"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
              {showPreview ? 'Hide Client' : 'Show Client'}
            </Button>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-start">
            {showPreview ? (
              <div className="space-y-4 flex-1 flex flex-col justify-start">
                
                {/* Mock Browser Shell Frame */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col flex-1 bg-white">
                  
                  {/* Browser Header Bar */}
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-4">
                    {/* Window Controls */}
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 bg-red-400 rounded-full inline-block" />
                      <span className="w-3 h-3 bg-amber-400 rounded-full inline-block" />
                      <span className="w-3 h-3 bg-emerald-400 rounded-full inline-block" />
                    </div>

                    {/* Address/SSL Bar */}
                    <div className="flex-1 max-w-sm bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold shadow-inner truncate">
                      <span className="text-emerald-500 font-bold">🔒 https://</span>
                      <span className="text-slate-600">mail.apexsaas.com/inbox/preview/{selectedTemplate?.template_name || 'untitled'}</span>
                    </div>

                    <div className="w-12" /> {/* alignment spacer */}
                  </div>

                  {/* Mail Details Box */}
                  <div className="bg-slate-50/50 border-b border-slate-100 p-4 text-[10px] text-slate-600 space-y-2 leading-relaxed">
                    <div className="flex gap-2">
                      <span className="font-bold text-slate-400 w-12 text-right">From:</span>
                      <span className="text-slate-700 font-bold">ApexSaaS Mailer &lt;noreply@apexsaas.com&gt;</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-slate-400 w-12 text-right">To:</span>
                      <span className="text-slate-700">{selectedTemplate?.template_name === 'contact_notification' ? 'admin@apexsaas.com' : 'sarah@domain.com'}</span>
                    </div>
                    <div className="flex gap-2 border-t border-slate-200/50 pt-2">
                      <span className="font-bold text-slate-400 w-12 text-right">Subject:</span>
                      <span className="text-slate-800 font-extrabold">{compiled.subject || '(Subject empty)'}</span>
                    </div>
                  </div>

                  {/* HTML Iframe Canvas Body */}
                  <div className="flex-1 bg-white overflow-hidden p-4 min-h-[300px]">
                    {compiled.html ? (
                      <iframe
                        srcDoc={compiled.html}
                        title="Mail Template Live Preview"
                        className="w-full h-full min-h-[300px] border-0"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold">
                        Write HTML template content on the left to preview output layout.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 text-slate-450 text-xs my-auto gap-2.5">
                <Mail className="h-10 w-10 text-slate-200" />
                <span>Email client simulator closed.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
