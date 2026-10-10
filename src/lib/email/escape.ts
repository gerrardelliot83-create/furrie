/**
 * Making text people typed safe to put in an email (CX-1).
 *
 * Pet names, customer names, concerns, notes: anything a person typed goes
 * through escapeHtml() before it is placed in an email's HTML, so a pet named
 * `<a href=//x.co>Verify</a>` shows as that text instead of a live link in a
 * vet's inbox. Subjects are plain text, so they only lose line breaks.
 */

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A subject line on one line: no line breaks from a typed name. */
export function plainSubject(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}
