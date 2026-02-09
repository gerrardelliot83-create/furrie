import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getRecordingLink } from '@/lib/daily';
import { createHmac } from 'crypto';

const DAILY_WEBHOOK_SECRET = process.env.DAILY_WEBHOOK_SECRET;

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
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature if secret is configured
    if (DAILY_WEBHOOK_SECRET) {
      const signature = request.headers.get('x-webhook-signature');
      const timestamp = request.headers.get('x-webhook-timestamp');

      if (!signature || !timestamp) {
        console.error('Missing webhook signature headers');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      // Verify signature: HMAC-SHA256(timestamp.rawBody)
      const signaturePayload = `${timestamp}.${rawBody}`;
      const expectedSignature = createHmac('sha256', DAILY_WEBHOOK_SECRET)
        .update(signaturePayload)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
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
}

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
    .select('status, started_at')
    .eq('id', consultationId)
    .single();

  if (fetchError || !consultation) {
    console.error('Failed to fetch consultation:', fetchError);
    return;
  }

  // Only complete if currently in_progress
  if (consultation.status !== 'in_progress') {
    console.log('Consultation not in_progress, skipping status update');
    return;
  }

  // Calculate actual duration in minutes
  const actualDurationMinutes = Math.ceil(duration / 60);

  // Update consultation status
  const { error: updateError } = await supabaseAdmin
    .from('consultations')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      duration_minutes: actualDurationMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', consultationId);

  if (updateError) {
    console.error('Failed to complete consultation:', updateError);
  } else {
    console.log('Consultation completed:', consultationId);

    // Set follow-up expiry (7 days from now for free users)
    // TODO: Check if user has Plus subscription for indefinite follow-up
    const followUpExpiry = new Date();
    followUpExpiry.setDate(followUpExpiry.getDate() + 7);

    await supabaseAdmin
      .from('consultations')
      .update({
        follow_up_expires_at: followUpExpiry.toISOString(),
      })
      .eq('id', consultationId);
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

  // Fetch consultation
  const { data: consultation, error: fetchError } = await supabaseAdmin
    .from('consultations')
    .select('status, customer_id, vet_id, started_at')
    .eq('id', consultationId)
    .single();

  if (fetchError || !consultation) {
    return;
  }

  // If vet joins and status is matched, update to in_progress
  if (consultation.status === 'matched' && user_id === consultation.vet_id) {
    const { error: updateError } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'in_progress',
        started_at: consultation.started_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', consultationId);

    if (updateError) {
      console.error('Failed to start consultation:', updateError);
    } else {
      console.log('Consultation started:', consultationId);
    }
  }
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
