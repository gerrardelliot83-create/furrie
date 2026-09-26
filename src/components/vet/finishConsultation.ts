/**
 * Browser side of "finish consultation" (C-02). Both finish buttons (SOAP tab
 * and Treatment Plan tab) save the notes first, then call this, so there is
 * one path: notes, then POST /api/vet/consultations/[id]/complete.
 */

export type FinishResult =
  | { ok: true; alreadyCompleted: boolean; notesSent: boolean }
  | { ok: false; code: string; message: string };

export async function finishConsultation(
  consultationId: string,
  options: { isDiagnosisFromList?: boolean } = {}
): Promise<FinishResult> {
  let response: Response;
  try {
    response = await fetch(`/api/vet/consultations/${consultationId}/complete`, { method: 'POST' });
  } catch {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: 'Could not reach Furrie. Check your connection and try again.',
    };
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      code: typeof data.code === 'string' ? data.code : 'ERROR',
      message: typeof data.error === 'string' ? data.error : 'Failed to complete the consultation.',
    };
  }

  const alreadyCompleted = data.alreadyCompleted === true;
  const notesSent = data.notesSent === true;

  // Autocomplete analytics when this call finished it or sent late notes. Best effort.
  if (!alreadyCompleted || notesSent) {
    fetch('/api/analytics/capture-treatment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultationId,
        isDiagnosisFromList: options.isDiagnosisFromList ?? false,
      }),
    }).catch((err) => console.error('Treatment analytics capture failed:', err));
  }

  return { ok: true, alreadyCompleted, notesSent };
}
