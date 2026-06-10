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
    const cleanDomain = (d: string) => {
      return d
        .trim()
        .toLowerCase()
        .replace(/^(https?:\/\/)?(www\.)?/i, '')
        .replace(/\/+$/, '');
    };

    const isDomainMatching = (allowedRaw: string, reqRaw: string) => {
      const allowed = cleanDomain(allowedRaw);
      const req = cleanDomain(reqRaw);

      if (!allowed || !req) return false;

      // If they are exactly equal, they match.
      if (allowed === req) return true;

      // If the allowed domain contains a subdirectory path (e.g. "localhost/mysite" or "example.com/blog")
      if (allowed.includes('/')) {
        return req === allowed || req.startsWith(allowed + '/');
      }

      // If the allowed domain has no subdirectory path, compare the host/port part
      // E.g., allowed = "localhost:3000", req = "localhost:3000/test" -> req.split('/')[0] is "localhost:3000"
      return req.split('/')[0] === allowed;
    };

    // Fetch registered domains from purchased_domains
    const { data: dbDomains, error: domainsError } = await supabaseAdmin
      .from('purchased_domains')
      .select('id, domain_name')
      .eq('order_id', order.id);

    if (domainsError) {
      console.error('Error fetching purchased domains:', domainsError);
      return NextResponse.json(
        { status: false, error: 'Database error verifying domain.' },
        { status: 500 }
      );
    }

    let hasMatchingDomain = false;
    let emptySlotId: string | null = null;

    if (dbDomains && dbDomains.length > 0) {
      for (const slot of dbDomains) {
        if (slot.domain_name && isDomainMatching(slot.domain_name, trimmedDomain)) {
          hasMatchingDomain = true;
          break;
        }
        if (!slot.domain_name && !emptySlotId) {
          emptySlotId = slot.id;
        }
      }

      if (!hasMatchingDomain && emptySlotId) {
        // Automatically allocate the empty slot to this domain!
        const cleanedReqDomain = cleanDomain(trimmedDomain);
        const { error: updateError } = await supabaseAdmin
          .from('purchased_domains')
          .update({ domain_name: cleanedReqDomain })
          .eq('id', emptySlotId);

        if (updateError) {
          console.error('Failed to auto-allocate domain slot:', updateError);
          return NextResponse.json(
            { status: false, error: 'Database error assigning domain.' },
            { status: 500 }
          );
        }
        hasMatchingDomain = true;
      }
    } else {
      // Fallback: check order.domain directly (supports comma-separated multiple domains)
      const allowedDomains = (order.domain || '')
        .split(',')
        .map((d: string) => d.trim())
        .filter(Boolean);

      for (const allowedD of allowedDomains) {
        if (isDomainMatching(allowedD, trimmedDomain)) {
          hasMatchingDomain = true;
          break;
        }
      }
    }

    if (!hasMatchingDomain) {
      const registeredList = dbDomains && dbDomains.length > 0
        ? dbDomains.map((d: any) => d.domain_name || 'Not configured').join(', ')
        : (order.domain || 'None');
      return NextResponse.json(
        { status: false, error: `License domain mismatch.` },
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
      payload: encryptionSecret
    });
  } catch (error: unknown) {
    console.error('License verification internal error:', error);
    return NextResponse.json(
      { status: false, error: 'Internal server error during verification.' },
      { status: 500 }
    );
  }
}
