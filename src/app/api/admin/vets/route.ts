import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendVetWelcomeEmail } from '@/lib/email';

/**
 * Verify the requesting user is an admin.
 */
async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    };
  }

  return { user };
}

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
