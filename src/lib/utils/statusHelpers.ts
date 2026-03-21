import type { ConsultationStatus, ConsultationOutcome } from '@/types';

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error';

// ============================================================================
// CONSULTATION STATE MACHINE (per migration 004_consolidate_statuses.sql)
//
// Valid Statuses: pending | scheduled | active | closed
// Valid Outcomes: success | missed | cancelled | failed (required when closed)
//
// Transitions:
//   pending   -> scheduled  (after payment confirmed)
//   pending   -> closed     (cancelled before payment, outcome='cancelled')
//   scheduled -> active     (first participant joins video call)
//   scheduled -> closed     (missed or cancelled, outcome='missed'|'cancelled')
//   active    -> closed     (call ends, outcome='success')
//   active    -> closed     (stale recovery, outcome='failed')
//
// Constraints:
//   - status='closed' MUST have a non-null outcome
//   - outcome MUST be null when status != 'closed'
// ============================================================================

/** All valid consultation statuses */
export const VALID_STATUSES = ['pending', 'scheduled', 'active', 'closed'] as const;

/** All valid consultation outcomes (only when status='closed') */
export const VALID_OUTCOMES = ['success', 'missed', 'cancelled', 'failed'] as const;

/** Valid transitions: maps current status to allowed next statuses */
export const VALID_TRANSITIONS: Record<ConsultationStatus, readonly ConsultationStatus[]> = {
  pending: ['scheduled', 'closed'],
  scheduled: ['active', 'closed'],
  active: ['closed'],
  closed: [], // Terminal state
};

/**
 * Validate a status value is a valid ConsultationStatus
 */
export function isValidStatus(status: string): status is ConsultationStatus {
  return (VALID_STATUSES as readonly string[]).includes(status);
}

/**
 * Validate an outcome value is a valid ConsultationOutcome
 */
export function isValidOutcome(outcome: string): outcome is ConsultationOutcome {
  return (VALID_OUTCOMES as readonly string[]).includes(outcome);
}

/**
 * Validate a status transition is allowed
 */
export function isValidTransition(from: ConsultationStatus, to: ConsultationStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Validate that closing a consultation has a required outcome
 * Returns an error message if invalid, null if valid
 */
export function validateClosingConsultation(
  newStatus: string,
  outcome: string | null | undefined
): string | null {
  if (newStatus === 'closed' && !outcome) {
    return 'Outcome is required when closing a consultation';
  }
  if (newStatus !== 'closed' && outcome) {
    return 'Outcome must be null for non-closed consultations';
  }
  if (outcome && !isValidOutcome(outcome)) {
    return `Invalid outcome: ${outcome}. Must be one of: ${VALID_OUTCOMES.join(', ')}`;
  }
  return null;
}

/**
 * Map status to badge variant color
 */
export const statusVariantMap: Record<ConsultationStatus, BadgeVariant> = {
  pending: 'neutral',
  scheduled: 'info',
  active: 'warning',
  closed: 'neutral',
};

/**
 * Map outcome to badge variant color (for closed status)
 */
export const outcomeVariantMap: Record<NonNullable<ConsultationOutcome>, BadgeVariant> = {
  success: 'success',
  missed: 'error',
  cancelled: 'error',
  failed: 'error',
};

/**
 * Map status to display text
 */
export const statusLabels: Record<ConsultationStatus, string> = {
  pending: 'Awaiting Payment',
  scheduled: 'Scheduled',
  active: 'In Progress',
  closed: 'Completed',
};

/**
 * Map outcome to display text (for closed status)
 */
export const outcomeLabels: Record<NonNullable<ConsultationOutcome>, string> = {
  success: 'Completed',
  missed: 'Missed',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

/**
 * Get badge variant based on status and optional outcome
 */
export function getStatusVariant(
  status: ConsultationStatus,
  outcome?: ConsultationOutcome | null
): BadgeVariant {
  if (status === 'closed' && outcome) {
    return outcomeVariantMap[outcome] || 'neutral';
  }
  return statusVariantMap[status];
}

/**
 * Get display text based on status and optional outcome
 */
export function getStatusDisplayText(
  status: ConsultationStatus,
  outcome?: ConsultationOutcome | null
): string {
  if (status === 'closed' && outcome) {
    return outcomeLabels[outcome] || 'Closed';
  }
  return statusLabels[status];
}

/**
 * Check if consultation can be joined (video call)
 */
export function canJoinCall(status: ConsultationStatus): boolean {
  return status === 'scheduled' || status === 'active';
}

/**
 * Check if consultation can be cancelled
 */
export function canCancel(status: ConsultationStatus): boolean {
  return status === 'pending' || status === 'scheduled';
}

/**
 * Check if status is terminal (no further transitions)
 */
export function isTerminal(status: ConsultationStatus): boolean {
  return status === 'closed';
}

/**
 * Get i18n key for status (for use with next-intl)
 */
export function getStatusI18nKey(
  status: ConsultationStatus,
  outcome?: ConsultationOutcome | null
): string {
  if (status === 'closed' && outcome) {
    return outcome;
  }
  return status;
}
