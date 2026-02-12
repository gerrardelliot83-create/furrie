'use server';

import { revalidatePath } from 'next/cache';

/**
 * Revalidate the consultation detail page cache
 * Call this after saving SOAP notes to ensure the page shows updated data
 */
export async function revalidateConsultationPath(consultationId: string) {
  // Revalidate the vet consultation detail page
  revalidatePath(`/consultations/${consultationId}`);
}
