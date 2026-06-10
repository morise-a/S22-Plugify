import * as React from 'react';
import { createClient } from '../../../lib/supabase/server';
import { CustomerDashboardClient } from '../../../components/customer/customer-dashboard-client';

export const revalidate = 0; // Disable caching to show real-time account updates

export default async function CustomerDashboardPage() {
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  // 1. Fetch user profile from DB
  const { data: userProfile } = await supabase
    .from('users')
    .select(`
      *,
      profiles (*)
    `)
    .eq('id', authUser.id)
    .single();

  // 2. Fetch active subscriptions with product details
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      *,
      products (name, price)
    `)
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: false });

  // 3. Fetch customer's paid orders to list purchased software
  const { data: orders } = await supabase
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

  // 3b. Fetch customer's purchased domains configuration slots
  const { data: purchasedDomains } = await supabase
    .from('purchased_domains')
    .select(`
      *,
      products (name)
    `)
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: false });

  // 4. Fetch unread notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: false });

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
      />
    </div>
  );
}
