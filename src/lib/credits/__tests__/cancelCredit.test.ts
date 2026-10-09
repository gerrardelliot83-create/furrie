// Run: npx tsx --test "src/**/__tests__/*.test.ts"
// CX-1: the customer is told whether cancelling returns their credit.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  bookingUsesCredit,
  cancelCreditNotice,
  cancelReturnsCredit,
  cancelledMessage,
} from '../cancelCredit';

const START = Date.parse('2026-10-10T10:30:00.000Z');
const iso = new Date(START).toISOString();
const MIN = 60 * 1000;

test('more than 5 minutes before the start returns the credit; 5 or less does not', () => {
  assert.equal(cancelReturnsCredit(iso, START - 6 * MIN), true);
  assert.equal(cancelReturnsCredit(iso, START - 5 * MIN), false);
  assert.equal(cancelReturnsCredit(iso, START - 2 * MIN), false);
  assert.equal(cancelReturnsCredit(null, START), false);
  assert.equal(cancelReturnsCredit('not a date', START), false);
});

test('only a confirmed, non-Plus booking took a credit', () => {
  assert.equal(bookingUsesCredit('scheduled', false), true);
  assert.equal(bookingUsesCredit('scheduled', null), true);
  assert.equal(bookingUsesCredit('scheduled', true), false);
  assert.equal(bookingUsesCredit('pending', false), false);
});

test('the confirm dialog says which case applies', () => {
  assert.match(
    cancelCreditNotice({ usesCredit: true, scheduledAt: iso, now: START - 60 * MIN }) ?? '',
    /returns your consultation credit/
  );
  assert.match(
    cancelCreditNotice({ usesCredit: true, scheduledAt: iso, now: START - 3 * MIN }) ?? '',
    /less than 5 minutes to the start, so cancelling now uses your credit/
  );
  assert.equal(cancelCreditNotice({ usesCredit: false, scheduledAt: iso, now: START - 60 * MIN }), null);
});

test('the message afterwards follows creditReturned', () => {
  assert.match(
    cancelledMessage({ creditReturned: true, usesCredit: true, returnExpected: true }),
    /credit is back/
  );
  assert.match(
    cancelledMessage({ creditReturned: false, usesCredit: true, returnExpected: false }),
    /less than 5 minutes/
  );
  assert.match(
    cancelledMessage({ creditReturned: false, usesCredit: true, returnExpected: true }),
    /could not return your credit/
  );
  assert.equal(
    cancelledMessage({ creditReturned: false, usesCredit: false, returnExpected: true }),
    'Consultation cancelled.'
  );
});
