import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { domain, email, license_key, licenseKey } = body;
    const incomingLicenseKey = license_key || licenseKey;
    console.log('Body Checking:', body);
    if (!domain || !email || !incomingLicenseKey) {
      return NextResponse.json(
        { status: false, error: 'Missing required fields: domain, email, and license_key are required.' },
        { status: 400 }
      );
    }

    const trimmedDomain = domain.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedLicenseKey = incomingLicenseKey.trim();

    // Create a service role client to query all orders bypassing RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Query orders matching license key that are paid
    const { data: order, error: queryError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('status', 'paid')
      .eq('license_key', trimmedLicenseKey)
      .single();

    if (queryError || !order) {
      return NextResponse.json(
        { status: false, error: 'Invalid license key.' },
        { status: 401 }
      );
    }

    // Verify billing email matches
    if (order.billing_email?.trim().toLowerCase() !== trimmedEmail) {
      return NextResponse.json(
        { status: false, error: 'License email mismatch.' },
        { status: 401 }
      );
    }

    // Verify domain matches
    // Helper to extract clean domain host (removing http://, https://, www., and paths)
    const cleanDomain = (d: string) => d.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split(':')[0].toLowerCase();

    const dbDomainClean = cleanDomain(order.domain || '');
    const reqDomainClean = cleanDomain(trimmedDomain);

    if (dbDomainClean !== reqDomainClean) {
      return NextResponse.json(
        { status: false, error: `License domain mismatch. Registered: ${order.domain}, requested: ${domain}` },
        { status: 401 }
      );
    }

    // License is valid! Retrieve Google OAuth credentials from env
    const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    // Encrypt the credentials
    const credentialsPayload = JSON.stringify({
      google_client_id: googleClientId,
      google_client_secret: googleClientSecret,
    });

    const encryptionSecret = process.env.LICENSE_ENCRYPTION_KEY || 'super-admin-app-secret-license-key-encryption-key-2026';
    // Deriving a 32-byte key using SHA-256 hash of the secret
    const key = crypto.createHash('sha256').update(encryptionSecret).digest();

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(credentialsPayload, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return NextResponse.json({
      status: true,
      message: "License Verified Successfully",
      payload: encrypted
    });
  } catch (error: unknown) {
    console.error('License verification internal error:', error);
    return NextResponse.json(
      { status: false, error: 'Internal server error during verification.' },
      { status: 500 }
    );
  }
}
