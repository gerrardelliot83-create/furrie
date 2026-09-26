// Run: npx tsx --test "src/**/__tests__/*.test.ts"
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { safeNextPath } from '../safeRedirect';

const ORIGIN = 'https://app.furrie.in';

test('keeps a plain path on this site, with query and hash', () => {
  assert.equal(safeNextPath('/dashboard', ORIGIN), '/dashboard');
  assert.equal(safeNextPath('/consultations/abc?tab=notes#top', ORIGIN), '/consultations/abc?tab=notes#top');
});

test('keeps /set-password (V: vet password recovery)', () => {
  assert.equal(safeNextPath('/set-password', 'https://vet.furrie.in'), '/set-password');
});

test('refuses other sites, however they are spelled (P0R-2)', () => {
  const attempts = [
    '//evil.com',
    '/\\evil.com',
    '\\\\evil.com',
    '/\t/evil.com', // `%09` after URL decoding
    '/\n/evil.com',
    '/\r/evil.com',
    'https://evil.com',
    'http://evil.com/dashboard',
    'javascript:alert(1)',
    'evil.com',
    '',
  ];
  for (const raw of attempts) {
    assert.equal(safeNextPath(raw, ORIGIN), '/dashboard', `should refuse ${JSON.stringify(raw)}`);
  }
});

test('an encoded backslash stays a harmless path on this site', () => {
  // `%5C` is not decoded by URL parsing, so this cannot become `//host`.
  const out = safeNextPath('/%5Cevil.com', ORIGIN);
  assert.ok(out.startsWith('/') && !out.startsWith('//'), out);
  assert.equal(new URL(out, ORIGIN).origin, ORIGIN);
});

test('missing value falls back', () => {
  assert.equal(safeNextPath(null, ORIGIN), '/dashboard');
  assert.equal(safeNextPath(undefined, ORIGIN), '/dashboard');
  assert.equal(safeNextPath(null, ORIGIN, '/set-password'), '/set-password');
});
