// Run: npx tsx --test "src/**/__tests__/*.test.ts"
// VC-1: the video call join fix (rules that decide who gets into the room).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ROOM_MAX_PARTICIPANTS, roomExpiryFor, roomNeedsUpdate } from '../roomLife';
import { parsePresence, sessionsToEject, type PresenceSession } from '../roomCleanup';
import { describeCameraError, describeFatalError } from '../callErrors';
import { joinWindowState, JOIN_WINDOW_BEFORE_MINUTES } from '../../scheduling/joinWindow';
import { chromeIntentUrl, detectInAppBrowser } from '../../utils/inAppBrowser';
import { postSignInPath } from '../../auth/safeRedirect';

const START = '2026-10-07T05:30:00.000Z'; // 11:00 IST
const startSec = Date.parse(START) / 1000;

// ── Room life ─────────────────────────────────────────────────────────

test('the room stays open until the booking time + 90 minutes, not 35 minutes after the first click', () => {
  // 7 Oct: first click at 11:01:19 IST. The old rule closed the room at 11:36:19.
  const firstClick = Date.parse('2026-10-07T05:31:19.000Z');
  assert.equal(roomExpiryFor(START, firstClick), startSec + 90 * 60);
});

test('someone joining late still gets at least 30 minutes', () => {
  const lateJoin = Date.parse(START) + 80 * 60 * 1000;
  assert.equal(roomExpiryFor(START, lateJoin), lateJoin / 1000 + 30 * 60);
});

test('no booking time: 90 minutes from now', () => {
  const now = Date.parse(START);
  assert.equal(roomExpiryFor(null, now), now / 1000 + 90 * 60);
});

test('rooms made before VC-1 (2 places, 35-minute life) are updated', () => {
  const wanted = startSec + 90 * 60;
  assert.equal(roomNeedsUpdate({ exp: startSec + 35 * 60, max_participants: 4 }, wanted), true);
  assert.equal(roomNeedsUpdate({ exp: wanted, max_participants: 2 }, wanted), true);
  assert.equal(roomNeedsUpdate({ exp: wanted, max_participants: ROOM_MAX_PARTICIPANTS }, wanted), false);
  assert.equal(roomNeedsUpdate({ exp: wanted - 30, max_participants: ROOM_MAX_PARTICIPANTS }, wanted), false);
  assert.equal(roomNeedsUpdate(null, wanted), true);
});

// ── Room clean-up: the pet parent always gets in ───────────────────────

const VET = 'vet-user';
const PARENT = 'parent-user';
const s = (id: string, userId: string | null, joinedIso: string): PresenceSession => ({
  id,
  userId,
  joinTimeMs: Date.parse(joinedIso),
});

test('7 Oct: the vet twice in the room, the pet parent joins — the vet keeps only her newest session', () => {
  const room = [s('vet-1', VET, '2026-10-07T05:34:58Z'), s('vet-3', VET, '2026-10-07T05:37:19Z')];
  assert.deepEqual(sessionsToEject(room, { callerUserId: PARENT, otherUserId: VET }), ['vet-1']);
});

test('the vet rejoins: all her earlier sessions go, the pet parent keeps their newest', () => {
  const room = [
    s('vet-1', VET, '2026-10-07T05:34:58Z'),
    s('parent-2', PARENT, '2026-10-07T05:36:00Z'),
    s('vet-2', VET, '2026-10-07T05:36:04Z'),
    s('parent-1', PARENT, '2026-10-07T05:35:00Z'),
  ];
  assert.deepEqual(
    sessionsToEject(room, { callerUserId: VET, otherUserId: PARENT }).sort(),
    ['parent-1', 'vet-1', 'vet-2']
  );
});

test('the pet parent is never removed when the vet joins, and never removed by their own other copies order', () => {
  const room = [s('parent-1', PARENT, '2026-10-07T05:35:00Z')];
  assert.deepEqual(sessionsToEject(room, { callerUserId: VET, otherUserId: PARENT }), []);
});

test('anyone who is neither of the two goes', () => {
  const room = [s('x', 'someone-else', '2026-10-07T05:35:00Z'), s('y', null, '2026-10-07T05:35:00Z')];
  assert.deepEqual(sessionsToEject(room, { callerUserId: PARENT, otherUserId: VET }).sort(), ['x', 'y']);
});

test('after the clean-up at most one session is left, so the room is never full', () => {
  const room = Array.from({ length: 6 }, (_, i) => s(`v${i}`, VET, `2026-10-07T05:3${i}:00Z`));
  const ejected = sessionsToEject(room, { callerUserId: PARENT, otherUserId: VET });
  assert.equal(room.length - ejected.length, 1);
  assert.ok(!ejected.includes('v5'), 'the newest vet session stays');
});

test('presence parsing follows Daily’s field names and skips junk', () => {
  const sessions = parsePresence({
    total_count: 3,
    data: [
      { id: 'a', userId: VET, joinTime: '2026-10-07T05:34:58.000Z' },
      { id: '', userId: VET },
      'junk',
      { id: 'b', userId: '', joinTime: 'not a date' },
    ],
  });
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].joinTimeMs, Date.parse('2026-10-07T05:34:58.000Z'));
  assert.equal(sessions[1].userId, null);
  assert.ok(Number.isNaN(sessions[1].joinTimeMs));
  assert.deepEqual(parsePresence(null), []);
});

// ── Messages ──────────────────────────────────────────────────────────

test('every Daily fatal error type has a plain message; unknown ones get a fallback', () => {
  for (const type of ['ejected', 'nbf-room', 'nbf-token', 'exp-room', 'exp-token', 'no-room', 'meeting-full', 'end-of-life', 'not-allowed', 'connection-error']) {
    const problem = describeFatalError(type);
    assert.equal(problem.kind, type);
    assert.notEqual(problem.title, 'The call stopped', `${type} should have its own message`);
  }
  assert.equal(describeFatalError('something-new').title, 'The call stopped');
  assert.equal(describeFatalError(undefined).kind, 'unknown');
});

test('camera problems say what to do', () => {
  assert.match(describeCameraError('permissions').message, /Allow/);
  assert.match(describeCameraError('undefined-mediadevices').message, /Chrome|Safari/);
  assert.equal(describeCameraError(null).kind, 'camera:unknown');
});

// ── Join window ───────────────────────────────────────────────────────

test(`the call opens ${JOIN_WINDOW_BEFORE_MINUTES} minutes early and closes 45 minutes after the start`, () => {
  const start = Date.parse(START);
  assert.deepEqual(joinWindowState(START, start - 11 * 60 * 1000), { phase: 'early', opensInMs: 60 * 1000 });
  assert.deepEqual(joinWindowState(START, start - 10 * 60 * 1000), { phase: 'open' });
  assert.deepEqual(joinWindowState(START, start + 45 * 60 * 1000), { phase: 'open' });
  assert.deepEqual(joinWindowState(START, start + 46 * 60 * 1000), { phase: 'over' });
});

// ── In-app browsers ───────────────────────────────────────────────────

test('Instagram and Facebook browsers are recognised; Chrome and Safari are not', () => {
  const igAndroid =
    'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0.0';
  const igIos =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0';
  const fbIos = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]';
  const otherWebView = 'Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36';
  const chrome = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
  const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

  assert.deepEqual(detectInAppBrowser(igAndroid), { app: 'Instagram', platform: 'android' });
  assert.deepEqual(detectInAppBrowser(igIos), { app: 'Instagram', platform: 'ios' });
  assert.deepEqual(detectInAppBrowser(fbIos), { app: 'Facebook', platform: 'ios' });
  assert.deepEqual(detectInAppBrowser(otherWebView), { app: null, platform: 'android' });
  assert.equal(detectInAppBrowser(chrome), null);
  assert.equal(detectInAppBrowser(safari), null);
  assert.equal(detectInAppBrowser(''), null);
});

test('the Android "Open in Chrome" link keeps the page and only accepts https', () => {
  assert.equal(
    chromeIntentUrl('https://app.furrie.in/consultations/abc/room?x=1'),
    'intent://app.furrie.in/consultations/abc/room?x=1#Intent;scheme=https;package=com.android.chrome;end'
  );
  assert.equal(chromeIntentUrl('javascript:alert(1)'), null);
  assert.equal(chromeIntentUrl('not a url'), null);
});

// ── After sign-in ─────────────────────────────────────────────────────

test('after sign-in the pet parent goes back to their consultation, never to another site', () => {
  const origin = 'https://app.furrie.in';
  const id = 'cc569935-189a-4fb1-a7b0-3630c9647ac6';
  assert.equal(postSignInPath(`/consultations/${id}`, origin), `/consultations/${id}`);
  assert.equal(postSignInPath(`/consultations/${id}/room`, origin), `/consultations/${id}/room`);
  assert.equal(postSignInPath('/buy', origin), '/dashboard');
  assert.equal(postSignInPath(null, origin), '/dashboard');
  assert.equal(postSignInPath('//evil.com/consultations/x', origin), '/dashboard');
  assert.equal(postSignInPath(`https://evil.com/consultations/${id}`, origin), '/dashboard');
  assert.equal(postSignInPath(`/consultations/${id}?next=//evil.com`, origin), '/dashboard');
});
