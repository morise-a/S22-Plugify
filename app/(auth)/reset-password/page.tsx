'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { resetPasswordSchema, ResetPasswordInput } from '../../../lib/validations/schemas';
import { resetPasswordAction } from '../../actions/auth';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/card';
import { useToast } from '../../../components/ui/toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDone, setIsDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsSubmitting(true);
    try {
      const res = await resetPasswordAction(data.password);
      if (res.success) {
        setIsDone(true);
        showToast('Password Reset Successfully!', 'success', 'You can now sign in with your new credentials.');
      } else {
        showToast('Reset Failed', 'error', res.error || 'Failed to update credentials.');
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
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Set your new secure password credentials
          </p>
        </div>

        <Card className="border-border/60 shadow-xl bg-card glass-panel">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Set New Password</CardTitle>
            <CardDescription>
              Please enter and confirm your new strong password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDone ? (
              <div className="flex flex-col items-center justify-center text-center p-4 border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl gap-2">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
                <h3 className="font-semibold text-foreground">Credentials Updated</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Your password has been changed successfully. You may now proceed to log in.
                </p>
                <Button onClick={() => router.push('/signin')} className="w-full inline-flex items-center gap-2">
                  Proceed to Login
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="relative">
                  <label className="text-sm font-medium text-foreground/80">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className={`
                      mt-1.5 flex h-10 w-full rounded-lg border border-input bg-card pl-10 pr-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200
                      ${errors.password ? 'border-destructive focus-visible:ring-destructive' : 'hover:border-foreground/20'}
                    `}
                    {...register('password')}
                  />
                  <Lock className="absolute left-3 top-10.5 h-4 w-4 text-muted-foreground" />
                  {errors.password && (
                    <span className="text-xs text-destructive font-medium mt-1 block">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <label className="text-sm font-medium text-foreground/80">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className={`
                      mt-1.5 flex h-10 w-full rounded-lg border border-input bg-card pl-10 pr-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200
                      ${errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : 'hover:border-foreground/20'}
                    `}
                    {...register('confirmPassword')}
                  />
                  <Lock className="absolute left-3 top-10.5 h-4 w-4 text-muted-foreground" />
                  {errors.confirmPassword && (
                    <span className="text-xs text-destructive font-medium mt-1 block">
                      {errors.confirmPassword.message}
                    </span>
                  )}
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
                  Reset Password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
