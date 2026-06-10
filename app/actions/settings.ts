'use server';

import { createActionClient } from '../../lib/supabase/action';
import { verifySmtpConnection } from '../../lib/email/mailer';
import Stripe from 'stripe';
import { revalidatePath } from 'next/cache';

/**
 * MASK helper for security (hiding keys and passwords in dashboard reads)
 */
function maskSecret(val?: string) {
  if (!val) return '';
  if (val.length <= 8) return '••••••••';
  return `${val.slice(0, 8)}••••••••${val.slice(-4)}`;
}

// ====================================================================
// 1. Application Settings CRUD
// ====================================================================

export async function getAppSettingsAction() {
  const supabase = await createActionClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Failed to get app settings:', error);
    return { app_name: 'Solution22 Store', app_description: 'Production-ready SaaS eCommerce platform.' };
  }
  return data;
}

export async function updateAppSettingsAction(data: {
  appName: string;
  appDescription?: string;
  appLogoUrl?: string;
  appFaviconUrl?: string;
  termsContent?: string;
  privacyContent?: string;
}) {
  const supabase = await createActionClient();

  // Guard: Admin only
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') return { success: false, error: 'Admin role required.' };

  const { error } = await supabase
    .from('app_settings')
    .upsert({
      id: 1,
      app_name: data.appName,
      app_description: data.appDescription || '',
      app_logo_url: data.appLogoUrl || null,
      app_favicon_url: data.appFaviconUrl || null,
      terms_content: data.termsContent || '',
      privacy_content: data.privacyContent || '',
      updated_at: new Date().toISOString()
    });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function uploadSettingsImageAction(formData: FormData) {
  const supabase = await createActionClient();

  // Guard: Admin only
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') return { success: false, error: 'Admin role required.' };

  const file = formData.get('file') as File;
  if (!file) return { success: false, error: 'No file provided.' };

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const storageSupabase = (serviceRoleKey && !serviceRoleKey.includes('placeholder'))
      ? createClient(supabaseUrl!, serviceRoleKey)
      : await createActionClient();

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `settings/${Math.random().toString(36).substring(2, 9)}_${Date.now()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await storageSupabase.storage
      .from('products')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '14400',
        upsert: true
      });

    if (error) {
      console.error('Settings Storage upload error:', error);
      return { success: false, error: `Failed to upload file: ${error.message}` };
    }

    const { data: { publicUrl } } = storageSupabase.storage
      .from('products')
      .getPublicUrl(fileName);

    return { success: true, url: publicUrl };
  } catch (err: any) {
    console.error('Settings Storage upload catch error:', err);
    return { success: false, error: err.message || 'Unknown upload error.' };
  }
}

// ====================================================================
// 2. SMTP Settings CRUD
// ====================================================================

export async function getSmtpSettingsAction() {
  const supabase = await createActionClient();

  // Admin check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') throw new Error('Admin role required');

  const { data, error } = await supabase
    .from('smtp_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return { host: '', port: 587, username: '', password: '', from_email: '', from_name: '' };
  }

  // Mask password for safety
  return {
    ...data,
    password: data.password ? '••••••••' : '',
  };
}

export async function updateSmtpSettingsAction(data: {
  host: string;
  port: number;
  username?: string;
  password?: string;
  from_email: string;
  from_name: string;
}) {
  const supabase = await createActionClient();

  // Admin Guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') return { success: false, error: 'Admin role required.' };

  // Fetch current setting to handle empty/masked password updates
  const { data: current } = await supabase.from('smtp_settings').select('password').eq('id', 1).single();

  let finalPassword = data.password;
  if (data.password === '••••••••' || !data.password) {
    finalPassword = current?.password || '';
  }

  const { error } = await supabase
    .from('smtp_settings')
    .upsert({
      id: 1,
      host: data.host,
      port: data.port,
      username: data.username || '',
      password: finalPassword,
      from_email: data.from_email,
      from_name: data.from_name,
      updated_at: new Date().toISOString()
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function testSmtpConnectionAction(config: {
  host: string;
  port: number;
  username?: string;
  password?: string;
  from_email: string;
  from_name: string;
  test_recipient: string;
}) {
  const supabase = await createActionClient();

  // Admin Guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') return { success: false, error: 'Admin role required.' };

  // Resolve password if masked
  let finalPassword = config.password;
  if (config.password === '••••••••' || !config.password) {
    const { data: current } = await supabase.from('smtp_settings').select('password').eq('id', 1).single();
    finalPassword = current?.password || '';
  }

  try {
    const res = await verifySmtpConnection({
      host: config.host,
      port: config.port,
      username: config.username,
      password: finalPassword,
      from_email: config.from_email,
      from_name: config.from_name,
    }, config.test_recipient);
    
    return { success: true, message: `SMTP verification email sent! (MsgID: ${res.messageId})` };
  } catch (err: any) {
    console.error('SMTP test failure:', err);
    return { success: false, error: `SMTP verification failed: ${err.message}` };
  }
}

// ====================================================================
// 3. Stripe Settings CRUD
// ====================================================================

export async function getStripeSettingsAction() {
  const supabase = await createActionClient();

  // Admin Guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') throw new Error('Admin role required');

  const { data, error } = await supabase
    .from('stripe_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return { publishable_key: '', secret_key: '', webhook_secret: '' };
  }

  return {
    publishable_key: data.publishable_key || '',
    secret_key: maskSecret(data.secret_key),
    webhook_secret: maskSecret(data.webhook_secret),
  };
}

export async function updateStripeSettingsAction(data: {
  publishable_key: string;
  secret_key?: string;
  webhook_secret?: string;
}) {
  const supabase = await createActionClient();

  // Admin Guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') return { success: false, error: 'Admin role required.' };

  const { data: current } = await supabase.from('stripe_settings').select('*').eq('id', 1).single();

  let finalSecret = data.secret_key;
  if (!finalSecret || finalSecret.includes('••••')) {
    finalSecret = current?.secret_key || '';
  }

  let finalWebhook = data.webhook_secret;
  if (!finalWebhook || finalWebhook.includes('••••')) {
    finalWebhook = current?.webhook_secret || '';
  }

  const { error } = await supabase
    .from('stripe_settings')
    .upsert({
      id: 1,
      publishable_key: data.publishable_key,
      secret_key: finalSecret,
      webhook_secret: finalWebhook,
      updated_at: new Date().toISOString()
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function testStripeConnectionAction(secretKey?: string) {
  const supabase = await createActionClient();

  // Admin Guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') return { success: false, error: 'Admin role required.' };

  let finalKey = secretKey;
  if (!finalKey || finalKey.includes('••••')) {
    const { data: current } = await supabase.from('stripe_settings').select('secret_key').eq('id', 1).single();
    finalKey = current?.secret_key || '';
  }

  if (!finalKey) {
    return { success: false, error: 'Stripe Secret Key is empty.' };
  }

  try {
    const stripe = new Stripe(finalKey, {
      apiVersion: '2025-01-27.acacia' as any,
    });
    
    // Test API connection by listing customers with limit 1
    await stripe.customers.list({ limit: 1 });
    return { success: true, message: 'Stripe API connection successfully verified!' };
  } catch (err: any) {
    console.error('Stripe API test failure:', err);
    return { success: false, error: `Stripe API verification failed: ${err.message}` };
  }
}

// ====================================================================
// 4. User Profile Settings
// ====================================================================

export async function updateProfileAction(data: {
  firstName: string;
  lastName: string;
  phone: string;
  profileImageUrl?: string;
  bio?: string;
}) {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Update users table
  const { error: userError } = await supabase
    .from('users')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      phone_number: data.phone,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (userError) {
    return { success: false, error: userError.message };
  }

  // Update profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      profile_image_url: data.profileImageUrl || null,
      bio: data.bio || '',
      updated_at: new Date().toISOString()
    });

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  // Sync user meta data inside Supabase Auth
  await supabase.auth.updateUser({
    data: {
      first_name: data.firstName,
      last_name: data.lastName,
      phone_number: data.phone,
      profile_image_url: data.profileImageUrl || null,
    }
  });

  return { success: true };
}

export async function changePasswordAction(password: string) {
  const supabase = await createActionClient();
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
