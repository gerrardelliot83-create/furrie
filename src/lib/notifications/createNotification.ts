import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/database.types';

type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

// Insert a notification row and broadcast a Realtime event so the
// recipient's NotificationBell updates without polling. Per audit F-07
// (D-2 option A).
//
// Subscribers listen on `user:<userId>:notifications`. Broadcast failure
// is logged but non-fatal — the row is in the DB and the bell will pick
// it up on next mount or visibility-change refresh.
export async function createNotification(notification: NotificationInsert) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert(notification)
    .select()
    .single();

  if (error || !data) {
    console.error('[createNotification] insert failed', error);
    return { data: null, error };
  }

  try {
    const channel = supabaseAdmin.channel(`user:${notification.user_id}:notifications`);
    await channel.send({
      type: 'broadcast',
      event: 'notification_created',
      payload: {
        id: data.id,
        type: data.type,
        title: data.title,
      },
    });
    await supabaseAdmin.removeChannel(channel);
  } catch (broadcastErr) {
    console.warn('[createNotification] broadcast failed (non-fatal)', broadcastErr);
  }

  return { data, error: null };
}
