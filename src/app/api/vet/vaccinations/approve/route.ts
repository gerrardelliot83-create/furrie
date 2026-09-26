import { withRoute } from '@/server/handler';
import { handleVaccinationDecision } from '@/app/api/vet/_lib/vaccinationDecision';

// POST /api/vet/vaccinations/approve - Approve a vaccination record (A-10: the old
// version reported success while updating 0 rows; see vaccinationDecision.ts)
export const POST = withRoute(async function POST(request: Request) {
  try {
    return await handleVaccinationDecision(request, 'approved');
  } catch (error) {
    console.error('Unexpected error in POST /api/vet/vaccinations/approve:', error);
    return Response.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
});
