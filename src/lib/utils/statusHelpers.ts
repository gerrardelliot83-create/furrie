import type { ConsultationStatus, ConsultationOutcome } from '@/types';

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error';

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
