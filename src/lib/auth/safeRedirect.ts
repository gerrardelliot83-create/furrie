/**
 * Where a sign-in link may send someone afterwards: a path on this site, never
 * another site.
 *
 * `new URL()` (and browsers) quietly repair malformed paths: tabs and newlines
 * are dropped and a backslash becomes a slash, so `next=/\evil.com` or
 * `next=/%09/evil.com` turns into `//evil.com`, which is another site (P0R-2,
 * the residue of SEC-10). A backslash or any control character is refused
 * outright, and whatever is left must still resolve to this origin.
 *
 * Dot segments are resolved by the parser too (`/.//evil.com`,
 * `/%2e%2e//evil.com` → path `//evil.com`), so the path we return is checked
 * again: it must not start with `//`, and the exact string handed back must
 * itself resolve to this origin.
 */
export function safeNextPath(
  raw: string | null | undefined,
  origin: string,
  fallback = '/dashboard'
): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;

  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    // Control characters (incl. tab, newline), DEL and backslash.
    if (code < 0x20 || code === 0x7f || code === 0x5c) return fallback;
  }

  const ownOrigin = new URL(origin).origin;
  let target: URL;
  try {
    target = new URL(raw, origin);
  } catch {
    return fallback;
  }
  if (target.origin !== ownOrigin || target.pathname.startsWith('//')) return fallback;

  const result = `${target.pathname}${target.search}${target.hash}`;
  // The caller resolves `result` against the origin again: it must stay here.
  return new URL(result, origin).origin === ownOrigin ? result : fallback;
}

/**
 * Where the customer sign-in form goes after the code (VC-1): back to a
 * consultation the person was sent to sign in from (a reminder email's
 * "Open your consultation"), otherwise the dashboard. Only consultation pages:
 * the dashboard's first render also runs the sign-in tasks (welcome email,
 * invite, founding credit), so other pages keep going there first.
 */
export function postSignInPath(raw: string | null | undefined, origin: string): string {
  const path = safeNextPath(raw, origin);
  return /^\/consultations\/[0-9a-f-]{36}(\/room)?$/i.test(path) ? path : '/dashboard';
}
