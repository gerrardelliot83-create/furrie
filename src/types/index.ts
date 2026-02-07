// Furrie Type Definitions
// Export all types from this index file

export interface User {
  id: string;
  role: 'customer' | 'vet' | 'admin';
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string;
  dateOfBirth: string | null;
  approximateAgeMonths: number | null;
  gender: 'male' | 'female';
  weightKg: number | null;
  isNeutered: boolean;
  colorMarkings: string | null;
  microchipNumber: string | null;
  knownAllergies: string[];
  existingConditions: string[];
  currentMedications: Medication[];
  dietType: string | null;
  dietDetails: string | null;
  vaccinationHistory: VaccinationRecord[];
  photoUrls: string[];
  medicalDocsUrls: string[];
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate?: string;
  endDate?: string;
}

export interface VaccinationRecord {
  name: string;
  date: string;
  nextDueDate?: string;
  administeredBy?: string;
  // Approval workflow fields
  status: 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: string;    // Vet user ID
  approvedAt?: string;    // ISO timestamp
  rejectionReason?: string;
}

export interface Consultation {
  id: string;
  consultationNumber: string;
  customerId: string;
  vetId: string | null;
  petId: string;
  type: 'direct_connect' | 'scheduled' | 'follow_up';
  status: ConsultationStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number;
  wasExtended: boolean;
  concernText: string | null;
  symptomCategories: string[];
  isFollowUp: boolean;
  parentConsultationId: string | null;
  followUpExpiresAt: string | null;
  dailyRoomName: string | null;
  dailyRoomUrl: string | null;
  recordingId: string | null;
  recordingUrl: string | null;
  paymentId: string | null;
  amountPaid: number | null;
  isPriority: boolean;
  isFree: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ConsultationStatus =
  | 'pending'
  | 'matching'
  | 'matched'
  | 'in_progress'
  | 'completed'
  | 'missed'
  | 'cancelled'
  | 'no_vet_available';

export interface VetProfile {
  id: string;
  qualifications: string;
  vciRegistrationNumber: string;
  stateCouncilRegistration: string | null;
  specializations: string[];
  yearsOfExperience: number | null;
  degreeCertificateUrl: string | null;
  isVerified: boolean;
  isAvailable: boolean;
  availabilitySchedule: AvailabilitySchedule;
  consultationCount: number;
  averageRating: number;
  aiQualityScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySchedule {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface SoapNote {
  id: string;
  consultationId: string;
  vetId: string;
  // Subjective
  chiefComplaint: string | null;
  historyPresentIllness: string | null;
  behaviorChanges: string | null;
  appetiteChanges: string | null;
  activityLevelChanges: string | null;
  dietInfo: string | null;
  previousTreatments: string | null;
  environmentalFactors: string | null;
  otherPetsHousehold: string | null;
  // Objective
  generalAppearance: string | null;
  bodyConditionScore: string | null;
  visiblePhysicalFindings: string | null;
  respiratoryPattern: string | null;
  gaitMobility: string | null;
  vitalSigns: VitalSigns | null;
  referencedMediaUrls: string[];
  // Assessment
  provisionalDiagnosis: string | null;
  differentialDiagnoses: string[];
  confidenceLevel: 'low' | 'medium' | 'high' | null;
  teleconsultationLimitations: string | null;
  // Plan
  medications: PrescribedMedication[];
  dietaryRecommendations: string | null;
  lifestyleModifications: string | null;
  homeCareInstructions: string | null;
  warningSigns: string | null;
  followUpTimeframe: string | null;
  inPersonVisitRecommended: boolean;
  inPersonUrgency: 'low' | 'medium' | 'high' | 'emergency' | null;
  referralSpecialist: string | null;
  additionalDiagnostics: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VitalSigns {
  temperature?: number;
  heartRate?: number;
  respiratoryRate?: number;
  weight?: number;
}

export interface PrescribedMedication {
  name: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channel: 'in_app' | 'email' | 'whatsapp';
  isRead: boolean;
  sentAt: string;
  createdAt: string;
}
