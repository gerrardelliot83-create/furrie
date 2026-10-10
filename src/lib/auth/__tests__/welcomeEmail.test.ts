// Run: npx tsx --test "src/**/__tests__/*.test.ts"
// CX-1: the welcome email goes once per account, not on every dashboard visit.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  WELCOME_EMAIL_ATTEMPT_KEY,
  WELCOME_EMAIL_MAX_ATTEMPTS,
  WELCOME_EMAIL_SENT_KEY,
  WELCOME_WINDOW_MS,
  shouldSendWelcomeEmail,
  welcomeEmailAttempt,
  welcomeEmailIdempotencyKey,
  welcomeEmailRecord,
} from '../welcomeEmailRule';

const NOW = Date.parse('2026-10-09T10:00:00.000Z');
const created = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const ID = '6aa5d0d4-2a9f-4483-b6c8-0cf4c6c98ac4';

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

test('it stops after the last allowed failed attempt', () => {
  const meta = (attempt: number) => ({ [WELCOME_EMAIL_ATTEMPT_KEY]: attempt });
  const base = { email: 'a@b.in', createdAt: created(60_000), now: NOW };
  assert.equal(shouldSendWelcomeEmail({ ...base, appMetadata: meta(WELCOME_EMAIL_MAX_ATTEMPTS - 1) }), true);
  assert.equal(shouldSendWelcomeEmail({ ...base, appMetadata: meta(WELCOME_EMAIL_MAX_ATTEMPTS) }), false);
});

test('one key per account and attempt: racing renders share it, a retry after a failure does not', () => {
  assert.equal(welcomeEmailIdempotencyKey(ID, 0), welcomeEmailIdempotencyKey(ID, 0));
  assert.notEqual(welcomeEmailIdempotencyKey(ID, 0), welcomeEmailIdempotencyKey(ID, 1));
  assert.notEqual(welcomeEmailIdempotencyKey(ID, 0), welcomeEmailIdempotencyKey('another', 0));
  assert.equal(welcomeEmailAttempt({ [WELCOME_EMAIL_ATTEMPT_KEY]: 2 }), 2);
  assert.equal(welcomeEmailAttempt({ [WELCOME_EMAIL_ATTEMPT_KEY]: 'x' }), 0);
  assert.equal(welcomeEmailAttempt(undefined), 0);
});

test('what is recorded after each kind of answer from Resend', () => {
  const at = new Date(NOW);
  const sent = { [WELCOME_EMAIL_SENT_KEY]: at.toISOString() };
  assert.deepEqual(welcomeEmailRecord({ success: true }, 0, at), sent);
  // An earlier send with this key went through.
  assert.deepEqual(welcomeEmailRecord({ success: false, idempotency: 'already_used' }, 0, at), sent);
  // Another render is sending it now: that one records the result.
  assert.equal(welcomeEmailRecord({ success: false, idempotency: 'in_progress' }, 0, at), null);
  // Failed (429, 5xx): next render tries again under a new key.
  assert.deepEqual(welcomeEmailRecord({ success: false }, 1, at), { [WELCOME_EMAIL_ATTEMPT_KEY]: 2 });
});
