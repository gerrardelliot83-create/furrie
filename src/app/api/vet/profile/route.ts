import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';

/**
 * GET /api/vet/profile
 *
 * Returns the authenticated vet's profile + vet_profiles data.
 */
export async function GET() {
  try {
    const { user, error: authError, supabase } = await getRequestUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Fetch profile + vet_profiles in one query
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id, full_name, email, phone, avatar_url, role, created_at,
        vet_profiles (
          qualifications, vci_registration_number, state_council_registration,
          specializations, years_of_experience, degree_certificate_url,
          is_verified, is_available, availability_schedule,
          consultation_count, average_rating
        )
      `)
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Profile not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (profile.role !== 'vet') {
      return NextResponse.json(
        { error: 'Not a vet account', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in GET /api/vet/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/vet/profile
 *
 * Update the vet's editable profile fields.
 * Vets can update: full_name, phone, avatar_url, specializations, years_of_experience
 * They CANNOT change: qualifications, vci_registration_number (admin-managed)
 */
export async function PATCH(request: Request) {
  try {
    const { user, error: authError, supabase } = await getRequestUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Verify vet role
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!existingProfile || existingProfile.role !== 'vet') {
      return NextResponse.json(
        { error: 'Not a vet account', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Update profiles table (name, phone, avatar)
    const profileUpdate: Record<string, unknown> = {};
    if (body.fullName !== undefined) {
      const trimmed = body.fullName?.trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: 'Full name cannot be empty', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      profileUpdate.full_name = trimmed;
    }
    if (body.phone !== undefined) {
      const phone = body.phone?.trim() || null;
      if (phone && !/^[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ''))) {
        return NextResponse.json(
          { error: 'Please enter a valid 10-digit Indian mobile number', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      profileUpdate.phone = phone;
    }
    if (body.avatarUrl !== undefined) {
      profileUpdate.avatar_url = body.avatarUrl || null;
    }

    // Update vet_profiles table (specializations, years_of_experience)
    const vetUpdate: Record<string, unknown> = {};
    if (body.specializations !== undefined) {
      if (!Array.isArray(body.specializations)) {
        return NextResponse.json(
          { error: 'Specializations must be an array', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      vetUpdate.specializations = body.specializations;
    }
    if (body.yearsOfExperience !== undefined) {
      const years = Number(body.yearsOfExperience);
      if (body.yearsOfExperience !== null && (isNaN(years) || years < 0 || years > 60)) {
        return NextResponse.json(
          { error: 'Years of experience must be between 0 and 60', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      vetUpdate.years_of_experience = body.yearsOfExperience === null ? null : years;
    }

    if (Object.keys(profileUpdate).length === 0 && Object.keys(vetUpdate).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Perform updates
    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to update profile', code: 'UPDATE_ERROR' },
          { status: 500 }
        );
      }
    }

    if (Object.keys(vetUpdate).length > 0) {
      const { error: vetError } = await supabase
        .from('vet_profiles')
        .update(vetUpdate)
        .eq('id', user.id);

      if (vetError) {
        console.error('Error updating vet profile:', vetError);
        return NextResponse.json(
          { error: 'Failed to update vet profile', code: 'UPDATE_ERROR' },
          { status: 500 }
        );
      }
    }

    // Return updated profile
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select(`
        id, full_name, email, phone, avatar_url, role, created_at,
        vet_profiles (
          qualifications, vci_registration_number, state_council_registration,
          specializations, years_of_experience, degree_certificate_url,
          is_verified, is_available, availability_schedule,
          consultation_count, average_rating
        )
      `)
      .eq('id', user.id)
      .single();

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Error in PATCH /api/vet/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
