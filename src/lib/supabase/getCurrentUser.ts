import { cache } from 'react';
import { createClient } from './server';

// Request-scoped auth lookup. Per audit F-04 (D-1 option A).
//
// React's cache() deduplicates within a single request, so multiple
// page-level callers in the same render pass share one auth round-trip
// instead of one per call. The middleware still does its own getUser()
// for routing — that round-trip is independent.
//
// Always use getUser() (validates against auth server) over getSession()
// (reads from JWT only). The Supabase docs are explicit about this and
// cache() does not weaken the guarantee since it caches a verified result.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error, supabase };
});
