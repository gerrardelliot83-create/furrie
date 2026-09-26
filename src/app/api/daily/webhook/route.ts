import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRecordingLink } from '@/lib/daily';
import { createHmac, timingSafeEqual } from 'crypto';
import { consultationIdFromRoom } from '@/lib/daily/rooms';
import { meetingDurationMinutes, parseDailyWebhook, type DailyWebhookEvent } from '@/lib/daily/webhookEvents';
import { withRoute } from '@/server/handler';

const DAILY_WEBHOOK_SECRET = process.env.DAILY_WEBHOOK_SECRET;

// Reject events whose timestamp is further than this from our clock (replay window).
const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60;

type SignatureCheck = 'ok' | 'stale_timestamp' | 'mismatch';

/**
 * Daily's documented scheme (BRK-2):
 *   secret   = base64-decode(DAILY_WEBHOOK_SECRET)
 *   payload  = `${X-Webhook-Timestamp}.${raw request body}`
 *   expected = base64(HMAC-SHA256(secret, payload))
 * The previous implementation used the raw secret and a hex digest, so with
 * the secret set every genuine event was rejected as 'Invalid signature'.
 * https://docs.daily.co/reference/rest-api/webhooks
 */
function verifyDailySignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string
): SignatureCheck {
  // Daily sends Unix seconds; tolerate milliseconds defensively.
  const tsNumber = Number(timestamp);
  if (!Number.isFinite(tsNumber)) return 'stale_timestamp';
  const tsSeconds = tsNumber > 1e12 ? tsNumber / 1000 : tsNumber;
  const nowSeconds = Date.now() / 1000;
  if (Math.abs(nowSeconds - tsSeconds) > MAX_TIMESTAMP_SKEW_SECONDS) {
    return 'stale_timestamp';
  }

  const expected = createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(`${timestamp}.${rawBody}`)
    .digest();
  const provided = Buffer.from(signature, 'base64');
  if (provided.length !== expected.length) return 'mismatch';
  return timingSafeEqual(provided, expected) ? 'ok' : 'mismatch';
}

/**
 * GET /api/daily/webhook
 * Daily.co sends a GET request to validate the webhook URL during registration
 */
export const GET = withRoute(async function GET() {
  return NextResponse.json({ status: 'ok' });
});

/**
 * POST /api/daily/webhook
 * Handles Daily.co webhook events
 *
 * Events handled (field names as Daily documents them — see
 * src/lib/daily/webhookEvents.ts; P0R-1):
 * - recording.ready-to-download: store the recording on the consultation
 * - meeting.ended: record the call length on an active consultation. It does
 *   NOT close it: the vet finishes it (notes, then Finish), or the stale-call
 *   cron closes it by the V rule set (A-07).
 * - participant.joined: when the customer enters the room, tell the vet's
 *   portal (Broadcast 'customer_joined' on vet:<id>:notifications)
 * - participant.left: acknowledged, nothing to do
 *
 * Security: Verifies HMAC signature from Daily.co
 * See: https://docs.daily.co/reference/rest-api/webhooks
 */
export const POST = withRoute(async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Without a secret we cannot tell Daily from anyone else. In production
    // that is a misconfiguration, not a reason to trust the event (SEC-8).
    if (!DAILY_WEBHOOK_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        console.error('DAILY_WEBHOOK_SECRET is not set; refusing to process webhook');
        return NextResponse.json(
          { error: 'Webhook secret not configured', code: 'WEBHOOK_NOT_CONFIGURED' },
          { status: 503 }
        );
      }
      console.warn('DAILY_WEBHOOK_SECRET is not set; skipping signature verification (non-production only)');
    } else {
      const signature = request.headers.get('x-webhook-signature');
      const timestamp = request.headers.get('x-webhook-timestamp');

      if (!signature || !timestamp) {
        // Daily's registration check posts without signature headers. Acknowledge
        // it but process nothing: an unsigned request never reaches the handlers.
        console.log('Webhook request without signature headers — treating as validation ping');
        return NextResponse.json({ received: true });
      }

      const check = verifyDailySignature(rawBody, signature, timestamp, DAILY_WEBHOOK_SECRET);
      if (check !== 'ok') {
        console.error(`Rejected Daily webhook: ${check}`);
        return NextResponse.json(
          { error: 'Invalid signature', code: check === 'stale_timestamp' ? 'STALE_TIMESTAMP' : 'INVALID_SIGNATURE' },
          { status: 401 }
        );
      }
    }

    const event = parseDailyWebhook(JSON.parse(rawBody));

    switch (event.type) {
      case 'recording.ready-to-download':
        await handleRecordingReady(event);
        break;

      case 'meeting.ended':
        await handleMeetingEnded(event);
        break;

      case 'participant.joined':
        await handleParticipantJoined(event);
        break;

      case 'participant.left':
        // Subscribed by scripts/setup-daily-webhooks.ts; nothing to record.
        break;

      default:
        console.log('[daily-webhook] unhandled event type:', event.rawType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing Daily.co webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
});

/**
 * recording.ready-to-download — store the recording on the consultation.
 * Daily's payload names the room `room_name` for this event.
 */
async function handleRecordingReady(
  event: Extract<DailyWebhookEvent, { type: 'recording.ready-to-download' }>
) {
  const consultationId = consultationIdFromRoom(event.roomName);
  if (!consultationId || !event.recordingId) {
    console.log('[daily-webhook] recording for a non-Furrie room or without id; ignored');
    return;
  }

  let recordingUrl: string | null = null;
  try {
    recordingUrl = await getRecordingLink(event.recordingId);
  } catch (error) {
    console.error('[daily-webhook] failed to get recording link:', error);
  }

  const { data, error } = await supabaseAdmin
    .from('consultations')
    .update({ recording_id: event.recordingId, recording_url: recordingUrl })
    .eq('id', consultationId)
    .in('status', ['active', 'closed'])
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[daily-webhook] failed to save recording:', error);
  } else {
    console.log(`[daily-webhook] recording.ready-to-download ${data ? 'saved' : 'ignored (no active/closed consultation)'} consultation=${consultationId}`);
  }
}

/**
 * meeting.ended — record how long the call lasted, only while the
 * consultation is still active (guarded update). It does not close it.
 */
async function handleMeetingEnded(event: Extract<DailyWebhookEvent, { type: 'meeting.ended' }>) {
  const consultationId = consultationIdFromRoom(event.room);
  if (!consultationId) {
    console.log('[daily-webhook] meeting.ended for a non-Furrie room; ignored');
    return;
  }

  const minutes = meetingDurationMinutes(event.startTs, event.endTs);
  if (minutes === null) {
    console.warn(`[daily-webhook] meeting.ended without usable start/end consultation=${consultationId}`);
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('consultations')
    .update({ duration_minutes: minutes })
    .eq('id', consultationId)
    .eq('status', 'active')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[daily-webhook] failed to record meeting length:', error);
    return;
  }
  console.log(
    `[daily-webhook] meeting.ended processed consultation=${consultationId} minutes=${minutes} ${data ? 'recorded' : 'not active, unchanged'}`
  );
}

/**
 * participant.joined — when the customer enters the room, tell the vet's
 * portal so it can chime (VetAlerts). `user_id` is the id we put in the
 * meeting token (POST /api/consultations/[id]/join).
 */
async function handleParticipantJoined(event: Extract<DailyWebhookEvent, { type: 'participant.joined' }>) {
  const consultationId = consultationIdFromRoom(event.room);
  if (!consultationId || !event.userId) return;

  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('id, customer_id, vet_id, status, pets!consultations_pet_id_fkey (name)')
    .eq('id', consultationId)
    .maybeSingle();

  if (error || !consultation?.vet_id) return;
  if (event.userId !== consultation.customer_id) return;
  if (consultation.status !== 'scheduled' && consultation.status !== 'active') return;

  const pet = consultation.pets as unknown as { name: string } | null;
  try {
    const channel = supabaseAdmin.channel(`vet:${consultation.vet_id}:notifications`);
    await channel.send({
      type: 'broadcast',
      event: 'customer_joined',
      payload: { consultationId, petName: pet?.name ?? null },
    });
    await supabaseAdmin.removeChannel(channel);
    console.log(`[daily-webhook] participant.joined customer consultation=${consultationId}; vet notified`);
  } catch (broadcastError) {
    console.error('[daily-webhook] failed to notify vet of customer join:', broadcastError);
  }
}
