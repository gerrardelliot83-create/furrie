/**
 * Daily.co Webhook Setup Script
 *
 * Run this script to configure webhooks for Furrie:
 * npx ts-node scripts/setup-daily-webhooks.ts
 *
 * Or via npm script (after adding to package.json):
 * npm run setup:daily-webhooks
 *
 * Prerequisites:
 * - DAILY_API_KEY must be set (environment or .env.local)
 * - Your webhook endpoint must be publicly accessible
 *
 * Daily signs the test request it sends when a webhook is created with that
 * webhook's own secret (HMAC), and our endpoint refuses a signature it can't
 * verify. So choose the secret first and give it to both sides:
 *   1. npm run setup:daily-webhook-secret   (prints a fresh secret)
 *   2. Put it in Vercel as DAILY_WEBHOOK_SECRET (type Secret) and redeploy.
 *   3. Set DAILY_WEBHOOK_HMAC to the same value and run this script again:
 *      the webhook is created with that secret, so Daily's test passes.
 *
 * For local development, use ngrok:
 * ngrok http 3000
 * Then update WEBHOOK_URL below with your ngrok URL
 */

import { randomBytes } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from project root
config({ path: resolve(process.cwd(), '.env.local') });

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

// Optional: the secret to register the webhook with (base64). Must equal
// DAILY_WEBHOOK_SECRET in Vercel, which must be deployed before this runs.
const DAILY_WEBHOOK_HMAC = process.env.DAILY_WEBHOOK_HMAC?.trim() || undefined;

function isUsableSecret(value: string): boolean {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value) && Buffer.from(value, 'base64').length >= 16;
}

// Update this to your production URL or ngrok URL for testing
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/daily/webhook`
  : 'https://app.furrie.in/api/daily/webhook';

// Events we want to receive
// See: https://docs.daily.co/reference/rest-api/webhooks/events
const EVENT_TYPES = [
  'recording.ready-to-download',  // Recording finished and available
  'meeting.ended',                 // Meeting ended (update consultation status)
  'participant.joined',            // Track when participants join
  'participant.left',              // Track when participants leave
];

interface WebhookResponse {
  uuid: string;
  url: string;
  hmac: string;
  eventTypes: string[];
  state: 'ACTIVE' | 'FAILED' | 'INACTIVE';
  domainId: string;
  createdAt: string;
  updatedAt: string;
}

interface WebhookError {
  error?: string;
  info?: string;
}

/** Daily's short code and its explanation, e.g. "invalid-request-error: …". */
function describeError(error: WebhookError): string {
  return [error.error, error.info].filter(Boolean).join(': ') || 'unknown error';
}

async function listWebhooks(): Promise<WebhookResponse[]> {
  const response = await fetch(`${DAILY_API_URL}/webhooks`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${DAILY_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error: WebhookError = await response.json();
    throw new Error(`Failed to list webhooks: ${describeError(error)}`);
  }

  const data = await response.json();
  return data.data || [];
}

async function createWebhook(): Promise<WebhookResponse> {
  console.log(`\nCreating webhook for: ${WEBHOOK_URL}`);
  console.log(`Events: ${EVENT_TYPES.join(', ')}\n`);

  const response = await fetch(`${DAILY_API_URL}/webhooks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DAILY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      eventTypes: EVENT_TYPES,
      // With our own secret, Daily's signed test request can be verified.
      ...(DAILY_WEBHOOK_HMAC ? { hmac: DAILY_WEBHOOK_HMAC } : {}),
    }),
  });

  if (!response.ok) {
    const error: WebhookError = await response.json();
    throw new Error(`Failed to create webhook: ${describeError(error)}`);
  }

  return response.json();
}

async function deleteWebhook(uuid: string): Promise<void> {
  const response = await fetch(`${DAILY_API_URL}/webhooks/${uuid}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${DAILY_API_KEY}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error: WebhookError = await response.json();
    throw new Error(`Failed to delete webhook: ${describeError(error)}`);
  }
}

async function main() {
  if (process.argv.includes('--new-secret')) {
    const secret = randomBytes(32).toString('base64');
    console.log('\nNew webhook secret (keep it private; do not paste it into any chat):\n');
    console.log(`  ${secret}\n`);
    console.log('1. Vercel: set DAILY_WEBHOOK_SECRET to this value (type Secret), then Redeploy and wait for Ready.');
    console.log('2. Then run, in the same window:');
    console.log(`     $env:DAILY_WEBHOOK_HMAC = "${secret}"`);
    console.log('     npm.cmd run setup:daily-webhooks');
    return;
  }

  console.log('='.repeat(50));
  console.log('Daily.co Webhook Setup for Furrie');
  console.log('='.repeat(50));

  if (!DAILY_API_KEY) {
    console.error('\nError: DAILY_API_KEY is not set in environment variables');
    console.error('Please add it to your .env.local file');
    process.exitCode = 1;
    return;
  }

  if (DAILY_WEBHOOK_HMAC && !isUsableSecret(DAILY_WEBHOOK_HMAC)) {
    console.error('\nError: DAILY_WEBHOOK_HMAC is not a base64 secret of at least 16 bytes.');
    console.error('Make one with: npm.cmd run setup:daily-webhook-secret');
    process.exitCode = 1;
    return;
  }
  if (!DAILY_WEBHOOK_HMAC) {
    console.log('\nNote: DAILY_WEBHOOK_HMAC is not set, so Daily will choose the secret. Its signed test');
    console.log('request will then fail unless Vercel already has that secret. See the steps at the top of this file.');
  }

  try {
    // List existing webhooks
    console.log('\nChecking existing webhooks...');
    const existingWebhooks = await listWebhooks();

    if (existingWebhooks.length > 0) {
      console.log(`\nFound ${existingWebhooks.length} existing webhook(s):`);
      existingWebhooks.forEach((wh, i) => {
        console.log(`  ${i + 1}. ${wh.url}`);
        console.log(`     State: ${wh.state}`);
        console.log(`     Events: ${wh.eventTypes.join(', ')}`);
        console.log(`     UUID: ${wh.uuid}`);
      });

      // Check if our webhook already exists
      const existingFurrieWebhook = existingWebhooks.find(wh =>
        wh.url.includes('furrie') || wh.url.includes('api/daily/webhook')
      );

      if (existingFurrieWebhook) {
        console.log(`\nFurrie webhook already exists (${existingFurrieWebhook.state})`);

        if (existingFurrieWebhook.url !== WEBHOOK_URL) {
          console.log('\nWebhook URL has changed. Deleting old webhook...');
          await deleteWebhook(existingFurrieWebhook.uuid);
          console.log('Old webhook deleted.');
        } else if (
          existingFurrieWebhook.state === 'ACTIVE' &&
          (!DAILY_WEBHOOK_HMAC || existingFurrieWebhook.hmac === DAILY_WEBHOOK_HMAC)
        ) {
          console.log('\nWebhook is already active. No changes needed.');
          if (!DAILY_WEBHOOK_HMAC) {
            console.log('\nHMAC Secret (Vercel DAILY_WEBHOOK_SECRET must equal this):');
            console.log(`  ${existingFurrieWebhook.hmac}`);
          }
          return;
        } else if (existingFurrieWebhook.state === 'ACTIVE') {
          console.log('\nWebhook is active with a different secret. Deleting and recreating with DAILY_WEBHOOK_HMAC...');
          await deleteWebhook(existingFurrieWebhook.uuid);
        } else {
          console.log('\nWebhook exists but is not active. Deleting and recreating...');
          await deleteWebhook(existingFurrieWebhook.uuid);
        }
      }
    } else {
      console.log('\nNo existing webhooks found.');
    }

    // Create new webhook
    console.log('\nCreating new webhook...');
    const webhook = await createWebhook();

    console.log('\n' + '='.repeat(50));
    console.log('Webhook Created Successfully!');
    console.log('='.repeat(50));
    console.log(`\nURL: ${webhook.url}`);
    console.log(`State: ${webhook.state}`);
    console.log(`UUID: ${webhook.uuid}`);
    console.log(`Events: ${webhook.eventTypes.join(', ')}`);
    if (DAILY_WEBHOOK_HMAC) {
      console.log('\nRegistered with your DAILY_WEBHOOK_HMAC (the same secret as Vercel). Nothing else to copy.');
    } else {
      console.log(`\nHMAC Secret (Vercel DAILY_WEBHOOK_SECRET must equal this):`);
      console.log(`  ${webhook.hmac}`);
    }

  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : error);
    console.error('\nTroubleshooting:');
    console.error('1. Daily tests the address with a request signed by the webhook secret. Our endpoint refuses');
    console.error('   a signature it cannot verify, so Vercel DAILY_WEBHOOK_SECRET must equal DAILY_WEBHOOK_HMAC,');
    console.error('   and the Vercel redeploy must have finished before this runs.');
    console.error('2. The endpoint must be public and answer within 8 seconds.');
    console.error('3. For local testing, use ngrok (ngrok http 3000) and update WEBHOOK_URL in this script.');
    process.exitCode = 1;
  }
}

main();
