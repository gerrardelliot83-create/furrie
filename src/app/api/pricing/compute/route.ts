import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  computeConsultationPrice,
  computeSubscriptionPricing,
  getSachetPricing,
  isPricingEngineConfigured,
  DEFAULT_CONSULTATION_PRICE,
  DEFAULT_CURRENCY,
} from '@/lib/pricing';
import type { PetPricingInput, SubscriptionPricing, SachetPricing } from '@/lib/pricing/types';

interface ComputePriceRequest {
  type: 'consultation' | 'subscription' | 'sachet';
  petId?: string;
  petIds?: string[];
  tier?: SubscriptionPricing['tier'];
  sachetType?: SachetPricing['sachetType'];
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json() as ComputePriceRequest;

    // Validate request type
    if (!body.type || !['consultation', 'subscription', 'sachet'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid pricing type', code: 'INVALID_TYPE' },
        { status: 400 }
      );
    }

    // Handle consultation pricing
    if (body.type === 'consultation') {
      if (!body.petId) {
        return NextResponse.json(
          { error: 'petId is required for consultation pricing', code: 'MISSING_PET_ID' },
          { status: 400 }
        );
      }

      // Fetch pet data
      const { data: pet, error: petError } = await supabase
        .from('pets')
        .select('id, species, breed, date_of_birth, approximate_age_months, weight_kg, is_neutered, existing_conditions')
        .eq('id', body.petId)
        .eq('owner_id', user.id)
        .single();

      if (petError || !pet) {
        return NextResponse.json(
          { error: 'Pet not found', code: 'PET_NOT_FOUND' },
          { status: 404 }
        );
      }

      // Calculate age in months
      let ageMonths = pet.approximate_age_months || 12;
      if (pet.date_of_birth) {
        const dob = new Date(pet.date_of_birth);
        const now = new Date();
        ageMonths = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30));
      }

      const petInput: PetPricingInput = {
        species: pet.species as 'dog' | 'cat',
        breed: pet.breed || 'Mixed',
        ageMonths,
        weightKg: pet.weight_kg || undefined,
        isNeutered: pet.is_neutered || false,
        hasPreexistingConditions: (pet.existing_conditions?.length || 0) > 0,
      };

      // If pricing engine not configured, return default price
      if (!isPricingEngineConfigured()) {
        return NextResponse.json({
          success: true,
          engineConfigured: false,
          result: {
            basePrice: DEFAULT_CONSULTATION_PRICE,
            finalPrice: DEFAULT_CONSULTATION_PRICE,
            currency: DEFAULT_CURRENCY,
            appliedMultipliers: { species: 1, breed: 1, age: 1 },
            breakdown: [{ label: 'Default Rate', factor: 1, priceAfter: DEFAULT_CONSULTATION_PRICE }],
            wasClamped: false,
          },
        });
      }

      const result = computeConsultationPrice(petInput);
      return NextResponse.json({
        success: true,
        engineConfigured: true,
        result,
      });
    }

    // Handle subscription pricing
    if (body.type === 'subscription') {
      const petIds = body.petIds || (body.petId ? [body.petId] : []);
      if (petIds.length === 0) {
        return NextResponse.json(
          { error: 'At least one petId is required', code: 'MISSING_PET_IDS' },
          { status: 400 }
        );
      }

      if (!body.tier) {
        return NextResponse.json(
          { error: 'tier is required for subscription pricing', code: 'MISSING_TIER' },
          { status: 400 }
        );
      }

      // Fetch pets data
      const { data: pets, error: petsError } = await supabase
        .from('pets')
        .select('id, name, species, breed, date_of_birth, approximate_age_months, weight_kg, is_neutered, existing_conditions')
        .in('id', petIds)
        .eq('owner_id', user.id);

      if (petsError || !pets || pets.length === 0) {
        return NextResponse.json(
          { error: 'No pets found', code: 'PETS_NOT_FOUND' },
          { status: 404 }
        );
      }

      const petsInput = pets.map(pet => {
        let ageMonths = pet.approximate_age_months || 12;
        if (pet.date_of_birth) {
          const dob = new Date(pet.date_of_birth);
          const now = new Date();
          ageMonths = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30));
        }

        return {
          id: pet.id,
          name: pet.name,
          species: pet.species as 'dog' | 'cat',
          breed: pet.breed || 'Mixed',
          ageMonths,
          weightKg: pet.weight_kg || undefined,
          isNeutered: pet.is_neutered || false,
          hasPreexistingConditions: (pet.existing_conditions?.length || 0) > 0,
        };
      });

      const result = computeSubscriptionPricing(petsInput, body.tier);
      return NextResponse.json({
        success: true,
        engineConfigured: isPricingEngineConfigured(),
        result,
      });
    }

    // Handle sachet pricing
    if (body.type === 'sachet') {
      if (!body.sachetType) {
        return NextResponse.json(
          { error: 'sachetType is required', code: 'MISSING_SACHET_TYPE' },
          { status: 400 }
        );
      }

      // For algorithmic sachets (D, E, F), we need pet data
      let petsInput: Array<PetPricingInput & { id: string; name: string }> | undefined;

      if (['d', 'e', 'f'].includes(body.sachetType)) {
        const petIds = body.petIds || (body.petId ? [body.petId] : []);

        if (petIds.length > 0) {
          const { data: pets } = await supabase
            .from('pets')
            .select('id, name, species, breed, date_of_birth, approximate_age_months, weight_kg, is_neutered, existing_conditions')
            .in('id', petIds)
            .eq('owner_id', user.id);

          if (pets && pets.length > 0) {
            petsInput = pets.map(pet => {
              let ageMonths = pet.approximate_age_months || 12;
              if (pet.date_of_birth) {
                const dob = new Date(pet.date_of_birth);
                const now = new Date();
                ageMonths = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30));
              }

              return {
                id: pet.id,
                name: pet.name,
                species: pet.species as 'dog' | 'cat',
                breed: pet.breed || 'Mixed',
                ageMonths,
                weightKg: pet.weight_kg || undefined,
                isNeutered: pet.is_neutered || false,
                hasPreexistingConditions: (pet.existing_conditions?.length || 0) > 0,
              };
            });
          }
        }
      }

      const result = getSachetPricing(body.sachetType, petsInput);
      return NextResponse.json({
        success: true,
        engineConfigured: isPricingEngineConfigured(),
        result,
      });
    }

    return NextResponse.json(
      { error: 'Invalid request', code: 'INVALID_REQUEST' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error computing price:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
