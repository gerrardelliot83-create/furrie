import { supabaseAdmin } from '@/lib/supabase/admin';

interface ExpoPushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoTicketError {
  error?: string;
  message?: string;
}

interface ExpoTicketSuccess {
  status: 'ok';
  id: string;
}

interface ExpoTicketFailure {
  status: 'error';
  message?: string;
  details?: ExpoTicketError;
}

type ExpoTicket = ExpoTicketSuccess | ExpoTicketFailure;

interface ExpoSendResponse {
  data?: ExpoTicket | ExpoTicket[];
  errors?: ExpoTicketError[];
}

// Expo ticket error codes that mean "this token is permanently invalid —
// stop sending to it". DeviceNotRegistered fires when the user uninstalls
// the app or revokes notification permissions. InvalidCredentials fires
// when the token was issued for a different Expo project.
const STALE_TOKEN_CODES = new Set(['DeviceNotRegistered', 'InvalidCredentials']);

/**
 * Send a single push notification via Expo's REST API.
 *
 * Non-blocking semantics: callers should wrap in try/catch and treat
 * failures as log-only — push is a best-effort channel, not the primary
 * delivery path (email + in-app notifications are the safety nets).
 *
 * Self-healing: if Expo reports the token is permanently invalid (uninstall,
 * revoked permissions, rotated token, wrong Expo project), we null out
 * `profiles.expo_push_token` for the owning user so we stop calling Expo
 * for them. Mobile re-registers on next sign-in via PATCH /api/profile.
 *
 * Optional Bearer auth: set EXPO_ACCESS_TOKEN to require Expo-side auth
 * on the request. Safe no-op when unset.
 */
export async function sendExpoPush(
  userId: string,
  payload: ExpoPushPayload
): Promise<{ ok: boolean; staleToken?: boolean }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-encoding': 'gzip, deflate',
  };
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...payload,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('[expo-push] HTTP error', response.status, errorText);
    return { ok: false };
  }

  // Expo returns 200 even on per-ticket errors (DeviceNotRegistered etc.).
  // Inspect the ticket body and clear the token if it's permanently invalid.
  const json: ExpoSendResponse = await response
    .json()
    .catch(() => ({} as ExpoSendResponse));
  const tickets: ExpoTicket[] = Array.isArray(json.data)
    ? json.data
    : json.data
      ? [json.data]
      : [];

  for (const ticket of tickets) {
    if (ticket && ticket.status === 'error') {
      const code = ticket.details?.error;
      if (code && STALE_TOKEN_CODES.has(code)) {
        console.warn(
          `[expo-push] Stale token for user ${userId} (${code}); clearing`
        );
        await supabaseAdmin
          .from('profiles')
          .update({ expo_push_token: null })
          .eq('id', userId);
        return { ok: false, staleToken: true };
      }
      console.error('[expo-push] Ticket error', ticket.message, ticket.details);
      return { ok: false };
    }
  }
  return { ok: true };
}
