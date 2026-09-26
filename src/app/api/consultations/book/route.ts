import { NextResponse, after } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getRequestUser } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications/createNotification';
import { sendExpoPush } from '@/lib/notifications/sendExpoPush';
import { findAvailableVetForSlot, SCHEDULING_CONSTANTS } from '@/lib/scheduling';
import { checkPlusSubscriptionWithClient } from '@/lib/utils/followUpHelpers';
import { countUsableCredits, scheduleConsultationWithCredit } from '@/lib/credits/usableCredits';
import {
  sendBookingConfirmationEmail,
  sendVetNewBookingEmail,
  sendOpsBookingAlert,
} from '@/lib/email';
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from '@/lib/utils/rate-limit';
import { formatScheduledTimeShort } from '@/lib/utils';
import { withRoute } from '@/server/handler';

interface MediaUploadRef {
  url: string;
  mediaType: 'photo' | 'video' | 'document';
  fileName?: string;
  fileSizeBytes?: number;
}

interface BookRequest {
  petId: string;
  scheduledAt: string; // ISO datetime string
  concernText?: string;
  symptomCategories?: string[];
  media?: MediaUploadRef[];
}

const NO_CREDITS_RESPONSE = {
  error: 'You need a consultation credit to book. Buy consultations from your dashboard, then book.',
  code: 'NO_CREDITS',
} as const;

/** Unique-violation constraint names on consultations (production, 2026-09-24). */
const SLOT_CONSTRAINT = 'idx_consultations_no_double_booking';
const NUMBER_CONSTRAINT = 'consultations_consultation_number_key';

/**
 * POST /api/consultations/book
 *
 * Books a consultation for a specific time slot. A consultation credit is
 * required (L1, 2026-09-25): there is no pay-later path any more.
 *
 * Flow:
 * 1. Validate the request, the time and pet ownership
 * 2. No usable credit (and not Plus) → 402 NO_CREDITS, before any slot is
 *    held or any vet is notified
 * 3. Find an available vet for the slot
 * 4. Insert the consultation as 'pending', then take one credit and move it
 *    to 'scheduled' in a single database transaction
 *    (l1_schedule_with_credit). If that finds no credit (a race with another
 *    booking), the pending row is removed and the answer is 402.
 * 5. Notify the vet in-app now; emails, push and the ops alert run after the
 *    response is sent.
 *
 * Request:
 * {
 *   petId: "uuid",
 *   scheduledAt: "2026-02-09T10:00:00+05:30",
 *   concernText?: "My dog has been vomiting",
 *   symptomCategories?: ["vomiting", "loss_of_appetite"]
 * }
 *
 * Response (shape kept for the mobile app):
 * {
 *   consultation: { id, consultationNumber, status: "scheduled", type, scheduledAt, pet, vet, ... },
 *   isPlusUser, hasPackCredit, packCreditsRemaining
 * }
 */
export const POST = withRoute(async function POST(request: Request) {
  try {
    // Rate limit: 10 booking requests per minute per IP
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`book:${ip}`, RATE_LIMITS.payment);
    if (!rateCheck.success) {
      return rateLimitResponse(rateCheck.resetAt);
    }

    const { user, error: authError, supabase } = await getRequestUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as BookRequest;

    // Validate required fields
    if (!body.petId) {
      return NextResponse.json(
        { error: 'Pet ID is required', code: 'MISSING_PET_ID' },
        { status: 400 }
      );
    }

    if (!body.scheduledAt) {
      return NextResponse.json(
        { error: 'Scheduled time is required', code: 'MISSING_SCHEDULED_AT' },
        { status: 400 }
      );
    }

    // Validate scheduled time
    const scheduledTime = new Date(body.scheduledAt);
    if (isNaN(scheduledTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduled time format', code: 'INVALID_SCHEDULED_AT' },
        { status: 400 }
      );
    }

    const now = new Date();
    const timeDiff = scheduledTime.getTime() - now.getTime();

    // Check minimum lead time (15 minutes)
    if (timeDiff < SCHEDULING_CONSTANTS.MIN_LEAD_TIME_MS) {
      return NextResponse.json(
        {
          error: 'Appointments must be booked at least 15 minutes in advance',
          code: 'TOO_SOON',
        },
        { status: 400 }
      );
    }

    // Check maximum booking window (7 days)
    const maxBookingWindow = 7 * 24 * 60 * 60 * 1000;
    if (timeDiff > maxBookingWindow) {
      return NextResponse.json(
        {
          error: 'Appointments can only be booked up to 7 days in advance',
          code: 'TOO_FAR',
        },
        { status: 400 }
      );
    }

    // Verify pet belongs to customer
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, name, species, breed, owner_id')
      .eq('id', body.petId)
      .single();

    if (petError || !pet) {
      return NextResponse.json(
        { error: 'Pet not found', code: 'PET_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (pet.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this pet', code: 'NOT_PET_OWNER' },
        { status: 403 }
      );
    }

    // Plus subscribers book without credits (affects vet ranking too).
    const isPlusUser = await checkPlusSubscriptionWithClient(supabase, user.id, body.petId);

    // A credit is required. Checked before vet matching so a customer
    // without one never holds a vet's slot or triggers a vet notification.
    let creditsBefore = 0;
    if (!isPlusUser) {
      creditsBefore = await countUsableCredits(supabaseAdmin, user.id);
      if (creditsBefore < 1) {
        return NextResponse.json(NO_CREDITS_RESPONSE, { status: 402 });
      }
    }

    // Find an available vet for this slot with load balancing + Plus priority
    const vetId = await findAvailableVetForSlot(body.scheduledAt, [], isPlusUser);

    if (!vetId) {
      return NextResponse.json(
        {
          error: 'No vets available for this time slot. Please choose a different time.',
          code: 'NO_VET_AVAILABLE',
        },
        { status: 409 }
      );
    }

    // Plus: scheduled straight away. Credit: 'pending' until the credit is
    // taken in the same transaction that confirms it.
    const initialStatus = isPlusUser ? 'scheduled' : 'pending';
    const insertRow = {
      customer_id: user.id,
      vet_id: vetId,
      pet_id: body.petId,
      type: 'scheduled',
      status: initialStatus,
      scheduled_at: body.scheduledAt,
      concern_text: body.concernText || null,
      symptom_categories: body.symptomCategories || [],
      duration_minutes: 30,
      is_priority: isPlusUser,
      is_free: true,
    };
    const selectCols =
      'id, consultation_number, status, type, scheduled_at, concern_text, symptom_categories, created_at';

    // generate_consultation_number() can hand two same-day bookings the same
    // number; that collision is retried, a slot collision is not.
    let consultation: {
      id: string;
      consultation_number: string;
      status: string;
      type: string;
      scheduled_at: string;
      concern_text: string | null;
      symptom_categories: string[] | null;
      created_at: string;
    } | null = null;
    for (let attempt = 1; attempt <= 3 && !consultation; attempt++) {
      const { data, error: createError } = await supabaseAdmin
        .from('consultations')
        .insert(insertRow)
        .select(selectCols)
        .single();

      if (!createError && data) {
        consultation = data;
        break;
      }

      const message = `${createError?.message ?? ''} ${createError?.details ?? ''}`;
      if (createError?.code === '23505' && message.includes(NUMBER_CONSTRAINT) && attempt < 3) {
        continue;
      }
      if (createError?.code === '23505' && (message.includes(SLOT_CONSTRAINT) || !message.includes(NUMBER_CONSTRAINT))) {
        return NextResponse.json(
          {
            error: 'This time slot was just booked by someone else. Please choose a different time.',
            code: 'SLOT_TAKEN',
          },
          { status: 409 }
        );
      }
      console.error('Error creating consultation:', createError);
      return NextResponse.json(
        { error: 'Failed to create consultation', code: 'CREATE_ERROR' },
        { status: 500 }
      );
    }

    if (!consultation) {
      return NextResponse.json(
        { error: 'Failed to create consultation', code: 'CREATE_ERROR' },
        { status: 500 }
      );
    }

    if (!isPlusUser) {
      let packId: string | null = null;
      try {
        packId = await scheduleConsultationWithCredit(supabaseAdmin, user.id, consultation.id);
      } catch (creditErr) {
        // Nothing was changed by the failed transaction; remove the pending row.
        Sentry.captureException(creditErr, { tags: { area: 'booking', step: 'schedule_with_credit' } });
        await supabaseAdmin.from('consultations').delete().eq('id', consultation.id).eq('status', 'pending');
        return NextResponse.json(
          { error: 'Failed to confirm the booking. Please try again.', code: 'CREDIT_ERROR' },
          { status: 500 }
        );
      }

      if (!packId) {
        // Another booking took the last credit between our check and now.
        await supabaseAdmin.from('consultations').delete().eq('id', consultation.id).eq('status', 'pending');
        return NextResponse.json(NO_CREDITS_RESPONSE, { status: 402 });
      }
      consultation.status = 'scheduled';
    }

    // Get vet + customer profiles for notifications and the response
    const [{ data: vetProfile }, { data: customerProfile }] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, full_name, avatar_url, email, expo_push_token').eq('id', vetId).single(),
      supabaseAdmin.from('profiles').select('email, full_name').eq('id', user.id).single(),
    ]);

    // Realtime broadcast to the vet (Broadcast, not postgres_changes)
    try {
      const channel = supabaseAdmin.channel(`vet:${vetId}:notifications`);
      await channel.send({
        type: 'broadcast',
        event: 'new_consultation',
        payload: {
          consultationId: consultation.id,
          petName: pet.name,
          scheduledAt: body.scheduledAt,
        },
      });
      await supabaseAdmin.removeChannel(channel);
    } catch (notifyError) {
      console.error('Failed to send vet notification:', notifyError);
    }

    // Save uploaded media if any
    if (body.media && body.media.length > 0) {
      try {
        const mediaInserts = body.media.map((m) => ({
          consultation_id: consultation.id,
          uploaded_by: user.id,
          media_type: m.mediaType,
          url: m.url,
          file_name: m.fileName || null,
          file_size_bytes: m.fileSizeBytes || null,
        }));
        await supabaseAdmin.from('consultation_media').insert(mediaInserts);
      } catch (mediaErr) {
        console.error('Failed to save consultation media:', mediaErr);
      }
    }

    // Everything else runs after the response has been sent.
    const booked = consultation;
    after(async () => {
      const tasks: Promise<unknown>[] = [];

      tasks.push(
        createNotification({
          user_id: vetId,
          type: 'new_consultation_request',
          title: 'New consultation booked',
          body: `${pet.name} · scheduled ${formatScheduledTimeShort(body.scheduledAt)}`,
          channel: 'in_app',
          data: {
            consultationId: booked.id,
            deepLink: `/consultation/${booked.id}`,
            petId: pet.id,
            petName: pet.name,
            scheduledAt: booked.scheduled_at,
          },
        }),
        createNotification({
          user_id: user.id,
          type: 'booking_confirmation',
          title: 'Booking Confirmed',
          body: `Your consultation for ${pet.name} has been booked.`,
          channel: 'in_app',
          data: { consultationId: booked.id },
        })
      );

      if (customerProfile?.email) {
        tasks.push(
          sendBookingConfirmationEmail(customerProfile.email, {
            customerName: customerProfile.full_name || 'there',
            petName: pet.name,
            vetName: vetProfile?.full_name || 'Your Vet',
            scheduledAt: body.scheduledAt,
            consultationNumber: booked.consultation_number,
          })
        );
      }

      if (vetProfile?.email) {
        tasks.push(
          sendVetNewBookingEmail(vetProfile.email, {
            vetName: vetProfile.full_name || 'Doctor',
            customerName: customerProfile?.full_name || 'Customer',
            petName: pet.name,
            petSpecies: pet.species,
            scheduledAt: body.scheduledAt,
            consultationNumber: booked.consultation_number,
            isPriority: isPlusUser,
          })
        );
      }

      if (vetProfile?.expo_push_token) {
        tasks.push(
          sendExpoPush(vetId, {
            to: vetProfile.expo_push_token,
            title: 'New consultation booked',
            body: `${pet.name} · ${customerProfile?.full_name || 'Customer'} · ${formatScheduledTimeShort(body.scheduledAt)}`,
            data: {
              consultationId: booked.id,
              deepLink: `/consultation/${booked.id}`,
              type: 'new_consultation_request',
              scheduledAt: booked.scheduled_at,
              petName: pet.name,
            },
          })
        );
      }

      tasks.push(
        sendOpsBookingAlert({
          consultationNumber: booked.consultation_number,
          scheduledAt: body.scheduledAt,
          petName: pet.name,
          petSpecies: pet.species,
          customerName: customerProfile?.full_name || 'Customer',
          customerEmail: customerProfile?.email ?? null,
          vetName: vetProfile?.full_name || 'Vet',
        })
      );

      const results = await Promise.allSettled(tasks);
      for (const r of results) {
        if (r.status === 'rejected') {
          console.error('[book] post-booking task failed:', r.reason);
        } else if (r.value && typeof r.value === 'object' && 'success' in r.value && r.value.success === false) {
          console.error('[book] post-booking email failed:', (r.value as { error?: string }).error);
        }
      }
    });

    return NextResponse.json({
      consultation: {
        id: booked.id,
        consultationNumber: booked.consultation_number,
        status: booked.status,
        type: booked.type,
        scheduledAt: booked.scheduled_at,
        concernText: booked.concern_text,
        symptomCategories: booked.symptom_categories,
        createdAt: booked.created_at,
        pet: {
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
        },
        vet: vetProfile
          ? {
              id: vetProfile.id,
              name: vetProfile.full_name,
              avatarUrl: vetProfile.avatar_url,
            }
          : null,
      },
      isPlusUser,
      hasPackCredit: !isPlusUser,
      packCreditsRemaining: isPlusUser ? 0 : Math.max(0, creditsBefore - 1),
    });
  } catch (error) {
    console.error('Error in POST /api/consultations/book:', error);
    return NextResponse.json(
      { error: 'Failed to book consultation', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
