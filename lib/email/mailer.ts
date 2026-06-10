import nodemailer from 'nodemailer';
import { createActionClient } from '../supabase/action';

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using the SMTP configuration stored in the database.
 */
export async function sendEmail({ to, subject, html }: SendMailParams, customSupabase?: any) {
  const supabase = customSupabase || (await createActionClient());

  const { data: smtp, error } = await supabase
    .from('smtp_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !smtp) {
    console.error('SMTP configuration not found in database:', error);
    throw new Error('SMTP settings are not configured. Please set them up in the Admin Settings.');
  }

  // Create a transporter dynamically using db settings
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465, // SSL/TLS for port 465, STARTTLS for 587/25
    auth: smtp.username && smtp.password ? {
      user: smtp.username,
      pass: smtp.password,
    } : undefined,
    tls: {
      rejectUnauthorized: false // Avoid self-signed cert issues in SMTP servers
    }
  });

  const mailOptions = {
    from: `"${smtp.from_name}" <${smtp.from_email}>`,
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { success: true, messageId: info.messageId };
}

/**
 * Verifies custom SMTP settings by sending a test email.
 */
export async function verifySmtpConnection(config: {
  host: string;
  port: number;
  username?: string;
  password?: string;
  from_email: string;
  from_name: string;
}, testRecipient: string) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: config.username && config.password ? {
      user: config.username,
      pass: config.password,
    } : undefined,
    tls: {
      rejectUnauthorized: false
    }
  });

  // Verify connection configuration
  await transporter.verify();

  // Send a test email
  const info = await transporter.sendMail({
    from: `"${config.from_name}" <${config.from_email}>`,
    to: testRecipient,
    subject: 'SMTP Connection Test',
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Solution22 SMTP Test</h2>
        <p>Congratulations! Your SMTP settings are successfully configured and verified.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      </div>
    `,
  });

  return { success: true, messageId: info.messageId };
}
