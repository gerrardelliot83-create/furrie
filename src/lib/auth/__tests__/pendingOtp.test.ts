// Run: npx tsx --test "src/**/__tests__/*.test.ts"
// CX-1: a reload while fetching the code returns to the code step.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PENDING_OTP_MAX_AGE_MS,
  PENDING_OTP_STORAGE_KEY,
  clearPendingOtp,
  readPendingOtp,
  savePendingOtp,
} from '../pendingOtp';

const NOW = Date.parse('2026-10-09T10:00:00.000Z');

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

test('after a reload the form returns to the code step for the same email', () => {
  const storage = memoryStorage();
  savePendingOtp('priya@example.in', NOW, storage);
  assert.deepEqual(readPendingOtp(NOW + 2 * 60_000, storage), { email: 'priya@example.in', sentAt: NOW });
});

test('"use a different email" and signing in forget it', () => {
  const storage = memoryStorage();
  savePendingOtp('priya@example.in', NOW, storage);
  clearPendingOtp(storage);
  assert.equal(readPendingOtp(NOW, storage), null);
});

test('an old or broken entry is dropped', () => {
  const storage = memoryStorage();
  savePendingOtp('priya@example.in', NOW, storage);
  assert.equal(readPendingOtp(NOW + PENDING_OTP_MAX_AGE_MS + 1, storage), null);
  assert.equal(storage.map.has(PENDING_OTP_STORAGE_KEY), false);

  storage.setItem(PENDING_OTP_STORAGE_KEY, '{not json');
  assert.equal(readPendingOtp(NOW, storage), null);
  storage.setItem(PENDING_OTP_STORAGE_KEY, JSON.stringify({ email: 'no-at-sign', sentAt: NOW }));
  assert.equal(readPendingOtp(NOW, storage), null);
});

test('private mode (storage throws) still works: nothing is saved, nothing breaks', () => {
  assert.doesNotThrow(() => savePendingOtp('priya@example.in', NOW, throwingStorage));
  assert.doesNotThrow(() => clearPendingOtp(throwingStorage));
  assert.equal(readPendingOtp(NOW, throwingStorage), null);
  assert.equal(readPendingOtp(NOW, null), null);
});
