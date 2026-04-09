/**
 * Server-side helper that renders a TreatmentPlanPDF to a Buffer.
 * Used by both the preview-pdf and finalize endpoints.
 */

import { renderToBuffer } from '@react-pdf/renderer';
import {
  TreatmentPlanPDF,
  type TreatmentPlanPdfData,
} from '@/components/vet/TreatmentPlanPDF';
import type { TreatmentPlanDraft } from './schemas';
import type { TreatmentPlanHeader } from './types';

export interface RenderTreatmentPlanPdfArgs {
  planNumber: string;
  finalizedAt?: string | null;
  consultationId: string;
  draft: TreatmentPlanDraft;
  header: TreatmentPlanHeader;
}

export async function renderTreatmentPlanPdf(
  args: RenderTreatmentPlanPdfArgs
): Promise<Buffer> {
  const finalizedDate = formatDate(args.finalizedAt ?? new Date().toISOString());
  const data: TreatmentPlanPdfData = {
    planNumber: args.planNumber,
    finalizedDate,
    consultationId: args.consultationId,
    draft: args.draft,
    header: args.header,
  };
  return renderToBuffer(TreatmentPlanPDF({ data }));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
