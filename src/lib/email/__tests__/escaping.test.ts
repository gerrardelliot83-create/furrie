// Run: npx tsx --test "src/**/__tests__/*.test.ts"
// CX-1: text people typed (pet names, customer names) is escaped in emails.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  bookingConfirmationEmail,
  carePlanCreatedEmail,
  vetConsultationCancelledEmail,
  vetNewBookingEmail,
  vetOneHourReminderEmail,
  welcomeEmail,
} from '../templates';
import { escapeHtml, plainSubject } from '../escape';

const EVIL_PET = '<a href=//x.co>Verify</a>';
const ESCAPED_PET = '&lt;a href=//x.co&gt;Verify&lt;/a&gt;';
const START = '2026-10-10T10:30:00.000Z'; // 4:00 pm IST

test('a pet name that is a link is plain text in the vet booking email', () => {
  const { html } = vetNewBookingEmail({
    vetName: 'Asha Rao',
    customerName: '<img src=x onerror=alert(1)>',
    petName: EVIL_PET,
    petSpecies: 'dog"><script>',
    scheduledAt: START,
    consultationNumber: 'FUR-20261010-0001',
    isPriority: false,
  });
  assert.ok(html.includes(ESCAPED_PET));
  assert.ok(!html.includes('<a href=//x.co>'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('a pet name that is a link is plain text in the customer booking confirmation', () => {
  const { html } = bookingConfirmationEmail({
    customerName: 'Ravi <b>',
    petName: EVIL_PET,
    vetName: 'Asha Rao',
    scheduledAt: START,
    consultationNumber: 'FUR-20261010-0001',
  });
  assert.ok(html.includes(ESCAPED_PET));
  assert.ok(!html.includes('<a href=//x.co>'));
  assert.ok(html.includes('Hey Ravi &lt;b&gt;,'));
});

test('the vet reminder and care plan emails escape names too', () => {
  const reminder = vetOneHourReminderEmail({
    vetName: 'Asha',
    petName: EVIL_PET,
    customerName: 'Ravi',
    scheduledAt: START,
  });
  assert.ok(!reminder.html.includes('<a href=//x.co>'));

  const plan = carePlanCreatedEmail({
    customerName: 'Ravi',
    petName: EVIL_PET,
    vetName: 'Asha',
    planTitle: '<i>Diet</i>',
    planCategory: 'diet',
    stepCount: 2,
    petId: '00000000-0000-0000-0000-000000000000',
  });
  assert.ok(!plan.html.includes('<a href=//x.co>'));
  assert.ok(!plan.html.includes('<i>Diet</i>'));
});

test('welcome email: no "Welcome to Furrie, User" for a code sign-in', () => {
  assert.equal(welcomeEmail({ customerName: 'User' }).subject, 'Welcome to Furrie');
  assert.equal(welcomeEmail({ customerName: '' }).subject, 'Welcome to Furrie');
  assert.equal(welcomeEmail({ customerName: 'there' }).subject, 'Welcome to Furrie');
  assert.equal(welcomeEmail({ customerName: 'Priya' }).subject, 'Welcome to Furrie, Priya');
  assert.ok(welcomeEmail({ customerName: 'User' }).html.includes('Hey there,'));
});

test('vet cancellation email: pet and time in the subject, names escaped in the body', () => {
  const { subject, html } = vetConsultationCancelledEmail({
    vetName: 'Dr. Asha Rao',
    petName: EVIL_PET,
    petSpecies: 'cat',
    customerName: 'Ravi',
    scheduledAt: START,
    consultationNumber: 'FUR-20261010-0001',
  });
  assert.match(subject, /^Consultation cancelled: .+, .*4:00\s?pm IST$/i);
  assert.ok(!html.includes('<a href=//x.co>'));
  assert.ok(html.includes(ESCAPED_PET));
  assert.ok(html.includes('Dear Dr. Asha Rao,')); // no "Dr. Dr."
});

test('escapeHtml and plainSubject', () => {
  assert.equal(escapeHtml(`<"'&>`), '&lt;&quot;&#39;&amp;&gt;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(3), '3');
  assert.equal(plainSubject('Bruno\r\nBcc: someone'), 'Bruno Bcc: someone');
});
