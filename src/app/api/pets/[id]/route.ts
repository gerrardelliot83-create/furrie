import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapPetFromDB, mapPetUpdateToDB } from '@/lib/utils/petMapper';
import type { Pet } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/pets/[id] - Get a single pet
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Fetch pet (RLS enforces owner_id = auth.uid())
    const { data: pet, error } = await supabase
      .from('pets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Pet not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      console.error('Error fetching pet:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pet', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // Map to TypeScript interface
    const mappedPet = mapPetFromDB(pet);

    return NextResponse.json({ pet: mappedPet });
  } catch (error) {
    console.error('Unexpected error in GET /api/pets/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// PUT /api/pets/[id] - Update a pet
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate species if provided
    if (body.species && !['dog', 'cat'].includes(body.species)) {
      return NextResponse.json(
        { error: 'Species must be "dog" or "cat"', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate gender if provided
    if (body.gender && !['male', 'female'].includes(body.gender)) {
      return NextResponse.json(
        { error: 'Gender must be "male" or "female"', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Trim name if provided
    if (body.name) {
      body.name = body.name.trim();
    }

    // Map to database update format
    const updateData = mapPetUpdateToDB(body as Partial<Pet>);

    // Update pet (RLS enforces owner_id = auth.uid())
    const { data: pet, error } = await supabase
      .from('pets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Pet not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      console.error('Error updating pet:', error);
      return NextResponse.json(
        { error: 'Failed to update pet', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    // Map back to TypeScript interface
    const mappedPet = mapPetFromDB(pet);

    return NextResponse.json({ pet: mappedPet });
  } catch (error) {
    console.error('Unexpected error in PUT /api/pets/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// DELETE /api/pets/[id] - Delete a pet
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Delete pet (RLS enforces owner_id = auth.uid())
    const { error } = await supabase
      .from('pets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting pet:', error);
      return NextResponse.json(
        { error: 'Failed to delete pet', code: 'DELETE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/pets/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
