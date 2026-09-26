/**
 * Where a sign-in link may send someone afterwards: a path on this site, never
 * another site.
 *
 * `new URL()` (and browsers) quietly repair malformed paths: tabs and newlines
 * are dropped and a backslash becomes a slash, so `next=/\evil.com` or
 * `next=/%09/evil.com` turns into `//evil.com`, which is another site (P0R-2,
 * the residue of SEC-10). A backslash or any control character is refused
 * outright, and whatever is left must still resolve to this origin.
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

  let target: URL;
  try {
    target = new URL(raw, origin);
  } catch {
    return fallback;
  }
  if (target.origin !== new URL(origin).origin) return fallback;

  return `${target.pathname}${target.search}${target.hash}`;
}
