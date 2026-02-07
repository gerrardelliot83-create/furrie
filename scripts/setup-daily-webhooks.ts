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
 * - DAILY_API_KEY must be set in .env.local
 * - Your webhook endpoint must be publicly accessible
 *
 * For local development, use ngrok:
 * ngrok http 3000
 * Then update WEBHOOK_URL below with your ngrok URL
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from project root
config({ path: resolve(process.cwd(), '.env.local') });

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

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

async function listWebhooks(): Promise<WebhookResponse[]> {
  const response = await fetch(`${DAILY_API_URL}/webhooks`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${DAILY_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error: WebhookError = await response.json();
    throw new Error(`Failed to list webhooks: ${error.error || error.info}`);
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
    }),
  });

  if (!response.ok) {
    const error: WebhookError = await response.json();
    throw new Error(`Failed to create webhook: ${error.error || error.info}`);
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
    throw new Error(`Failed to delete webhook: ${error.error || error.info}`);
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Daily.co Webhook Setup for Furrie');
  console.log('='.repeat(50));

  if (!DAILY_API_KEY) {
    console.error('\nError: DAILY_API_KEY is not set in environment variables');
    console.error('Please add it to your .env.local file');
    process.exit(1);
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
        } else if (existingFurrieWebhook.state === 'ACTIVE') {
          console.log('\nWebhook is already active. No changes needed.');
          console.log('\nHMAC Secret (save this for signature verification):');
          console.log(`  ${existingFurrieWebhook.hmac}`);
          return;
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
    console.log(`\nHMAC Secret (save this for signature verification):`);
    console.log(`  ${webhook.hmac}`);
    console.log('\nAdd this to your .env.local:');
    console.log(`  DAILY_WEBHOOK_SECRET=${webhook.hmac}`);

  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : error);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure your webhook endpoint is publicly accessible');
    console.error('2. The endpoint must return 200 status quickly');
    console.error('3. For local testing, use ngrok: ngrok http 3000');
    console.error('4. Then update WEBHOOK_URL in this script');
    process.exit(1);
  }
}

main();
