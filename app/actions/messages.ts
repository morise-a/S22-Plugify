'use server';

import { createActionClient } from '../../lib/supabase/action';
import { contactSchema, ContactInput } from '../../lib/validations/schemas';
import { sendEmail } from '../../lib/email/mailer';

/**
 * Handles contact form submissions.
 * Stores inquiry in DB, then compiles and dispatches notification email to admin.
 */
export async function submitContactMessage(formData: ContactInput) {
  const validation = contactSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const { name, email, message } = validation.data;
  const supabase = await createActionClient();

  // 1. Store message in the database
  const { error: insertError } = await supabase
    .from('contact_messages')
    .insert({
      name,
      email,
      message,
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // 2. Query smtp settings to get admin target email
  const { data: smtp } = await supabase
    .from('smtp_settings')
    .select('from_email')
    .eq('id', 1)
    .single();

  if (smtp?.from_email) {
    try {
      // 3. Query mail_templates for contact notification layout
      const { data: template } = await supabase
        .from('mail_templates')
        .select('*')
        .eq('template_name', 'contact_notification')
        .single();

      // Compile subject and content
      const subject = template?.subject
        ? template.subject.replace(/{{customer_name}}/g, name)
        : `New Contact Form Inquiry from ${name}`;

      const defaultHtml = `
        <h2>New Inquiry Received</h2>
        <p><strong>Name:</strong> {{customer_name}}</p>
        <p><strong>Email:</strong> {{customer_email}}</p>
        <p><strong>Message:</strong></p>
        <p>{{message_content}}</p>
      `;

      const rawHtml = template?.html_content || defaultHtml;

      const htmlContent = rawHtml
        .replace(/{{customer_name}}/g, name)
        .replace(/{{customer_email}}/g, email)
        .replace(/{{message_content}}/g, message.replace(/\n/g, '<br/>'));

      // Send mail to admin (recipient is from_email address)
      await sendEmail({
        to: smtp.from_email,
        subject,
        html: htmlContent,
      });
    } catch (mailErr) {
      // Log error but do not fail the database inquiry success response
      console.error('Failed to notify admin via SMTP:', mailErr);
    }
  }

  return { success: true };
}
