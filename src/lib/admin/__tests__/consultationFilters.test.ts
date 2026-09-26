// Run: npx tsx --test "src/**/__tests__/*.test.ts"
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_FILTERS,
  appointmentRange,
  consultationNumberTerm,
  escapeLike,
  filtersToQuery,
  paidWithLabel,
  parseConsultationFilters,
  statusCondition,
} from '../consultationFilters';

test('no parameters → the working view', () => {
  assert.deepEqual(parseConsultationFilters({}), DEFAULT_FILTERS);
});

test('unknown values fall back to the defaults', () => {
  const f = parseConsultationFilters({
    status: 'drop table',
    date: 'yesterday',
    paid: '1=1',
    sort: 'random',
    vet: "x' or 1=1",
    page: '-3',
  });
  assert.equal(f.status, 'upcoming');
  assert.equal(f.date, 'all');
  assert.equal(f.paid, 'all');
  assert.equal(f.sort, 'soonest');
  assert.equal(f.vet, null);
  assert.equal(f.page, 1);
});

test('search text is trimmed, squeezed and capped', () => {
  assert.equal(parseConsultationFilters({ q: '  priya   sharma ' }).q, 'priya sharma');
  assert.equal(parseConsultationFilters({ q: 'a'.repeat(300) }).q.length, 100);
  assert.equal(parseConsultationFilters({ q: ['first', 'second'] }).q, 'first');
});

test('from/to make the range custom, are validated and swapped when reversed', () => {
  const f = parseConsultationFilters({ from: '2026-10-05', to: '2026-10-01' });
  assert.equal(f.date, 'custom');
  assert.equal(f.from, '2026-10-01');
  assert.equal(f.to, '2026-10-05');
  assert.equal(parseConsultationFilters({ from: '2026-02-30' }).from, null);
  assert.equal(parseConsultationFilters({ date: 'today', from: 'nope' }).date, 'today');
  assert.equal(parseConsultationFilters({ date: 'custom' }).from, null);
  // A preset beats leftover From/To values.
  const preset = parseConsultationFilters({ date: 'today', from: '2026-10-01', to: '2026-10-02' });
  assert.equal(preset.date, 'today');
  assert.equal(preset.from, null);
  assert.equal(parseConsultationFilters({ date: 'all', from: '2026-10-01' }).date, 'custom');
});

test('vet must be a uuid', () => {
  const id = '0B9C2E4A-1111-4222-8333-444455556666';
  assert.equal(parseConsultationFilters({ vet: id }).vet, id.toLowerCase());
});

test('India-time ranges', () => {
  // 00:10 IST on 3 Oct 2026 is still 2 Oct in UTC.
  const now = new Date('2026-10-02T18:40:00Z');
  const today = appointmentRange({ date: 'today', from: null, to: null }, now)!;
  assert.equal(today.start!.toISOString(), '2026-10-02T18:30:00.000Z');
  assert.equal(today.end!.toISOString(), '2026-10-03T18:30:00.000Z');

  const tomorrow = appointmentRange({ date: 'tomorrow', from: null, to: null }, now)!;
  assert.equal(tomorrow.start!.toISOString(), '2026-10-03T18:30:00.000Z');

  const next7 = appointmentRange({ date: 'next7', from: null, to: null }, now)!;
  assert.equal(next7.end!.toISOString(), '2026-10-09T18:30:00.000Z');

  const past7 = appointmentRange({ date: 'past7', from: null, to: null }, now)!;
  assert.equal(past7.start!.toISOString(), '2026-09-25T18:30:00.000Z');
  assert.equal(past7.end!.toISOString(), '2026-10-03T18:30:00.000Z');

  const custom = appointmentRange({ date: 'custom', from: '2026-10-01', to: '2026-10-01' }, now)!;
  assert.equal(custom.start!.toISOString(), '2026-09-30T18:30:00.000Z');
  assert.equal(custom.end!.toISOString(), '2026-10-01T18:30:00.000Z');

  const openEnded = appointmentRange({ date: 'custom', from: '2026-10-01', to: null }, now)!;
  assert.equal(openEnded.end, null);

  assert.equal(appointmentRange({ date: 'all', from: null, to: null }, now), null);
});

test('status conditions', () => {
  assert.deepEqual(statusCondition('upcoming'), { statuses: ['pending', 'scheduled'], outcome: null });
  assert.deepEqual(statusCondition('completed'), { statuses: ['closed'], outcome: 'success' });
  assert.deepEqual(statusCondition('failed'), { statuses: ['closed'], outcome: 'failed' });
  assert.deepEqual(statusCondition('all'), { statuses: null, outcome: null });
});

test('LIKE escaping and consultation numbers', () => {
  assert.equal(escapeLike('50%_off\\'), '50\\%\\_off\\\\');
  assert.equal(consultationNumberTerm('FUR-2026-0042'), 'FUR-2026-0042');
  assert.equal(consultationNumberTerm('a,b'), null);
  assert.equal(consultationNumberTerm('x.or(id.eq.1)'), null);
  assert.equal(consultationNumberTerm('priya sharma'), null);
});

test('addresses keep only non-default values', () => {
  assert.equal(filtersToQuery(DEFAULT_FILTERS), '');
  const f = parseConsultationFilters({ q: 'a b', status: 'all', paid: 'paid', page: '3' });
  assert.equal(filtersToQuery(f), '?q=a+b&status=all&paid=paid&page=3');
  assert.equal(filtersToQuery(f, { page: 1 }), '?q=a+b&status=all&paid=paid');
});

test('paid-with labels', () => {
  assert.equal(paidWithLabel('purchase'), 'Paid credit');
  assert.equal(paidWithLabel('invite'), 'Invite credit');
  assert.equal(paidWithLabel(null), 'No credit');
});
