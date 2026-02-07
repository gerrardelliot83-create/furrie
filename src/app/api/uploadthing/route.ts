import { createRouteHandler } from 'uploadthing/next';
import { ourFileRouter } from '@/lib/uploadthing/core';

// Export routes for Next.js App Router
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: {
    // Optional: Custom callback URL (defaults to /api/uploadthing)
    // callbackUrl: '/api/uploadthing',
  },
});
