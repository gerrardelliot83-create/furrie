import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapPetFromDB, mapPetToDB } from '@/lib/utils/petMapper';
import type { Pet } from '@/types';

// GET /api/pets - List user's pets
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Fetch pets for the current user (RLS enforces data isolation)
    const { data: pets, error } = await supabase
      .from('pets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pets', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // Map database rows to TypeScript interface
    const mappedPets: Pet[] = (pets || []).map(mapPetFromDB);

    return NextResponse.json({ pets: mappedPets });
  } catch (error) {
    console.error('Unexpected error in GET /api/pets:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// POST /api/pets - Create new pet
export async function POST(request: Request) {
  try {
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

    // Validate required fields
    const requiredFields = ['name', 'species', 'breed', 'gender'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}`, code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
    }

    // Validate species
    if (!['dog', 'cat'].includes(body.species)) {
      return NextResponse.json(
        { error: 'Species must be "dog" or "cat"', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate gender
    if (!['male', 'female'].includes(body.gender)) {
      return NextResponse.json(
        { error: 'Gender must be "male" or "female"', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Trim name
    if (body.name) {
      body.name = body.name.trim();
    }

    // Map to database format and insert
    const petData = mapPetToDB(body as Partial<Pet>, user.id);

    const { data: pet, error } = await supabase
      .from('pets')
      .insert(petData)
      .select()
      .single();

    if (error) {
      console.error('Error creating pet:', error);
      return NextResponse.json(
        { error: 'Failed to create pet', code: 'CREATE_ERROR' },
        { status: 500 }
      );
    }

    // Map back to TypeScript interface
    const mappedPet = mapPetFromDB(pet);

    return NextResponse.json({ pet: mappedPet }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/pets:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
