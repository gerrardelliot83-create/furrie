// Run: npx tsx --test "src/**/__tests__/*.test.ts"
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseCustomerConsultationPatch } from '../consultationMapper';

test('accepts the three shapes the web and mobile apps send', () => {
  // CancelConsultationButton + mobile history/[id]
  assert.deepEqual(parseCustomerConsultationPatch({ status: 'cancelled' }), { kind: 'cancel' });
  // ConsultationDetailContent
  assert.deepEqual(parseCustomerConsultationPatch({ status: 'closed', outcome: 'cancelled' }), { kind: 'cancel' });
  // EditConcernForm
  assert.deepEqual(
    parseCustomerConsultationPatch({ concernText: 'Limping since Monday', symptomCategories: ['mobility'] }),
    { kind: 'edit', update: { concern_text: 'Limping since Monday', symptom_categories: ['mobility'] } }
  );
  // mobile edit leaves concernText out when blank
  assert.deepEqual(parseCustomerConsultationPatch({ symptomCategories: [] }), {
    kind: 'edit',
    update: { symptom_categories: [] },
  });
});

test('refuses every field the service-role write must never take from a customer (SEC-3)', () => {
  const smuggled = [
    { vetId: '00000000-0000-4000-8000-000000000001' },
    { amountPaid: 0 },
    { paymentId: '00000000-0000-4000-8000-000000000002' },
    { dailyRoomName: 'furrie-someone-else' },
    { dailyRoomUrl: 'https://x.daily.co/r' },
    { recordingId: 'r' },
    { recordingUrl: 'https://x' },
    { startedAt: '2026-01-01T00:00:00Z' },
    { endedAt: '2026-01-01T00:00:00Z' },
    { durationMinutes: 600 },
    { wasExtended: true },
    { isFree: true },
    { customerId: '00000000-0000-4000-8000-000000000003' },
  ];
  for (const body of smuggled) {
    assert.equal(parseCustomerConsultationPatch(body).kind, 'invalid', JSON.stringify(body));
  }
});

test('refuses other statuses and outcomes (free consultation, fake success)', () => {
  for (const body of [
    { status: 'scheduled' },
    { status: 'active' },
    { status: 'closed' },
    { status: 'closed', outcome: 'success' },
    { status: 'closed', outcome: 'missed' },
    { outcome: 'cancelled' },
  ]) {
    assert.equal(parseCustomerConsultationPatch(body).kind, 'invalid', JSON.stringify(body));
  }
});

test('refuses a valid shape with anything extra attached', () => {
  for (const body of [
    { status: 'cancelled', vetId: 'x' },
    { status: 'closed', outcome: 'cancelled', amountPaid: 0 },
    { concernText: 'x', vetId: 'x' },
    { symptomCategories: [], dailyRoomName: 'furrie-x' },
  ]) {
    assert.equal(parseCustomerConsultationPatch(body).kind, 'invalid', JSON.stringify(body));
  }
});

test('refuses malformed bodies and values', () => {
  for (const body of [null, undefined, 'cancel', 42, [], {}, { concernText: 42 }, { symptomCategories: 'x' },
    { symptomCategories: [1] }, { concernText: 'x'.repeat(2001) }, { symptomCategories: Array(21).fill('a') }]) {
    assert.equal(parseCustomerConsultationPatch(body).kind, 'invalid', JSON.stringify(body));
  }
});
