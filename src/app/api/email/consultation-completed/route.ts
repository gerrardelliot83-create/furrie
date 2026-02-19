import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendConsultationCompletedEmail } from '@/lib/email';

/**
 * POST /api/email/consultation-completed
 * Send consultation completed email to customer
 * Called from SOAPForm after vet completes consultation
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { consultationId } = await request.json();

    if (!consultationId) {
      return NextResponse.json(
        { error: 'consultationId required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    // Fetch consultation with customer and pet details
    const { data: consultation } = await supabaseAdmin
      .from('consultations')
      .select('id, customer_id, vet_id, pet_id')
      .eq('id', consultationId)
      .single();

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Fetch customer, vet, and pet details in parallel
    const [customerResult, vetResult, petResult] = await Promise.all([
      supabaseAdmin.from('profiles').select('email, full_name').eq('id', consultation.customer_id).single(),
      supabaseAdmin.from('profiles').select('full_name').eq('id', consultation.vet_id).single(),
      supabaseAdmin.from('pets').select('name').eq('id', consultation.pet_id).single(),
    ]);

    const customerEmail = customerResult.data?.email;
    if (!customerEmail) {
      return NextResponse.json({ success: false, reason: 'no_email' });
    }

    const result = await sendConsultationCompletedEmail(customerEmail, {
      customerName: customerResult.data?.full_name || 'there',
      petName: petResult.data?.name || 'your pet',
      vetName: vetResult.data?.full_name || 'your vet',
      consultationId,
    });

    // Create in-app notification for consultation completion
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: consultation.customer_id,
        type: 'consultation_completed',
        title: 'Consultation Completed',
        message: `Your consultation for ${petResult.data?.name || 'your pet'} with Dr. ${vetResult.data?.full_name || 'your vet'} has been completed. Follow-up chat is now available.`,
        data: { consultationId },
      });
    } catch (notifyErr) {
      console.error('Failed to create completion notification:', notifyErr);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: 'EMAIL_SEND_FAILED' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Error sending completed email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', code: 'EMAIL_ERROR' },
      { status: 500 }
    );
  }
}
