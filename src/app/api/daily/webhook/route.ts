import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRecordingLink } from '@/lib/daily';
import { createHmac, timingSafeEqual } from 'crypto';
import { checkPlusSubscriptionWithClient, calculateThreadExpiry } from '@/lib/utils/followUpHelpers';
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
 * Events handled:
 * - recording.ready-to-download: Recording is ready, store URL
 * - meeting.ended: Meeting ended, update consultation status
 * - participant.joined: Track participant joins
 * - participant.left: Track participant leaves
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

    const body = JSON.parse(rawBody);
    const { event, payload } = body;

    console.log('Daily.co webhook received:', event);

    switch (event) {
      case 'recording.ready-to-download':
        await handleRecordingReady(payload);
        break;

      case 'meeting.ended':
        await handleMeetingEnded(payload);
        break;

      case 'participant.joined':
        await handleParticipantJoined(payload);
        break;

      default:
        console.log('Unhandled Daily.co event:', event);
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
 * Handle recording.ready-to-download event
 * Stores recording URL in the consultation record
 */
async function handleRecordingReady(payload: {
  recording_id: string;
  room_name: string;
  duration: number;
}) {
  const { recording_id, room_name } = payload;

  console.log('Recording ready:', { recording_id, room_name });

  // Extract consultation ID from room name (format: furrie-{consultationId})
  const consultationId = extractConsultationId(room_name);
  if (!consultationId) {
    console.error('Could not extract consultation ID from room name:', room_name);
    return;
  }

  // Get the recording download link
  let recordingUrl: string | null = null;
  try {
    recordingUrl = await getRecordingLink(recording_id);
  } catch (error) {
    console.error('Failed to get recording link:', error);
  }

  // Update consultation with recording info
  const { error } = await supabaseAdmin
    .from('consultations')
    .update({
      recording_id,
      recording_url: recordingUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', consultationId);

  if (error) {
    console.error('Failed to update consultation with recording:', error);
  } else {
    console.log('Recording info saved for consultation:', consultationId);
  }
}

/**
 * Handle meeting.ended event
 * Updates consultation status to completed if in_progress
 */
async function handleMeetingEnded(payload: {
  room_name: string;
  duration: number;
}) {
  const { room_name, duration } = payload;

  console.log('Meeting ended:', { room_name, duration });

  // Extract consultation ID
  const consultationId = extractConsultationId(room_name);
  if (!consultationId) {
    console.error('Could not extract consultation ID from room name:', room_name);
    return;
  }

  // Fetch current consultation status
  const { data: consultation, error: fetchError } = await supabaseAdmin
    .from('consultations')
    .select('status, started_at, customer_id, pet_id')
    .eq('id', consultationId)
    .single();

  if (fetchError || !consultation) {
    console.error('Failed to fetch consultation:', fetchError);
    return;
  }

  // Only complete if currently active
  if (consultation.status !== 'active') {
    console.log('Consultation not active, skipping status update');
    return;
  }

  // Calculate actual duration in minutes
  const actualDurationMinutes = Math.ceil(duration / 60);

  // Update consultation status to closed with success outcome
  const { error: updateError } = await supabaseAdmin
    .from('consultations')
    .update({
      status: 'closed',
      outcome: 'success',
      ended_at: new Date().toISOString(),
      duration_minutes: actualDurationMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', consultationId);

  if (updateError) {
    console.error('Failed to complete consultation:', updateError);
  } else {
    console.log('Consultation completed:', consultationId);

    // Check Plus subscription for follow-up expiry
    // Plus users get indefinite follow-up, free users get 7 days
    let isPlusUser = false;
    if (consultation.customer_id && consultation.pet_id) {
      try {
        isPlusUser = await checkPlusSubscriptionWithClient(
          supabaseAdmin,
          consultation.customer_id,
          consultation.pet_id
        );
      } catch (subErr) {
        console.error('Failed to check Plus subscription:', subErr);
      }
    }

    const followUpExpiry = calculateThreadExpiry(isPlusUser);

    await supabaseAdmin
      .from('consultations')
      .update({
        follow_up_expires_at: followUpExpiry,
      })
      .eq('id', consultationId);

    console.log(`Follow-up expiry set for ${consultationId}: ${followUpExpiry ?? 'indefinite (Plus user)'}`);
  }
}

/**
 * Handle participant-joined event
 * Updates consultation status to in_progress when both parties join
 */
async function handleParticipantJoined(payload: {
  room_name: string;
  participant_id: string;
  user_id: string;
  joined_at: number;
}) {
  const { room_name, user_id } = payload;

  console.log('Participant joined:', { room_name, user_id });

  // Extract consultation ID
  const consultationId = extractConsultationId(room_name);
  if (!consultationId) {
    return;
  }

  // Note: Status transitions are now handled by the /join endpoint
  // This webhook is primarily for logging and monitoring
  console.log(`Participant ${user_id} joined consultation ${consultationId}`);
}

/**
 * Extract consultation ID from room name
 * Room name format: furrie-{consultationId}
 */
function extractConsultationId(roomName: string): string | null {
  if (!roomName.startsWith('furrie-')) {
    return null;
  }
  return roomName.replace('furrie-', '');
}
