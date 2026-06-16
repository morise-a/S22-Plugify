import * as React from 'react';
import { createClient } from '../../../lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { CustomerDashboardClient } from '../../../components/customer/customer-dashboard-client';

export const revalidate = 0; // Disable caching to show real-time account updates

export default async function CustomerDashboardPage() {
  let authUser = null;
  let userProfile = null;
  let subscriptions: any[] = [];
  let orders: any[] = [];
  let purchasedDomains: any[] = [];
  let licenseKeys: any[] = [];
  let notifications: any[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    authUser = data?.user || null;

    if (authUser) {
      // Use service-role client on the server to bypass RLS policies
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // 1. Fetch user profile from DB
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          profiles (*)
        `)
        .eq('id', authUser.id)
        .single();
      userProfile = profile;

      // 2. Fetch active subscriptions with product details
      const { data: subs } = await supabaseAdmin
        .from('subscriptions')
        .select(`
          *,
          products (name, price)
        `)
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });
      subscriptions = subs || [];

      // 3. Fetch customer's paid orders to list purchased software
      const { data: ords } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              plugin_file_url
            )
          )
        `)
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });
      orders = ords || [];

      // 3b. Fetch customer's purchased domains configuration slots
      const { data: domains } = await supabaseAdmin
        .from('purchased_domains')
        .select(`
          *,
          products (name)
        `)
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });
      purchasedDomains = domains || [];

      // 3c. Fetch customer's license keys
      const { data: licenses } = await supabaseAdmin
        .from('license_keys')
        .select('*')
        .eq('user_id', authUser.id);
      licenseKeys = licenses || [];

      // 4. Fetch unread notifications
      const { data: notifs } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });
      notifications = notifs || [];
    }
  } catch (error) {
    console.error('Failed to load customer dashboard data:', error);
  }

  if (!authUser) return null;

  return (
    <div className="space-y-6 flex flex-col justify-start">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Customer Portal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Access your digital software products, active subscriptions, and profile credentials.
        </p>
      </div>

      <CustomerDashboardClient
        profile={userProfile}
        subscriptions={subscriptions || []}
        orders={orders || []}
        notifications={notifications || []}
        purchasedDomains={purchasedDomains || []}
        licenseKeys={licenseKeys || []}
      />
    </div>
  );
}
