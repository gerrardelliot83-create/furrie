// Run: npx tsx --test "src/**/__tests__/*.test.ts"
// CX-1: a whole code put into one box (iOS "From Mail", keyboard suggestion,
// autofill) fills every box; typing one digit still fills one box.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyOtpInput } from '../otpDigits';

const LENGTH = 8;
const empty = () => Array.from({ length: LENGTH }, () => '');
const fromCode = (code: string) => {
  const d = empty();
  code.split('').forEach((c, i) => (d[i] = c));
  return d;
};

test('the whole code in the first box fills every box', () => {
  const result = applyOtpInput({ digits: empty(), index: 0, rawValue: '12345678', caret: 8, length: LENGTH });
  assert.equal(result?.digits.join(''), '12345678');
  assert.equal(result?.focusIndex, LENGTH - 1);
});

test('the whole code in any other box fills every box from the start', () => {
  const result = applyOtpInput({ digits: fromCode('12'), index: 4, rawValue: '87654321', caret: 8, length: LENGTH });
  assert.equal(result?.digits.join(''), '87654321');
});

test('a code with spaces or a dash still fills every box', () => {
  const result = applyOtpInput({ digits: empty(), index: 0, rawValue: '1234 5678', caret: 9, length: LENGTH });
  assert.equal(result?.digits.join(''), '12345678');
});

test('the code inserted next to an old digit keeps the code, not the old digit', () => {
  const after = applyOtpInput({ digits: fromCode('9'), index: 0, rawValue: '912345678', caret: 9, length: LENGTH });
  assert.equal(after?.digits.join(''), '12345678');
  const before = applyOtpInput({ digits: fromCode('9'), index: 0, rawValue: '123456789', caret: 8, length: LENGTH });
  assert.equal(before?.digits.join(''), '12345678');
});

test('autofill "1234 5678" into a box holding a digit drops the old digit, separators or not', () => {
  const after = applyOtpInput({ digits: fromCode('9'), index: 0, rawValue: '91234 5678', caret: 10, length: LENGTH });
  assert.equal(after?.digits.join(''), '12345678');
  const before = applyOtpInput({ digits: fromCode('9'), index: 0, rawValue: '1234-56789', caret: 9, length: LENGTH });
  assert.equal(before?.digits.join(''), '12345678');
  // The old digit is also the code's first and last digit: the caret decides.
  const sameAfter = applyOtpInput({ digits: fromCode('1'), index: 0, rawValue: '11234 5671', caret: 10, length: LENGTH });
  assert.equal(sameAfter?.digits.join(''), '12345671');
  const sameBefore = applyOtpInput({ digits: fromCode('1'), index: 0, rawValue: '1234 56711', caret: 9, length: LENGTH });
  assert.equal(sameBefore?.digits.join(''), '12345671');
});

test('typing one digit fills one box and moves on', () => {
  const result = applyOtpInput({ digits: fromCode('12'), index: 2, rawValue: '3', caret: 1, length: LENGTH });
  assert.equal(result?.digits.join(''), '123');
  assert.equal(result?.focusIndex, 3);
});

test('typing over a filled box keeps the new digit', () => {
  const after = applyOtpInput({ digits: fromCode('123'), index: 1, rawValue: '25', caret: 2, length: LENGTH });
  assert.equal(after?.digits.join(''), '153');
  const before = applyOtpInput({ digits: fromCode('123'), index: 1, rawValue: '52', caret: 1, length: LENGTH });
  assert.equal(before?.digits.join(''), '153');
});

test('a letter is ignored and clearing a box empties it', () => {
  assert.equal(applyOtpInput({ digits: fromCode('12'), index: 2, rawValue: 'a', caret: 1, length: LENGTH }), null);
  const cleared = applyOtpInput({ digits: fromCode('123'), index: 2, rawValue: '', caret: 0, length: LENGTH });
  assert.equal(cleared?.digits.join(''), '12');
});

test('part of a code spreads from the box it went into', () => {
  const result = applyOtpInput({ digits: fromCode('12'), index: 2, rawValue: '345', caret: 3, length: LENGTH });
  assert.equal(result?.digits.join(''), '12345');
  assert.equal(result?.focusIndex, 5);
});
