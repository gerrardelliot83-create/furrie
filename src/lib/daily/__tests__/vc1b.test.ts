// Run: npx tsx --test "src/**/__tests__/*.test.ts"
// VC-1b: how a consultation ends when the video call wasn't seen, the camera
// permission hint, and the vet's "customer joined" alert.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseMeetings, secondsTogether, type MeetingRecord } from '../meetings';
import { mediaPermissionHint } from '../callErrors';
import {
  decideFinishOutcome,
  decideStaleActiveOutcome,
  FINISH_CHOICE_OUTCOME,
  FINISH_CHOICES,
  isFinishChoice,
  MIN_SECONDS_TOGETHER,
  NEVER_OPENED_OUTCOME,
} from '../../scheduling/outcomes';
import { consultationPage } from '../../../components/layouts/VetLayout/vetEvents';

const VET = 'vet-user';
const PARENT = 'parent-user';
const T = Date.parse('2026-10-07T05:30:00.000Z') / 1000; // 11:00 IST, unix seconds
const min = (m: number) => m * 60;

/** A Daily participant row: joined `fromMin` minutes after T, stayed `forMin` minutes. */
const p = (userId: string | null, fromMin: number, forMin?: number) => ({
  user_id: userId,
  participant_id: `${userId}-${fromMin}`,
  join_time: T + min(fromMin),
  ...(forMin === undefined ? {} : { duration: min(forMin) }),
});

const meetings = (...list: Array<{ ongoing?: boolean; duration?: number; participants: unknown[] }>) =>
  parseMeetings({ total_count: list.length, data: list }, T + min(60));

// ── Daily's meeting records ───────────────────────────────────────────

test('meetings are read with each person’s join time and how long they stayed', () => {
  const [meeting] = meetings({ duration: min(20), participants: [p(VET, 5, 15), p(PARENT, 10, 10)] });
  assert.equal(meeting.durationSec, min(20));
  assert.deepEqual(meeting.sessions[0], { userId: VET, joinSec: T + min(5), leaveSec: T + min(20) });
  assert.deepEqual(meeting.sessions[1], { userId: PARENT, joinSec: T + min(10), leaveSec: T + min(20) });
});

test('someone still in an ongoing meeting counts until now; junk is skipped', () => {
  const [meeting] = meetings({ ongoing: true, participants: [p(PARENT, 50), 'junk', null, { user_id: VET }] });
  assert.equal(meeting.ongoing, true);
  assert.deepEqual(meeting.sessions[0], { userId: PARENT, joinSec: T + min(50), leaveSec: T + min(60) });
  // No join time: still "was in the room", never "together".
  assert.deepEqual(meeting.sessions[1], { userId: VET, joinSec: null, leaveSec: null });
  assert.equal(meeting.sessions.length, 2);
  assert.deepEqual(parseMeetings(null, 0), []);
  assert.deepEqual(parseMeetings({ data: 'nope' }, 0), []);
});

// ── Were they in the call together? ───────────────────────────────────

test('7 Oct: the vet and the pet parent were each in the room, never at the same time → 0 seconds together', () => {
  const record = meetings(
    { duration: min(16), participants: [p(VET, 1, 15)] },
    { duration: min(4), participants: [p(PARENT, 21, 4)] }
  );
  assert.equal(secondsTogether(record, VET, PARENT), 0);
});

test('a real call: the overlap of their time in the room', () => {
  const record = meetings({ duration: min(25), participants: [p(VET, 5, 15), p(PARENT, 10, 20)] });
  assert.equal(secondsTogether(record, VET, PARENT), min(10));
  assert.equal(secondsTogether(record, PARENT, VET), min(10));
});

test('a second tab or a lingering session of the same person is not counted twice', () => {
  const record = meetings({
    duration: min(30),
    participants: [p(VET, 0, 20), p(VET, 5, 10), p(PARENT, 2, 28)],
  });
  assert.equal(secondsTogether(record, VET, PARENT), min(18));
});

test('a dropped call and a rejoin (two meetings) add up', () => {
  const record = meetings(
    { duration: min(10), participants: [p(VET, 0, 10), p(PARENT, 2, 8)] },
    { duration: min(10), participants: [p(VET, 12, 10), p(PARENT, 13, 5)] }
  );
  assert.equal(secondsTogether(record, VET, PARENT), min(13));
});

test('still in the call together when Finish is pressed: counted until now', () => {
  const record = meetings({ ongoing: true, participants: [p(VET, 40), p(PARENT, 45)] });
  assert.equal(secondsTogether(record, VET, PARENT), min(15));
});

test('no ids, the same id twice, or nobody: never together', () => {
  const record: MeetingRecord[] = meetings({ participants: [p(VET, 0, 10), p(null, 0, 10)] });
  assert.equal(secondsTogether(record, VET, null), 0);
  assert.equal(secondsTogether(record, VET, VET), 0);
  assert.equal(secondsTogether([], VET, PARENT), 0);
});

// ── The vet's Finish ──────────────────────────────────────────────────

const seen = (secondsTogetherValue: number, customerSeen = true, vetSeen = true) => ({
  customerSeen,
  vetSeen,
  secondsTogether: secondsTogetherValue,
});

test('Daily saw them together: success exactly as before, whatever was sent', () => {
  for (const choice of [null, ...FINISH_CHOICES]) {
    assert.deepEqual(decideFinishOutcome({ callOpened: true, call: seen(min(12)), choice }), {
      action: 'close',
      outcome: 'success',
      reason: 'seen_together',
    });
  }
});

test('3 and 7 Oct: both in the room but never together → nothing recorded, the vet is asked', () => {
  assert.deepEqual(decideFinishOutcome({ callOpened: true, call: seen(0), choice: null }), {
    action: 'ask',
    customerSeen: true,
    vetSeen: true,
    dailyReachable: true,
    callOpened: true,
  });
});

test(`a few seconds together (under ${MIN_SECONDS_TOGETHER} s) is not a consultation`, () => {
  const decision = decideFinishOutcome({ callOpened: true, call: seen(MIN_SECONDS_TOGETHER - 1), choice: null });
  assert.equal(decision.action, 'ask');
});

test('Daily unreachable, or nobody pressed Join: the vet is asked', () => {
  assert.deepEqual(decideFinishOutcome({ callOpened: true, call: null, choice: null }), {
    action: 'ask',
    customerSeen: false,
    vetSeen: false,
    dailyReachable: false,
    callOpened: true,
  });
  const neverOpened = decideFinishOutcome({ callOpened: false, call: seen(0, false, false), choice: null });
  assert.equal(neverOpened.action, 'ask');
  assert.equal(neverOpened.action === 'ask' && neverOpened.callOpened, false);
});

test('the vet’s answer decides when the call wasn’t seen', () => {
  const answer = (choice: (typeof FINISH_CHOICES)[number]) =>
    decideFinishOutcome({ callOpened: true, call: seen(0, false, true), choice });
  assert.deepEqual(answer('happened_elsewhere'), { action: 'close', outcome: 'success', reason: 'happened_elsewhere' });
  assert.deepEqual(answer('customer_no_show'), { action: 'close', outcome: 'missed', reason: 'customer_no_show' });
  assert.deepEqual(answer('technical_problem'), { action: 'close', outcome: 'failed', reason: 'technical_problem' });
  // Also when Daily couldn't be asked or nobody pressed Join.
  assert.equal(decideFinishOutcome({ callOpened: false, call: null, choice: 'happened_elsewhere' }).action, 'close');
  for (const choice of FINISH_CHOICES) {
    const decision = decideFinishOutcome({ callOpened: false, call: null, choice });
    assert.equal(decision.action === 'close' && decision.outcome, FINISH_CHOICE_OUTCOME[choice]);
  }
});

test('only the three answers are accepted', () => {
  assert.equal(isFinishChoice('happened_elsewhere'), true);
  assert.equal(isFinishChoice('customer_no_show'), true);
  assert.equal(isFinishChoice('technical_problem'), true);
  assert.equal(isFinishChoice('success'), false);
  assert.equal(isFinishChoice(''), false);
  assert.equal(isFinishChoice(undefined), false);
});

// ── Nobody pressed Join ───────────────────────────────────────────────

test('nobody pressed Join by the end of the join window: failed (not the pet parent’s fault), not missed', () => {
  assert.deepEqual(NEVER_OPENED_OUTCOME, { outcome: 'failed', reason: 'nobody_connected' });
});

// ── The stale-call cron (an 'active' consultation the vet never finished) ──

/** What close-stale-active does with a Daily /meetings body. */
const staleCall = (meetingsList: Array<{ ongoing?: boolean; participants: unknown[] }>) => {
  const records = parseMeetings({ data: meetingsList }, T + min(120));
  const ids = [...new Set(records.flatMap((m) => m.sessions.flatMap((s) => (s.userId ? [s.userId] : []))))];
  return decideStaleActiveOutcome({
    attendance: {
      ongoing: records.some((m) => m.ongoing),
      participantUserIds: ids,
      secondsTogether: secondsTogether(records, VET, PARENT),
    },
    vetId: VET,
    customerId: PARENT,
    msSinceStart: min(100) * 1000,
  });
};

test('stale call: together for a real call → success', () => {
  assert.deepEqual(staleCall([{ participants: [p(VET, 1, 20), p(PARENT, 2, 18)] }]), {
    action: 'close',
    outcome: 'success',
    reason: 'seen_together',
  });
});

test('stale call, 7 Oct shape: the pet parent 05:31–05:33 and 05:32:52–05:33:14, the vet from 05:34:58 → failed, never together', () => {
  const at = (iso: string) => Date.parse(iso) / 1000;
  const session = (userId: string, fromIso: string, toIso: string) => ({
    user_id: userId,
    join_time: at(fromIso),
    duration: at(toIso) - at(fromIso),
  });
  const decision = staleCall([
    {
      participants: [
        session(PARENT, '2026-10-07T05:31:00Z', '2026-10-07T05:33:00Z'),
        session(PARENT, '2026-10-07T05:32:52Z', '2026-10-07T05:33:14Z'),
      ],
    },
    { participants: [session(VET, '2026-10-07T05:34:58Z', '2026-10-07T05:50:00Z')] },
  ]);
  assert.deepEqual(decision, { action: 'close', outcome: 'failed', reason: 'never_together' });
});

test(`stale call: both in the room but together under ${MIN_SECONDS_TOGETHER} s → failed, never together (not missed)`, () => {
  const decision = staleCall([{ participants: [p(VET, 0, 10), p(PARENT, 9.5, 5)] }]);
  assert.deepEqual(decision, { action: 'close', outcome: 'failed', reason: 'never_together' });
});

test('stale call: one person only, nobody, still in the call, Daily unreachable — as before', () => {
  assert.deepEqual(staleCall([{ participants: [p(VET, 0, 15)] }]), {
    action: 'close',
    outcome: 'missed',
    reason: 'customer_no_show',
  });
  assert.deepEqual(staleCall([{ participants: [p(PARENT, 0, 15)] }]), {
    action: 'close',
    outcome: 'failed',
    reason: 'vet_no_show',
  });
  assert.deepEqual(staleCall([]), { action: 'close', outcome: 'failed', reason: 'nobody_connected' });
  assert.deepEqual(staleCall([{ ongoing: true, participants: [p(VET, 0)] }]), {
    action: 'wait',
    reason: 'call_ongoing',
  });
  const unreachable = (msSinceStart: number) =>
    decideStaleActiveOutcome({ attendance: null, vetId: VET, customerId: PARENT, msSinceStart });
  assert.deepEqual(unreachable(min(100) * 1000), { action: 'wait', reason: 'daily_unreachable' });
  assert.deepEqual(unreachable(min(181) * 1000), { action: 'close', outcome: 'failed', reason: 'daily_unreachable' });
});

// ── Camera / microphone permission hint ───────────────────────────────

test('the browser is asking for the camera or microphone: say where to click Allow', () => {
  assert.equal(mediaPermissionHint('prompt', 'granted')?.kind, 'prompt');
  assert.equal(mediaPermissionHint('granted', 'prompt')?.kind, 'prompt');
  assert.match(mediaPermissionHint('prompt', 'prompt')?.message ?? '', /Click Allow.*address bar/);
});

test('blocked wins over asking, and says how to unblock', () => {
  const hint = mediaPermissionHint('prompt', 'denied');
  assert.equal(hint?.kind, 'denied');
  assert.match(hint?.message ?? '', /lock or settings icon.*reload/);
});

test('allowed, or the browser can’t tell: no hint', () => {
  assert.equal(mediaPermissionHint('granted', 'granted'), null);
  assert.equal(mediaPermissionHint(null, null), null);
  assert.equal(mediaPermissionHint(null, 'granted'), null);
});

// ── The vet's "customer joined" alert ─────────────────────────────────

test('the vet portal knows which consultation page, and whether it is the video room', () => {
  const id = 'cc569935-189a-4fb1-a7b0-3630c9647ac6';
  assert.deepEqual(consultationPage(`/consultations/${id}/room`), { consultationId: id, inRoom: true });
  assert.deepEqual(consultationPage(`/consultations/${id}/room/`), { consultationId: id, inRoom: true });
  assert.deepEqual(consultationPage(`/consultations/${id}`), { consultationId: id, inRoom: false });
  assert.deepEqual(consultationPage(`/consultations/${id}/soap`), { consultationId: id, inRoom: false });
  assert.deepEqual(consultationPage(`/vet-portal/consultations/${id}/room`), { consultationId: id, inRoom: true });
  assert.equal(consultationPage('/consultations'), null);
  assert.equal(consultationPage('/dashboard'), null);
  assert.equal(consultationPage(`/consultations/${id}/room/extra`), null);
});
