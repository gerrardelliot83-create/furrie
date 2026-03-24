import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendVetWelcomeEmail } from '@/lib/email';
import { verifyAdmin, logAdminAction } from '@/lib/admin/auth';

interface CreateVetBody {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  qualifications: string;
  vciRegistrationNumber: string;
  specializations?: string[];
  yearsOfExperience?: number;
}

/**
 * POST /api/admin/vets
 *
 * Create a vet account in one call:
 * 1. Create auth user with email_confirm: true
 * 2. Update profile: role='vet', full_name, phone
 * 3. Insert vet_profiles row
 */
export async function POST(request: Request) {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const body = (await request.json()) as CreateVetBody;

    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        { error: 'email is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!body.password) {
      return NextResponse.json(
        { error: 'password is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!body.fullName) {
      return NextResponse.json(
        { error: 'fullName is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!body.qualifications) {
      return NextResponse.json(
        { error: 'qualifications is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!body.vciRegistrationNumber) {
      return NextResponse.json(
        { error: 'vciRegistrationNumber is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Step 1: Create auth user (email_confirm: true skips verification email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (authError) {
      // Handle duplicate email
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'A user with this email already exists', code: 'EMAIL_EXISTS' },
          { status: 409 }
        );
      }
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { error: 'Failed to create user account', code: 'AUTH_CREATE_ERROR' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Step 2: Update profile to vet role
    // The handle_new_user() trigger creates a profile with role='customer' by default
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'vet',
        full_name: body.fullName,
        phone: body.phone || null,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Attempt cleanup: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to set up vet profile', code: 'PROFILE_ERROR' },
        { status: 500 }
      );
    }

    // Step 3: Insert vet_profiles row
    const { error: vetProfileError } = await supabaseAdmin
      .from('vet_profiles')
      .insert({
        id: userId,
        qualifications: body.qualifications,
        vci_registration_number: body.vciRegistrationNumber,
        specializations: body.specializations || [],
        years_of_experience: body.yearsOfExperience || null,
        is_verified: true, // Admin-provisioned vets are verified
        is_available: false, // Must set availability schedule first
      });

    if (vetProfileError) {
      console.error('Error creating vet profile:', vetProfileError);
      // Attempt cleanup: delete the auth user (cascades profile)
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create vet profile data', code: 'VET_PROFILE_ERROR' },
        { status: 500 }
      );
    }

    // Send vet welcome email with credentials
    const welcomeEmailResult = await sendVetWelcomeEmail(body.email, {
      vetName: body.fullName,
      email: body.email,
      temporaryPassword: body.password,
    });
    if (!welcomeEmailResult.success) {
      console.error('Failed to send vet welcome email:', welcomeEmailResult.error);
    }

    // Audit log
    await logAdminAction({
      adminId: result.user.id,
      action: 'create_vet',
      targetType: 'vet',
      targetId: userId,
      details: { email: body.email, fullName: body.fullName },
    });

    return NextResponse.json(
      {
        vet: {
          id: userId,
          email: body.email,
          fullName: body.fullName,
          phone: body.phone || null,
          qualifications: body.qualifications,
          vciRegistrationNumber: body.vciRegistrationNumber,
          specializations: body.specializations || [],
          yearsOfExperience: body.yearsOfExperience || null,
          isVerified: true,
          isAvailable: false,
        },
        message: `Vet account created for ${body.fullName} (${body.email}). They can log in at vet.furrie.in.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/vets:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/vets
 *
 * List all vets (profiles + vet_profiles joined).
 */
export async function GET() {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const { data: vets, error } = await supabaseAdmin
      .from('profiles')
      .select(
        `
        id,
        full_name,
        email,
        phone,
        avatar_url,
        is_active,
        created_at,
        vet_profiles (
          qualifications,
          vci_registration_number,
          specializations,
          years_of_experience,
          is_verified,
          is_available,
          consultation_count,
          average_rating
        )
      `
      )
      .eq('role', 'vet')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vets', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ vets: vets || [] });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/vets:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

interface UpdateVetBody {
  vetId: string;
  fullName?: string;
  phone?: string;
  qualifications?: string;
  specializations?: string[];
  yearsOfExperience?: number;
  isVerified?: boolean;
  isAvailable?: boolean;
  isActive?: boolean;
}

/**
 * PATCH /api/admin/vets
 *
 * Update a vet's profile, vet_profiles, or deactivate (soft delete).
 * Body: { vetId, ...fieldsToUpdate }
 */
export async function PATCH(request: Request) {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const body = (await request.json()) as UpdateVetBody;

    if (!body.vetId) {
      return NextResponse.json(
        { error: 'vetId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Verify vet exists
    const { data: vet, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', body.vetId)
      .single();

    if (fetchError || !vet) {
      return NextResponse.json(
        { error: 'Vet not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (vet.role !== 'vet') {
      return NextResponse.json(
        { error: 'User is not a vet', code: 'NOT_VET' },
        { status: 400 }
      );
    }

    // Update profiles table fields
    const profileUpdates: Record<string, unknown> = {};
    if (body.fullName !== undefined) profileUpdates.full_name = body.fullName;
    if (body.phone !== undefined) profileUpdates.phone = body.phone;
    if (body.isActive !== undefined) profileUpdates.is_active = body.isActive;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', body.vetId);

      if (profileError) {
        console.error('Error updating vet profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to update profile', code: 'PROFILE_UPDATE_ERROR' },
          { status: 500 }
        );
      }
    }

    // Update vet_profiles table fields
    const vetProfileUpdates: Record<string, unknown> = {};
    if (body.qualifications !== undefined) vetProfileUpdates.qualifications = body.qualifications;
    if (body.specializations !== undefined) vetProfileUpdates.specializations = body.specializations;
    if (body.yearsOfExperience !== undefined) vetProfileUpdates.years_of_experience = body.yearsOfExperience;
    if (body.isVerified !== undefined) vetProfileUpdates.is_verified = body.isVerified;
    if (body.isAvailable !== undefined) vetProfileUpdates.is_available = body.isAvailable;

    if (Object.keys(vetProfileUpdates).length > 0) {
      const { error: vetError } = await supabaseAdmin
        .from('vet_profiles')
        .update(vetProfileUpdates)
        .eq('id', body.vetId);

      if (vetError) {
        console.error('Error updating vet_profiles:', vetError);
        return NextResponse.json(
          { error: 'Failed to update vet details', code: 'VET_PROFILE_UPDATE_ERROR' },
          { status: 500 }
        );
      }
    }

    // Determine audit action
    const action = body.isActive === false ? 'deactivate_vet' : 'update_vet';
    await logAdminAction({
      adminId: result.user.id,
      action,
      targetType: 'vet',
      targetId: body.vetId,
      details: { ...profileUpdates, ...vetProfileUpdates, email: vet.email },
    });

    return NextResponse.json({
      message: body.isActive === false
        ? `Vet ${vet.full_name} has been deactivated`
        : `Vet ${vet.full_name} updated successfully`,
    });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/admin/vets:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/vets
 *
 * Hard-delete a vet ONLY if they have zero consultations/data.
 * Otherwise returns 409 and suggests deactivation.
 * Body: { vetId }
 */
export async function DELETE(request: Request) {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const body = await request.json();

    if (!body.vetId) {
      return NextResponse.json(
        { error: 'vetId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Verify vet exists
    const { data: vet, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', body.vetId)
      .single();

    if (fetchError || !vet) {
      return NextResponse.json(
        { error: 'Vet not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (vet.role !== 'vet') {
      return NextResponse.json(
        { error: 'User is not a vet', code: 'NOT_VET' },
        { status: 400 }
      );
    }

    // Check for existing data that would block deletion (FK constraints without CASCADE)
    const [consultationsResult, soapNotesResult, prescriptionsResult] = await Promise.all([
      supabaseAdmin
        .from('consultations')
        .select('id', { count: 'exact', head: true })
        .eq('vet_id', body.vetId),
      supabaseAdmin
        .from('soap_notes')
        .select('id', { count: 'exact', head: true })
        .eq('vet_id', body.vetId),
      supabaseAdmin
        .from('prescriptions')
        .select('id', { count: 'exact', head: true })
        .eq('vet_id', body.vetId),
    ]);

    const totalData = (consultationsResult.count || 0) +
      (soapNotesResult.count || 0) +
      (prescriptionsResult.count || 0);

    if (totalData > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete vet with existing data. Use PATCH to deactivate instead.',
          code: 'HAS_DATA',
          details: {
            consultations: consultationsResult.count || 0,
            soapNotes: soapNotesResult.count || 0,
            prescriptions: prescriptionsResult.count || 0,
          },
        },
        { status: 409 }
      );
    }

    // Safe to hard delete — cascades: profiles, vet_profiles, notifications
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(body.vetId);

    if (deleteError) {
      console.error('Error deleting vet:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete vet account', code: 'DELETE_ERROR' },
        { status: 500 }
      );
    }

    await logAdminAction({
      adminId: result.user.id,
      action: 'delete_vet',
      targetType: 'vet',
      targetId: body.vetId,
      details: { email: vet.email, fullName: vet.full_name },
    });

    return NextResponse.json({
      message: `Vet ${vet.full_name} (${vet.email}) has been permanently deleted`,
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/vets:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
