'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { forgotPasswordSchema, ForgotPasswordInput } from '../../../lib/validations/schemas';
import { forgotPasswordAction } from '../../actions/auth';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/card';
import { useToast } from '../../../components/ui/toast';

export default function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSent, setIsSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsSubmitting(true);
    try {
      const res = await forgotPasswordAction(data.email);
      if (res.success) {
        setIsSent(true);
        showToast('Reset email sent!', 'success', 'Please check your email client for instructions.');
      } else {
        showToast('Request Failed', 'error', res.error || 'Failed to dispatch reset link.');
      }
    } catch (err: any) {
      showToast('Error', 'error', 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-primary">
            Solution22
          </Link>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            Recover Password
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your registered email address to receive a recovery link
          </p>
        </div>

        <Card className="border-border/60 shadow-xl bg-card glass-panel">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Password Recovery</CardTitle>
            <CardDescription>
              We will email you a secure link to reset your account credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSent ? (
              <div className="flex flex-col items-center justify-center text-center p-4 border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl gap-2">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
                <h3 className="font-semibold text-foreground">Recovery email dispatched</h3>
                <p className="text-xs text-muted-foreground">
                  We have sent instructions to your email address. Please follow the instructions to reset your password.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="relative">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="name@example.com"
                    error={errors.email?.message}
                    {...register('email')}
                    className="pl-10"
                  />
                  <Mail className="absolute left-3 top-9.5 h-4 w-4 text-muted-foreground" />
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
                  Send Recovery Link
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 border-t border-border/40 bg-secondary/10 p-4 rounded-b-xl">
            <Link
              href="/signin"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
