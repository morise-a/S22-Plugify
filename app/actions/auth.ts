'use server';

import { createActionClient } from '../../lib/supabase/action';
import { signUpSchema, signInSchema, SignUpInput, SignInInput } from '../../lib/validations/schemas';

/**
 * Server action to register a new user in Supabase Auth.
 * Automatically provisions public user profiles and carts via SQL trigger.
 */
export async function signUpAction(formData: SignUpInput) {
  const validation = signUpSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const { email, password, firstName, lastName, phone } = validation.data;
  
  // Designate admin role for emails starting with 'admin' for easy demonstration/testing
  const role = email.toLowerCase().startsWith('admin') ? 'admin' : 'customer';

  const supabase = await createActionClient();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  let createdUser = null;

  if (serviceRoleKey && !serviceRoleKey.includes('placeholder') && serviceRoleKey !== 'your-supabase-service-role-key') {
    // 1. Create client using service role key to auto-confirm email
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        role: role,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // 2. Automatically log the user in to establish browser cookies/session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return { success: false, error: `Account created successfully, but automatic login failed: ${signInError.message}` };
    }

    createdUser = signInData.user;
  } else {
    // Fallback: If no service role key is set, use standard signUp (will require email confirmation if enabled in Supabase)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phone,
          role: role,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    createdUser = data.user;
  }

  return { success: true, user: createdUser };
}

/**
 * Server action to authenticate a user with email and password.
 */
export async function signInAction(formData: SignInInput) {
  const validation = signInSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const { email, password } = validation.data;
  const supabase = await createActionClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Fetch the role from the database users table
  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const role = dbUser?.role || 'customer';

  return { success: true, user: data.user, role };
}

/**
 * Server action to sign out the current user session.
 */
export async function signOutAction() {
  const supabase = await createActionClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Triggers a password reset email using Supabase auth.
 */
export async function forgotPasswordAction(email: string) {
  if (!email) {
    return { success: false, error: 'Email is required.' };
  }

  const supabase = await createActionClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Updates the password for the currently logged in user session.
 */
export async function resetPasswordAction(password: string) {
  if (!password) {
    return { success: false, error: 'Password is required.' };
  }

  const supabase = await createActionClient();
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Retrieves the currently authenticated user's profile and database record.
 */
export async function getCurrentUser() {
  try {
    const supabase = await createActionClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return dbUser || null;
  } catch (err) {
    console.error('Failed to get authenticated current user (e.g. offline/timeout):', err);
    return null;
  }
}
