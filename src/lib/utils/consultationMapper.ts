import type { Consultation, ConsultationOutcome } from '@/types';
import type { Database } from '@/lib/database.types';

type ConsultationRow = Database['public']['Tables']['consultations']['Row'];
type ConsultationInsert = Database['public']['Tables']['consultations']['Insert'];
type ConsultationUpdate = Database['public']['Tables']['consultations']['Update'];

/**
 * Convert database row (snake_case) to TypeScript interface (camelCase)
 */
export function mapConsultationFromDB(row: ConsultationRow): Consultation {
  return {
    id: row.id,
    consultationNumber: row.consultation_number,
    customerId: row.customer_id,
    vetId: row.vet_id,
    petId: row.pet_id,
    type: row.type as Consultation['type'],
    status: row.status as Consultation['status'],
    outcome: row.outcome as ConsultationOutcome | null,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMinutes: row.duration_minutes ?? 0,
    wasExtended: row.was_extended ?? false,
    concernText: row.concern_text,
    symptomCategories: row.symptom_categories ?? [],
    isFollowUp: row.is_follow_up ?? false,
    parentConsultationId: row.parent_consultation_id,
    followUpExpiresAt: row.follow_up_expires_at,
    dailyRoomName: row.daily_room_name,
    dailyRoomUrl: row.daily_room_url,
    recordingId: row.recording_id,
    recordingUrl: row.recording_url,
    paymentId: row.payment_id,
    amountPaid: row.amount_paid,
    isPriority: row.is_priority ?? false,
    isFree: row.is_free ?? false,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

/**
 * Convert TypeScript interface to database insert format
 */
export function mapConsultationToDB(
  data: {
    petId: string;
    concernText?: string | null;
    symptomCategories?: string[];
    type?: Consultation['type'];
    scheduledAt?: string | null;
    isFree?: boolean;
    isPriority?: boolean;
  },
  customerId: string
): ConsultationInsert {
  return {
    customer_id: customerId,
    pet_id: data.petId,
    type: data.type ?? 'direct_connect',
    status: 'pending',
    concern_text: data.concernText ?? null,
    symptom_categories: data.symptomCategories ?? [],
    scheduled_at: data.scheduledAt ?? null,
    is_free: data.isFree ?? false,
    is_priority: data.isPriority ?? false,
    is_follow_up: false,
  };
}

/**
 * Convert TypeScript interface to database update format
 */
export function mapConsultationUpdateToDB(
  data: Partial<Consultation>
): ConsultationUpdate {
  const update: ConsultationUpdate = {};

  if (data.status !== undefined) update.status = data.status;
  if (data.outcome !== undefined) update.outcome = data.outcome;
  if (data.vetId !== undefined) update.vet_id = data.vetId;
  if (data.startedAt !== undefined) update.started_at = data.startedAt;
  if (data.endedAt !== undefined) update.ended_at = data.endedAt;
  if (data.durationMinutes !== undefined) update.duration_minutes = data.durationMinutes;
  if (data.wasExtended !== undefined) update.was_extended = data.wasExtended;
  if (data.concernText !== undefined) update.concern_text = data.concernText;
  if (data.symptomCategories !== undefined) update.symptom_categories = data.symptomCategories;
  if (data.dailyRoomName !== undefined) update.daily_room_name = data.dailyRoomName;
  if (data.dailyRoomUrl !== undefined) update.daily_room_url = data.dailyRoomUrl;
  if (data.recordingId !== undefined) update.recording_id = data.recordingId;
  if (data.recordingUrl !== undefined) update.recording_url = data.recordingUrl;
  if (data.paymentId !== undefined) update.payment_id = data.paymentId;
  if (data.amountPaid !== undefined) update.amount_paid = data.amountPaid;

  return update;
}

/**
 * Extended consultation type with related data (for list/detail views)
 */
export interface ConsultationWithRelations extends Consultation {
  pet?: {
    id: string;
    name: string;
    species: string;
    breed: string;
    photoUrls: string[];
  };
  vet?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    qualifications?: string;
  };
  rating?: {
    rating: number;
    feedbackText: string | null;
  };
  prescription?: {
    id: string;
    pdfUrl: string | null;
    prescriptionNumber: string;
  };
}

/**
 * Map a consultation row with joined relations
 */
export function mapConsultationWithRelationsFromDB(
  row: ConsultationRow & {
    pets?: {
      id: string;
      name: string;
      species: string;
      breed: string;
      photo_urls: string[] | null;
    };
    profiles?: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    };
    vet_profiles?: {
      qualifications: string;
    };
    consultation_ratings?: {
      rating: number;
      feedback_text: string | null;
    }[];
    prescriptions?: {
      id: string;
      pdf_url: string | null;
      prescription_number: string;
    }[];
  }
): ConsultationWithRelations {
  const base = mapConsultationFromDB(row);

  return {
    ...base,
    pet: row.pets
      ? {
          id: row.pets.id,
          name: row.pets.name,
          species: row.pets.species,
          breed: row.pets.breed,
          photoUrls: row.pets.photo_urls ?? [],
        }
      : undefined,
    vet:
      row.profiles && row.vet_id
        ? {
            id: row.profiles.id,
            fullName: row.profiles.full_name,
            avatarUrl: row.profiles.avatar_url,
            qualifications: row.vet_profiles?.qualifications,
          }
        : undefined,
    rating: row.consultation_ratings?.[0]
      ? {
          rating: row.consultation_ratings[0].rating,
          feedbackText: row.consultation_ratings[0].feedback_text,
        }
      : undefined,
    prescription: row.prescriptions?.[0]
      ? {
          id: row.prescriptions[0].id,
          pdfUrl: row.prescriptions[0].pdf_url,
          prescriptionNumber: row.prescriptions[0].prescription_number,
        }
      : undefined,
  };
}
