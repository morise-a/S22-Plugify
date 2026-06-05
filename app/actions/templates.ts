'use server';

import { createActionClient } from '../../lib/supabase/action';
import { revalidatePath } from 'next/cache';

export interface MailTemplateInput {
  template_name: string;
  subject: string;
  html_content: string;
}

/**
 * Retrieves all mail templates (Admin only).
 */
export async function getTemplatesAction() {
  const supabase = await createActionClient();

  // Admin Guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') throw new Error('Admin role required');

  const { data, error } = await supabase
    .from('mail_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Retrieves a single template by ID or template_name.
 */
export async function getTemplateAction(identifier: string) {
  const supabase = await createActionClient();

  // Admin Guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') throw new Error('Admin role required');

  const { data, error } = await supabase
    .from('mail_templates')
    .select('*')
    .or(`id.eq.${identifier},template_name.eq.${identifier}`)
    .single();

  if (error) {
    console.error('Failed to get template:', error);
    return null;
  }

  return data;
}

/**
 * Creates a new email template.
 */
export async function createTemplateAction(data: MailTemplateInput) {
  const supabase = await createActionClient();

  // Admin Guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') return { success: false, error: 'Admin role required.' };

  const { error } = await supabase
    .from('mail_templates')
    .insert({
      template_name: data.template_name,
      subject: data.subject,
      html_content: data.html_content,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Updates an existing email template.
 */
export async function updateTemplateAction(templateId: string, data: MailTemplateInput) {
  const supabase = await createActionClient();

  // Admin Guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') return { success: false, error: 'Admin role required.' };

  const { error } = await supabase
    .from('mail_templates')
    .update({
      template_name: data.template_name,
      subject: data.subject,
      html_content: data.html_content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Deletes an email template.
 */
export async function deleteTemplateAction(templateId: string) {
  const supabase = await createActionClient();

  // Admin Guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (dbUser?.role !== 'admin') return { success: false, error: 'Admin role required.' };

  const { error } = await supabase
    .from('mail_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
