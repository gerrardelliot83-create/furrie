import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { UTApi } from 'uploadthing/server';
import { createClient } from '@/lib/supabase/server';
import { PrescriptionPDF } from '@/components/vet/PrescriptionPDF';
import { sendPrescriptionEmail } from '@/lib/email';
import {
  formatPrescriptionDate,
  generatePrescriptionNumber,
  type PrescriptionData,
} from '@/lib/prescriptions/template';

const utapi = new UTApi();

// POST /api/prescriptions/generate-pdf - Generate prescription PDF
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
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

    // Verify user is a vet
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, phone')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'vet') {
      return NextResponse.json(
        { error: 'Unauthorized - Vet access required', code: 'VET_REQUIRED' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { consultationId } = body;

    if (!consultationId) {
      return NextResponse.json(
        { error: 'Missing consultationId', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Fetch consultation with all related data
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select(`
        *,
        pets!consultations_pet_id_fkey (
          id,
          name,
          species,
          breed,
          date_of_birth,
          approximate_age_months,
          weight_kg
        ),
        profiles!consultations_customer_id_fkey (
          id,
          full_name,
          phone
        )
      `)
      .eq('id', consultationId)
      .eq('vet_id', user.id)
      .single();

    if (consultationError || !consultation) {
      return NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Fetch vet profile details
    const { data: vetProfile } = await supabase
      .from('vet_profiles')
      .select('qualifications, vci_registration_number, specializations')
      .eq('id', user.id)
      .single();

    // Fetch SOAP notes
    const { data: soapNote } = await supabase
      .from('soap_notes')
      .select('*')
      .eq('consultation_id', consultationId)
      .single();

    if (!soapNote) {
      return NextResponse.json(
        { error: 'SOAP notes not found. Please complete SOAP notes first.', code: 'SOAP_REQUIRED' },
        { status: 400 }
      );
    }

    // Calculate pet age
    const pet = consultation.pets;
    let petAge = 'Unknown';
    if (pet?.date_of_birth) {
      const birthDate = new Date(pet.date_of_birth);
      const now = new Date();
      const years = now.getFullYear() - birthDate.getFullYear();
      const months = now.getMonth() - birthDate.getMonth();
      if (years > 0) {
        petAge = `${years} year${years > 1 ? 's' : ''}`;
        if (months > 0) {
          petAge += ` ${months} month${months > 1 ? 's' : ''}`;
        }
      } else if (months > 0) {
        petAge = `${months} month${months > 1 ? 's' : ''}`;
      }
    } else if (pet?.approximate_age_months) {
      const months = pet.approximate_age_months;
      if (months >= 12) {
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        petAge = `${years} year${years > 1 ? 's' : ''}`;
        if (remainingMonths > 0) {
          petAge += ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
        }
      } else {
        petAge = `${months} month${months > 1 ? 's' : ''}`;
      }
    }

    // Generate prescription number
    const prescriptionNumber = generatePrescriptionNumber();

    // Build prescription data
    const prescriptionData: PrescriptionData = {
      prescriptionNumber,
      date: formatPrescriptionDate(new Date()),
      vetName: profile.full_name || 'Unknown',
      vciNumber: vetProfile?.vci_registration_number || 'N/A',
      qualifications: vetProfile?.qualifications || 'BVSc',
      specializations: vetProfile?.specializations || [],
      petName: pet?.name || 'Unknown',
      petSpecies: pet?.species || 'dog',
      petBreed: pet?.breed || 'Unknown',
      petAge,
      petWeight: pet?.weight_kg?.toString() || soapNote.vital_signs?.weight?.toString() || '',
      ownerName: consultation.profiles?.full_name || 'Unknown',
      ownerPhone: consultation.profiles?.phone || 'N/A',
      diagnosis: soapNote.provisional_diagnosis || 'N/A',
      medications: (soapNote.medications || []).map((med: {
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions: string;
      }) => ({
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions,
      })),
      recommendations: [
        soapNote.dietary_recommendations,
        soapNote.lifestyle_modifications,
        soapNote.home_care_instructions,
      ]
        .filter(Boolean)
        .join('\n\n'),
      warnings: soapNote.warning_signs || '',
      consultationId,
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      PrescriptionPDF({ data: prescriptionData })
    );

    // Upload PDF to UploadThing using UTApi (server-side upload)
    let pdfUrl = '';
    try {
      // Convert Buffer to Uint8Array for File constructor compatibility
      const uint8Array = new Uint8Array(pdfBuffer);
      const file = new File(
        [uint8Array],
        `prescription-${prescriptionNumber}.pdf`,
        { type: 'application/pdf' }
      );
      const uploadResponse = await utapi.uploadFiles([file]);

      if (uploadResponse[0]?.data?.ufsUrl) {
        pdfUrl = uploadResponse[0].data.ufsUrl;
        console.log('Prescription PDF uploaded:', pdfUrl);
      }
    } catch (uploadError) {
      console.error('Failed to upload prescription PDF:', uploadError);
      // Continue - we can still return the PDF directly
    }

    // Save prescription record to database with pdf_url
    const { error: saveError } = await supabase
      .from('prescriptions')
      .insert({
        consultation_id: consultationId,
        vet_id: user.id,
        prescription_number: prescriptionNumber,
        pdf_url: pdfUrl,
        medications: soapNote.medications || [],
        diagnosis: soapNote.provisional_diagnosis,
        recommendations: prescriptionData.recommendations,
        warnings: prescriptionData.warnings,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving prescription:', saveError);
      // Continue anyway - we can still return the PDF
    }

    // Fetch customer email and send prescription email
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', consultation.customer_id)
      .single();

    if (customerProfile?.email) {
      try {
        await sendPrescriptionEmail({
          customerEmail: customerProfile.email,
          customerName: customerProfile.full_name || 'Pet Parent',
          petName: pet?.name || 'your pet',
          vetName: profile.full_name || 'Your Veterinarian',
          prescriptionNumber,
          pdfBuffer: Buffer.from(pdfBuffer),
        });
        console.log('Prescription email sent to:', customerProfile.email);
      } catch (emailError) {
        console.error('Failed to send prescription email:', emailError);
        // Don't fail - PDF was generated and uploaded successfully
      }
    }

    // Return PDF as response for vet download
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer);
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="prescription-${prescriptionNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/prescriptions/generate-pdf:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
