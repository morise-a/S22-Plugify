'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, Phone } from 'lucide-react';
import { signUpSchema, SignUpInput } from '../../../lib/validations/schemas';
import { signUpAction } from '../../actions/auth';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/card';
import { useToast } from '../../../components/ui/toast';

export default function SignUpPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignUpInput) => {
    setIsSubmitting(true);
    try {
      const res = await signUpAction(data);
      if (res.success) {
        showToast(
          'Registration Successful!',
          'success',
          'Please verify your email if confirmation is enabled, or sign in now.'
        );
        router.push('/signin');
      } else {
        showToast('Registration Failed', 'error', res.error || 'Please review the fields.');
      }
    } catch (err: any) {
      showToast('Error', 'error', 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enforces phone formatting: XXXX XXX XXX (numbers and spaces only)
  const formatPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, ''); // strip all non-digits
    let formattedVal = '';
    
    if (rawVal.length > 0) {
      formattedVal = rawVal.slice(0, 4);
      if (rawVal.length > 4) {
        formattedVal += ' ' + rawVal.slice(4, 7);
      }
      if (rawVal.length > 7) {
        formattedVal += ' ' + rawVal.slice(7, 10);
      }
    }
    
    // Set formatted value back in the form state
    setValue('phone', formattedVal, { shouldValidate: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-primary">
            ApexSaaS
          </Link>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            Create an account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started in just a few minutes
          </p>
        </div>

        <Card className="border-border/60 shadow-xl bg-card glass-panel">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign up</CardTitle>
            <CardDescription>
              Complete the registration form below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Input
                    label="First Name"
                    placeholder="John"
                    error={errors.firstName?.message}
                    {...register('firstName')}
                    className="pl-10"
                  />
                  <User className="absolute left-3 top-9.5 h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative">
                  <Input
                    label="Last Name"
                    placeholder="Doe"
                    error={errors.lastName?.message}
                    {...register('lastName')}
                    className="pl-10"
                  />
                  <User className="absolute left-3 top-9.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

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

              <div className="relative">
                <Input
                  label="Phone Number (Format: XXXX XXX XXX)"
                  placeholder="0800 123 456"
                  error={errors.phone?.message}
                  {...register('phone', { onChange: formatPhone })}
                  className="pl-10"
                  maxLength={12} // 10 digits + 2 spaces
                />
                <Phone className="absolute left-3 top-9.5 h-4 w-4 text-muted-foreground" />
              </div>

              <div className="relative">
                <label className="text-sm font-medium text-foreground/80">Password</label>
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

              <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
                Sign Up
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-border/40 bg-secondary/10 p-4 rounded-b-xl">
            <p className="text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link href="/signin" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
