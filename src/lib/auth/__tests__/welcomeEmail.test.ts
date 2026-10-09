// Run: npx tsx --test "src/**/__tests__/*.test.ts"
// CX-1: the welcome email goes once per account, not on every dashboard visit.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  WELCOME_EMAIL_SENT_KEY,
  WELCOME_WINDOW_MS,
  shouldSendWelcomeEmail,
  welcomeEmailIdempotencyKey,
} from '../welcomeEmailRule';

const NOW = Date.parse('2026-10-09T10:00:00.000Z');
const created = (msAgo: number) => new Date(NOW - msAgo).toISOString();

test('a new account without the marker gets the welcome email', () => {
  assert.equal(
    shouldSendWelcomeEmail({ email: 'a@b.in', createdAt: created(60_000), appMetadata: { provider: 'email' }, now: NOW }),
    true
  );
});

test('once sent, later dashboard visits do not send it again', () => {
  assert.equal(
    shouldSendWelcomeEmail({
      email: 'a@b.in',
      createdAt: created(60_000),
      appMetadata: { provider: 'email', [WELCOME_EMAIL_SENT_KEY]: new Date(NOW).toISOString() },
      now: NOW,
    }),
    false
  );
});

test('older accounts, missing email or unreadable dates never get one', () => {
  assert.equal(
    shouldSendWelcomeEmail({ email: 'a@b.in', createdAt: created(WELCOME_WINDOW_MS + 1), appMetadata: {}, now: NOW }),
    false
  );
  assert.equal(shouldSendWelcomeEmail({ email: null, createdAt: created(0), appMetadata: {}, now: NOW }), false);
  assert.equal(shouldSendWelcomeEmail({ email: 'a@b.in', createdAt: 'nope', appMetadata: {}, now: NOW }), false);
});

test('one idempotency key per account, so two renders racing send one email', () => {
  const id = '6aa5d0d4-2a9f-4483-b6c8-0cf4c6c98ac4';
  assert.equal(welcomeEmailIdempotencyKey(id), welcomeEmailIdempotencyKey(id));
  assert.notEqual(welcomeEmailIdempotencyKey(id), welcomeEmailIdempotencyKey('another'));
});
