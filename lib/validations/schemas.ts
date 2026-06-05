import { z } from 'zod';

// Email validation base rule
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

// Password validation with strict rules (8+ chars, uppercase, digit, special character)
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Phone number validation: XXXX XXX XXX (numbers only, exactly 10 digits total)
export const phoneSchema = z
  .string()
  .min(12, 'Phone number must match the format: XXXX XXX XXX')
  .max(12, 'Phone number must match the format: XXXX XXX XXX')
  .regex(/^\d{4} \d{3} \d{3}$/, 'Phone format must be XXXX XXX XXX (numbers and spaces only)');

// Sign Up Schema
export const signUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

// Sign In Schema
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset Password Schema
export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Contact Inquiry Schema
export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: emailSchema,
  message: z.string().min(10, 'Message must be at least 10 characters long').max(1000, 'Message must be less than 1000 characters'),
});

// Product CRUD Schema
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(150, 'Name must be under 150 characters'),
  description: z.string().max(2000, 'Description must be under 2000 characters').optional().or(z.literal('')),
  price: z.number({ message: 'Price must be a number' }).positive('Price must be greater than zero'),
});
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ProductInput = z.infer<typeof productSchema>;
