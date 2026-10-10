// Run: npx tsx --test "src/**/__tests__/*.test.ts"
// CX-1: the customer is told whether cancelling returns their credit.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  bookingUsesCredit,
  cancelCreditNotice,
  cancelReturnsCredit,
  cancelledMessage,
  cancelledToastType,
  readCancelCreditOutcome,
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

test('the message afterwards follows the server outcome, not the phone clock', () => {
  assert.match(cancelledMessage('returned'), /credit is back/);
  assert.match(cancelledMessage('too_late'), /less than 5 minutes/);
  assert.match(cancelledMessage('release_failed'), /could not return your credit/);
  assert.equal(cancelledMessage('no_credit_used'), 'Consultation cancelled.');
  assert.equal(cancelledMessage(null), 'Consultation cancelled.');
  assert.equal(cancelledToastType('release_failed'), 'warning');
  assert.equal(cancelledToastType('too_late'), 'success');
});

test('the outcome is read from the response; older responses fall back to creditReturned', () => {
  assert.equal(readCancelCreditOutcome({ creditOutcome: 'too_late', creditReturned: false }), 'too_late');
  assert.equal(readCancelCreditOutcome({ creditOutcome: 'returned', creditReturned: true }), 'returned');
  assert.equal(readCancelCreditOutcome({ creditReturned: true }), 'returned');
  assert.equal(readCancelCreditOutcome({ creditReturned: false }), null);
  assert.equal(readCancelCreditOutcome({ creditOutcome: 'something else' }), null);
  assert.equal(readCancelCreditOutcome(null), null);
});
