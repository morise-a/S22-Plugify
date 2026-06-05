'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import { contactSchema, ContactInput } from '../../lib/validations/schemas';
import { submitContactMessage } from '../actions/messages';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { Card, CardContent } from '../../components/ui/card';
import { GithubIcon, TwitterIcon, LinkedinIcon } from '../../components/ui/icons';

export default function ContactPage() {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSent, setIsSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
  });

  const onSubmit = async (data: ContactInput) => {
    setIsSubmitting(true);
    try {
      const res = await submitContactMessage(data);
      if (res.success) {
        setIsSent(true);
        showToast('Message Sent!', 'success', 'Your inquiry has been stored and sent to the administrator.');
        reset();
      } else {
        showToast('Submission Failed', 'error', res.error || 'Please review the input fields.');
      }
    } catch (err: any) {
      showToast('Error', 'error', 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex-1 flex flex-col gap-8">
      {/* Title Header */}
      <div className="border-b border-border/40 pb-6 text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Get in Touch
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Have an inquiry, custom design request, or questions regarding subscription billing? Message us below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-4 items-start">
        {/* Left Column: Business Info & Map Placeholder */}
        <div className="space-y-8">
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Contact Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Email Support</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">support@saasecommerce.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Phone Hotline</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">+1 (800) 123-4567</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Headquarters Office</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    100 Innovation Way, Suite 400, Tech Valley, CA 94016
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-border/60" />

            {/* Social Links */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Connect with us</h4>
              <div className="flex space-x-4">
                {['twitter', 'github', 'linkedin'].map((social) => {
                  const icons: Record<string, React.ReactNode> = {
                    twitter: <TwitterIcon className="h-5 w-5" />,
                    github: <GithubIcon className="h-5 w-5" />,
                    linkedin: <LinkedinIcon className="h-5 w-5" />,
                  };
                  return (
                    <a
                      key={social}
                      href="#"
                      className="p-2 border border-border/60 rounded-full text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105 hover:bg-secondary/40"
                    >
                      {icons[social]}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Google Map Mockup Placeholder */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Find us on the map</h3>
            <div className="h-56 bg-secondary/30 rounded-2xl border border-border/60 flex items-center justify-center relative overflow-hidden group shadow-inner">
              {/* Mock Map Background Visuals */}
              <div className="absolute inset-0 bg-[radial-gradient(#ddd_1px,transparent_1px)] dark:bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
              
              {/* Map pin bubble animation */}
              <div className="relative z-10 flex flex-col items-center gap-1 hover:scale-105 transition-transform duration-300">
                <div className="p-2 bg-primary text-primary-foreground rounded-full shadow-lg border-2 border-white animate-bounce">
                  <MapPin className="h-6 w-6" />
                </div>
                <span className="px-2.5 py-1 bg-black/80 text-[10px] font-bold text-white rounded-lg backdrop-blur">
                  ApexSaaS HQ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Form */}
        <Card className="border-border/60 shadow-xl bg-card glass-panel">
          <CardContent className="p-8">
            {isSent ? (
              <div className="flex flex-col items-center justify-center text-center py-8 gap-4">
                <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                  <CheckCircle className="h-10 w-10 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Inquiry Submitted Successfully</h3>
                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    Thank you! We received your message. Our sales team will get back to you within 24 business hours.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsSent(false)} className="mt-4">
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <h2 className="text-xl font-bold text-foreground">Send a Message</h2>
                <p className="text-xs text-muted-foreground">
                  Fields marked are verified and processed securely.
                </p>

                <div className="relative">
                  <Input
                    label="Full Name"
                    placeholder="John Doe"
                    error={errors.name?.message}
                    {...register('name')}
                  />
                </div>

                <div className="relative">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="john@example.com"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground/80">Message</label>
                  <textarea
                    rows={5}
                    placeholder="Tell us what you are building or query details..."
                    className={`
                      flex w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200
                      ${errors.message ? 'border-destructive focus-visible:ring-destructive' : 'hover:border-foreground/20'}
                    `}
                    {...register('message')}
                  />
                  {errors.message && (
                    <span className="text-xs text-destructive font-medium mt-1 block">
                      {errors.message.message}
                    </span>
                  )}
                </div>

                <Button type="submit" className="w-full mt-2 inline-flex items-center gap-2 h-11" isLoading={isSubmitting}>
                  <Send className="h-4 w-4" />
                  Submit Inquiry
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
