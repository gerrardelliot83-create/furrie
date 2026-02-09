import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/cron/reassign-stale
 *
 * Vercel Cron job that runs every minute to handle stale matched consultations.
 * A consultation is "stale" if it has been in 'matched' status for more than 30 seconds
 * without the vet accepting.
 *
 * Actions:
 * 1. Find another available vet and reassign
 * 2. If no vets available, mark as 'no_vet_available' and notify customer
 *
 * Configuration in vercel.json:
 * { "crons": [{ "path": "/api/cron/reassign-stale", "schedule": "* * * * *" }] }
 */
export async function GET(request: Request) {
  // Verify cron secret (set in Vercel environment)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // In development, allow without secret for testing
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();

  // Find stale matched consultations (not accepted within 30 seconds)
  const { data: staleConsultations, error } = await supabaseAdmin
    .from('consultations')
    .select('id, vet_id, customer_id, is_priority, concern_text, symptom_categories, pet_id')
    .eq('status', 'matched')
    .lt('updated_at', thirtySecondsAgo);

  if (error) {
    console.error('Failed to fetch stale consultations:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  if (!staleConsultations || staleConsultations.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const results: Array<{
    id: string;
    action: 'reassigned' | 'no_vet_available';
    newVetId?: string;
  }> = [];

  for (const consultation of staleConsultations) {
    // Get list of vets who have already been assigned (to exclude)
    // For now, just exclude the current vet
    const excludedVetIds = consultation.vet_id ? [consultation.vet_id] : [];

    // Query for another available vet
    let availableVetsQuery = supabaseAdmin
      .from('vet_profiles')
      .select('id, profiles!vet_profiles_id_fkey(full_name)')
      .eq('is_verified', true)
      .eq('is_available', true);

    if (excludedVetIds.length > 0) {
      availableVetsQuery = availableVetsQuery.not('id', 'in', `(${excludedVetIds.join(',')})`);
    }

    const { data: availableVets } = await availableVetsQuery;

    // Filter out vets who are currently in active calls
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    let newVet: { id: string } | null = null;

    for (const vet of availableVets || []) {
      // Check if this vet is already in an active consultation
      const { data: activeCall } = await supabaseAdmin
        .from('consultations')
        .select('id')
        .eq('vet_id', vet.id)
        .in('status', ['matched', 'accepted', 'in_progress'])
        .gte('updated_at', fiveMinAgo)
        .maybeSingle();

      if (!activeCall) {
        newVet = vet;
        break;
      }
    }

    if (newVet) {
      // Reassign to new vet
      const { error: reassignError } = await supabaseAdmin
        .from('consultations')
        .update({
          vet_id: newVet.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', consultation.id)
        .eq('status', 'matched'); // Only if still matched (optimistic lock)

      if (reassignError) {
        console.error(`Failed to reassign consultation ${consultation.id}:`, reassignError);
        continue;
      }

      // Send notification to new vet
      // Get pet info for the notification
      const { data: petInfo } = await supabaseAdmin
        .from('pets')
        .select('name, species, breed')
        .eq('id', consultation.pet_id)
        .single();

      const { data: customerInfo } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', consultation.customer_id)
        .single();

      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: newVet.id,
          type: 'consultation_request',
          title: 'Incoming Consultation (Reassigned)',
          body: consultation.concern_text || 'General consultation',
          channel: 'in_app',
          data: {
            consultationId: consultation.id,
            petName: petInfo?.name || 'Pet',
            petSpecies: petInfo?.species || 'unknown',
            petBreed: petInfo?.breed || 'unknown',
            customerName: customerInfo?.full_name || 'Pet Parent',
            symptoms: consultation.symptom_categories || [],
            isPriority: consultation.is_priority,
          },
        });

      results.push({ id: consultation.id, action: 'reassigned', newVetId: newVet.id });
      console.log(`Consultation ${consultation.id} reassigned to vet ${newVet.id}`);
    } else {
      // No vets available - update status
      const { error: updateError } = await supabaseAdmin
        .from('consultations')
        .update({
          status: 'no_vet_available',
          updated_at: new Date().toISOString(),
        })
        .eq('id', consultation.id)
        .eq('status', 'matched'); // Only if still matched

      if (updateError) {
        console.error(`Failed to mark consultation ${consultation.id} as no_vet_available:`, updateError);
        continue;
      }

      // Notify customer
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: consultation.customer_id,
          type: 'no_vet_available',
          title: 'No vets available',
          body: 'All veterinarians are currently busy. Would you like to schedule an appointment?',
          channel: 'in_app',
          data: { consultationId: consultation.id },
        });

      results.push({ id: consultation.id, action: 'no_vet_available' });
      console.log(`Consultation ${consultation.id} marked as no_vet_available`);
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
