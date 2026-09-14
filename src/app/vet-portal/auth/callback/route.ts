import { handleAuthCallback } from '@/lib/auth/handleAuthCallback';
import { withRoute } from '@/server/handler';

export const dynamic = 'force-dynamic';

export const GET = withRoute(async function GET(request: Request) {
  return handleAuthCallback(request);
});
