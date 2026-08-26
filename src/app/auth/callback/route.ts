import { handleAuthCallback } from '@/lib/auth/handleAuthCallback';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleAuthCallback(request);
}
