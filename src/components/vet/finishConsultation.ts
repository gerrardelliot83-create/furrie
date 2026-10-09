/**
 * Browser side of "finish consultation" (C-02). Both finish buttons (SOAP tab
 * and Treatment Plan tab) save the notes first, then call this, so there is
 * one path: notes, then POST /api/vet/consultations/[id]/complete.
 *
 * VC-1b: when the server didn't see the vet and the pet parent in the video
 * call together it answers OUTCOME_NEEDED and records nothing; the page asks
 * the vet what happened (only the answers the evidence allows) and calls this
 * again with her `outcome`. OUTCOME_NOT_ALLOWED carries the same details.
 */

import { isFinishChoice, type FinishChoice } from '@/lib/scheduling/outcomes';

export type FinishOutcome = 'success' | 'missed' | 'failed';

/** What the server knew when it asked (OUTCOME_NEEDED / OUTCOME_NOT_ALLOWED). */
export interface OutcomeQuestion {
  customerSeen: boolean;
  allowedOutcomes: FinishChoice[];
  /** When "didn't come" becomes possible, if only the 15-minute wait stands in the way (ISO). */
  noShowAvailableAt: string | null;
  /** The saved notes have a chief complaint and a provisional diagnosis. */
  notesComplete: boolean;
}

export type FinishResult =
  | { ok: true; alreadyCompleted: boolean; notesSent: boolean; outcome: FinishOutcome }
  | { ok: false; code: string; message: string; question: OutcomeQuestion | null };

function readQuestion(data: Record<string, unknown>): OutcomeQuestion | null {
  if (!Array.isArray(data.allowedOutcomes)) return null;
  return {
    customerSeen: data.customerSeen === true,
    allowedOutcomes: data.allowedOutcomes.filter(isFinishChoice),
    noShowAvailableAt: typeof data.noShowAvailableAt === 'string' ? data.noShowAvailableAt : null,
    notesComplete: data.notesComplete === true,
  };
}

export async function finishConsultation(
  consultationId: string,
  options: { isDiagnosisFromList?: boolean; outcome?: FinishChoice } = {}
): Promise<FinishResult> {
  let response: Response;
  try {
    response = await fetch(`/api/vet/consultations/${consultationId}/complete`, {
      method: 'POST',
      ...(options.outcome
        ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome: options.outcome }) }
        : {}),
    });
  } catch {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: 'Could not reach Furrie. Check your connection and try again.',
      question: null,
    };
  }

  const data = ((await response.json().catch(() => null)) ?? {}) as Record<string, unknown>;

  if (!response.ok) {
    return {
      ok: false,
      code: typeof data.code === 'string' ? data.code : 'ERROR',
      message: typeof data.error === 'string' ? data.error : 'Failed to complete the consultation.',
      question: readQuestion(data),
    };
  }

  const alreadyCompleted = data.alreadyCompleted === true;
  const notesSent = data.notesSent === true;
  const outcome: FinishOutcome = data.outcome === 'missed' || data.outcome === 'failed' ? data.outcome : 'success';

  // Autocomplete analytics when this call finished it as a success or sent
  // late notes. Best effort.
  if (outcome === 'success' && (!alreadyCompleted || notesSent)) {
    fetch('/api/analytics/capture-treatment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultationId,
        isDiagnosisFromList: options.isDiagnosisFromList ?? false,
      }),
    }).catch((err) => console.error('Treatment analytics capture failed:', err));
  }

  return { ok: true, alreadyCompleted, notesSent, outcome };
}
