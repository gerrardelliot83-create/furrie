/**
 * Extended TypeScript types for the Treatment Plan builder.
 *
 * Section types (medication, lab test, follow-up, custom section, draft)
 * live in ./schemas.ts — this file re-exports them and adds
 * server-managed metadata, header data, and client-side-only UI types.
 */

export type {
  MedicationRoute,
  LabTestUrgency,
  FollowUpMode,
  TreatmentPlanMedication,
  TreatmentPlanLabTest,
  TreatmentPlanFollowUp,
  TreatmentPlanCustomSection,
  TreatmentPlanDraft,
} from './schemas';

import type { TreatmentPlanDraft } from './schemas';

/**
 * Previous PDF entry stored in `prescriptions.previous_pdf_urls` when a
 * finalized plan is regenerated.
 */
export interface PreviousPdfEntry {
  url: string;
  finalized_at: string; // ISO
  version: number;
}

/**
 * Denormalized header data needed to render the preview / PDF — fetched
 * once on GET and not edited by the vet.
 */
export interface TreatmentPlanHeader {
  vet: {
    name: string;
    vciNumber: string | null;
    qualifications: string | null;
    specializations: string | null;
  };
  pet: {
    name: string;
    species: string;
    breed: string | null;
    ageDisplay: string;
    weight: string | null;
  };
  owner: {
    name: string;
    phone: string | null;
  };
  consultationDate: string; // ISO
}

/**
 * Full view returned by GET /api/treatment-plans?consultationId=
 * and used by the builder + preview pane.
 */
export interface TreatmentPlanView {
  id: string;
  prescriptionNumber: string;
  consultationId: string;
  version: number;
  status: 'draft' | 'finalized';
  finalizedAt: string | null;
  pdfUrl: string | null;
  previousPdfUrls: PreviousPdfEntry[];
  updatedAt: string;
  draft: TreatmentPlanDraft;
  header: TreatmentPlanHeader;
}

/**
 * Payload sent by the builder on PATCH autosave. Includes the last known
 * updated_at for optimistic concurrency.
 */
export interface TreatmentPlanPatchPayload {
  updated_at: string;
  draft: Partial<TreatmentPlanDraft>;
}

/**
 * Client-side autosave state machine used by the builder.
 */
export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/**
 * Result of a finalize guard check on the client. Mirrors the server check.
 */
export interface FinalizeReadiness {
  ready: boolean;
  missing: string[];
}
