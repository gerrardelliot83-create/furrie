import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdmin, logAdminAction } from '@/lib/admin/auth';

/**
 * POST /api/admin/vets/cleanup
 *
 * Force-remove ALL vets and their related data.
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

    // All tables with non-CASCADE FK references to profiles(id)
    // Delete in dependency order (children first)
    const deletionSteps = [
      // Messages before threads (thread_id CASCADE but sender_id not)
      { table: 'follow_up_messages', column: 'sender_id' },
      // Leaf tables first
      { table: 'ai_quality_assessments', column: 'vet_id' },
      { table: 'follow_up_threads', column: 'vet_id' },
      { table: 'prescriptions', column: 'vet_id' },
      { table: 'soap_notes', column: 'vet_id' },
      { table: 'consultation_ratings', column: 'vet_id' },
      { table: 'consultation_flags', column: 'flagged_by' },
      { table: 'consultation_flags', column: 'resolved_by' },
      { table: 'vaccination_schedules', column: 'vet_id' },
      { table: 'vaccination_schedules', column: 'approved_by' },
      { table: 'incidents', column: 'reported_by' },
      { table: 'incidents', column: 'resolved_by' },
      { table: 'payments', column: 'refunded_by' },
      { table: 'sachet_codes', column: 'redeemed_by' },
      { table: 'pricing_config', column: 'created_by' },
      { table: 'consultations', column: 'vet_id' },
    ];

    // Also clean up consultation_ratings and consultation_flags by consultation_id
    const { data: consultations } = await supabaseAdmin
      .from('consultations')
      .select('id')
      .in('vet_id', vetIds);

    if (consultations && consultations.length > 0) {
      const consultationIds = consultations.map((c) => c.id);
      await supabaseAdmin.from('consultation_ratings').delete().in('consultation_id', consultationIds);
      await supabaseAdmin.from('consultation_flags').delete().in('consultation_id', consultationIds);
    }

    // Execute all deletion steps
    const stepResults: { table: string; column: string; error?: string }[] = [];
    for (const step of deletionSteps) {
      const { error } = await supabaseAdmin
        .from(step.table)
        .delete()
        .in(step.column, vetIds);
      stepResults.push({
        table: step.table,
        column: step.column,
        error: error?.message,
      });
    }

    // Now delete the vet_profiles rows explicitly (in case CASCADE doesn't fire)
    await supabaseAdmin.from('vet_profiles').delete().in('id', vetIds);

    // Delete profiles rows explicitly before auth deletion
    // This removes the FK target so no other table can reference it
    await supabaseAdmin.from('profiles').delete().in('id', vetIds);

    // Finally delete auth users
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
      details: { count: vets.length, vets: deleteResults, stepResults },
    });

    const successCount = deleteResults.filter((r) => r.success).length;
    const failedSteps = stepResults.filter((s) => s.error);

    return NextResponse.json({
      message: `Removed ${successCount} of ${vets.length} vets`,
      removed: successCount,
      details: deleteResults,
      ...(failedSteps.length > 0 && { failedSteps }),
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/vets/cleanup:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
