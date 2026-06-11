'use server';

import { createClient } from '../../lib/supabase/server';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export async function getNotificationsAction(): Promise<{ notifications: Notification[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { notifications: [] };

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return { notifications: [], error: error.message };
  return { notifications: (data as Notification[]) || [] };
}

export async function markNotificationReadAction(notificationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
