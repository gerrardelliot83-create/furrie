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
    // 1. Prescriptions (references consultations)
    await supabaseAdmin
      .from('prescriptions')
      .delete()
      .in('vet_id', vetIds);

    // 2. SOAP notes (references consultations)
    await supabaseAdmin
      .from('soap_notes')
      .delete()
      .in('vet_id', vetIds);

    // 3. Consultation ratings (references consultations)
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
    }

    // 4. Consultations
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
