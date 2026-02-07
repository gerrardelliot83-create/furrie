import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@/types';

// Map database profile to User type
function mapProfileFromDB(row: {
  id: string;
  role: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}): User {
  return {
    id: row.id,
    role: row.role as User['role'],
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    isActive: row.is_active ?? true,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

// GET /api/profile - Get current user's profile
export async function GET() {
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

    // Fetch profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Profile not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      console.error('Error fetching profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // Map to User type
    const mappedProfile = mapProfileFromDB(profile);

    return NextResponse.json({ profile: mappedProfile });
  } catch (error) {
    console.error('Unexpected error in GET /api/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: Request) {
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

    const body = await request.json();

    // Only allow updating specific fields: fullName, phone, avatarUrl
    const updateData: Record<string, unknown> = {};

    if (body.fullName !== undefined) {
      const trimmedName = body.fullName?.trim();
      if (!trimmedName) {
        return NextResponse.json(
          { error: 'Full name cannot be empty', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      updateData.full_name = trimmedName;
    }

    if (body.phone !== undefined) {
      // Basic phone validation for India
      const phone = body.phone?.trim() || null;
      if (phone && !/^[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ''))) {
        return NextResponse.json(
          { error: 'Please enter a valid 10-digit Indian mobile number', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      updateData.phone = phone;
    }

    if (body.avatarUrl !== undefined) {
      updateData.avatar_url = body.avatarUrl || null;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Perform update
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Map to User type
    const mappedProfile = mapProfileFromDB(profile);

    return NextResponse.json({ profile: mappedProfile });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
