import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdmin, logAdminAction } from '@/lib/admin/auth';

/**
 * POST /api/admin/vets/cleanup
 *
 * Force-remove ALL vets and their related data (consultations, SOAP notes, prescriptions).
 * This is a destructive operation intended for platform reset/testing.
 * Requires admin authentication.
 */
export async function POST() {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    // Fetch all vet user IDs
    const { data: vets, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'vet');

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch vets', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    if (!vets || vets.length === 0) {
      return NextResponse.json({ message: 'No vets found to remove', removed: 0 });
    }

    const vetIds = vets.map((v) => v.id);

    // Delete related data first (order matters for FK constraints)
    // 1. Follow-up messages (sender_id references profiles, no CASCADE)
    await supabaseAdmin
      .from('follow_up_messages')
      .delete()
      .in('sender_id', vetIds);

    // 2. AI quality assessments
    await supabaseAdmin
      .from('ai_quality_assessments')
      .delete()
      .in('vet_id', vetIds);

    // 3. Follow-up threads
    await supabaseAdmin
      .from('follow_up_threads')
      .delete()
      .in('vet_id', vetIds);

    // 4. Prescriptions
    await supabaseAdmin
      .from('prescriptions')
      .delete()
      .in('vet_id', vetIds);

    // 5. SOAP notes
    await supabaseAdmin
      .from('soap_notes')
      .delete()
      .in('vet_id', vetIds);

    // 6. Consultation ratings (by vet_id and by consultation_id)
    await supabaseAdmin
      .from('consultation_ratings')
      .delete()
      .in('vet_id', vetIds);

    const { data: consultations } = await supabaseAdmin
      .from('consultations')
      .select('id')
      .in('vet_id', vetIds);

    if (consultations && consultations.length > 0) {
      const consultationIds = consultations.map((c) => c.id);
      await supabaseAdmin
        .from('consultation_ratings')
        .delete()
        .in('consultation_id', consultationIds);

      // 7. Consultation flags by consultation
      await supabaseAdmin
        .from('consultation_flags')
        .delete()
        .in('consultation_id', consultationIds);
    }

    // 8. Consultation flags where vet flagged/resolved
    await supabaseAdmin
      .from('consultation_flags')
      .delete()
      .in('flagged_by', vetIds);
    await supabaseAdmin
      .from('consultation_flags')
      .delete()
      .in('resolved_by', vetIds);

    // 9. Vaccination schedules
    await supabaseAdmin
      .from('vaccination_schedules')
      .delete()
      .in('vet_id', vetIds);
    await supabaseAdmin
      .from('vaccination_schedules')
      .delete()
      .in('approved_by', vetIds);

    // 10. Incidents where vet is referenced
    await supabaseAdmin
      .from('incidents')
      .delete()
      .in('reported_by', vetIds);
    await supabaseAdmin
      .from('incidents')
      .delete()
      .in('resolved_by', vetIds);

    // 11. Consultations
    await supabaseAdmin
      .from('consultations')
      .delete()
      .in('vet_id', vetIds);

    // 5. Delete auth users (cascades to profiles -> vet_profiles)
    const deleteResults = [];
    for (const vet of vets) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(vet.id);
      deleteResults.push({
        id: vet.id,
        email: vet.email,
        fullName: vet.full_name,
        success: !deleteError,
        error: deleteError?.message,
      });
    }

    await logAdminAction({
      adminId: result.user.id,
      action: 'bulk_delete_vets',
      targetType: 'vet',
      targetId: 'all',
      details: { count: vets.length, vets: deleteResults },
    });

    const successCount = deleteResults.filter((r) => r.success).length;

    return NextResponse.json({
      message: `Removed ${successCount} of ${vets.length} vets and all related data`,
      removed: successCount,
      details: deleteResults,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/vets/cleanup:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
