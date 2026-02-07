import type { Pet, Medication, VaccinationRecord } from '@/types';
import type { Database, Json } from '@/lib/database.types';

type PetRow = Database['public']['Tables']['pets']['Row'];
type PetInsert = Database['public']['Tables']['pets']['Insert'];
type PetUpdate = Database['public']['Tables']['pets']['Update'];

/**
 * Convert database row (snake_case) to TypeScript interface (camelCase)
 */
export function mapPetFromDB(row: PetRow): Pet {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    species: row.species as 'dog' | 'cat',
    breed: row.breed,
    dateOfBirth: row.date_of_birth,
    approximateAgeMonths: row.approximate_age_months,
    gender: row.gender as 'male' | 'female',
    weightKg: row.weight_kg,
    isNeutered: row.is_neutered ?? false,
    colorMarkings: row.color_markings,
    microchipNumber: row.microchip_number,
    knownAllergies: row.known_allergies ?? [],
    existingConditions: row.existing_conditions ?? [],
    currentMedications: (row.current_medications as unknown as Medication[]) ?? [],
    dietType: row.diet_type,
    dietDetails: row.diet_details,
    vaccinationHistory: (row.vaccination_history as unknown as VaccinationRecord[]) ?? [],
    photoUrls: row.photo_urls ?? [],
    medicalDocsUrls: row.medical_docs_urls ?? [],
    insuranceProvider: row.insurance_provider,
    insurancePolicyNumber: row.insurance_policy_number,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

/**
 * Convert TypeScript interface to database insert format
 */
export function mapPetToDB(pet: Partial<Pet>, ownerId: string): PetInsert {
  return {
    owner_id: ownerId,
    name: pet.name!,
    species: pet.species!,
    breed: pet.breed!,
    gender: pet.gender!,
    date_of_birth: pet.dateOfBirth ?? null,
    approximate_age_months: pet.approximateAgeMonths ?? null,
    weight_kg: pet.weightKg ?? null,
    is_neutered: pet.isNeutered ?? false,
    color_markings: pet.colorMarkings ?? null,
    microchip_number: pet.microchipNumber ?? null,
    known_allergies: pet.knownAllergies ?? [],
    existing_conditions: pet.existingConditions ?? [],
    current_medications: (pet.currentMedications ?? []) as unknown as Json,
    diet_type: pet.dietType ?? null,
    diet_details: pet.dietDetails ?? null,
    vaccination_history: (pet.vaccinationHistory ?? []) as unknown as Json,
    photo_urls: pet.photoUrls ?? [],
    medical_docs_urls: pet.medicalDocsUrls ?? [],
    insurance_provider: pet.insuranceProvider ?? null,
    insurance_policy_number: pet.insurancePolicyNumber ?? null,
  };
}

/**
 * Convert TypeScript interface to database update format
 */
export function mapPetUpdateToDB(pet: Partial<Pet>): PetUpdate {
  const update: PetUpdate = {};

  if (pet.name !== undefined) update.name = pet.name;
  if (pet.species !== undefined) update.species = pet.species;
  if (pet.breed !== undefined) update.breed = pet.breed;
  if (pet.gender !== undefined) update.gender = pet.gender;
  if (pet.dateOfBirth !== undefined) update.date_of_birth = pet.dateOfBirth;
  if (pet.approximateAgeMonths !== undefined) update.approximate_age_months = pet.approximateAgeMonths;
  if (pet.weightKg !== undefined) update.weight_kg = pet.weightKg;
  if (pet.isNeutered !== undefined) update.is_neutered = pet.isNeutered;
  if (pet.colorMarkings !== undefined) update.color_markings = pet.colorMarkings;
  if (pet.microchipNumber !== undefined) update.microchip_number = pet.microchipNumber;
  if (pet.knownAllergies !== undefined) update.known_allergies = pet.knownAllergies;
  if (pet.existingConditions !== undefined) update.existing_conditions = pet.existingConditions;
  if (pet.currentMedications !== undefined) update.current_medications = pet.currentMedications as unknown as Json;
  if (pet.dietType !== undefined) update.diet_type = pet.dietType;
  if (pet.dietDetails !== undefined) update.diet_details = pet.dietDetails;
  if (pet.vaccinationHistory !== undefined) update.vaccination_history = pet.vaccinationHistory as unknown as Json;
  if (pet.photoUrls !== undefined) update.photo_urls = pet.photoUrls;
  if (pet.medicalDocsUrls !== undefined) update.medical_docs_urls = pet.medicalDocsUrls;
  if (pet.insuranceProvider !== undefined) update.insurance_provider = pet.insuranceProvider;
  if (pet.insurancePolicyNumber !== undefined) update.insurance_policy_number = pet.insurancePolicyNumber;

  return update;
}
