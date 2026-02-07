import { NextRequest, NextResponse } from 'next/server';

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

// Events we want to receive
const EVENT_TYPES = [
  'recording.ready-to-download',
  'meeting.ended',
  'participant.joined',
  'participant.left',
];

interface WebhookResponse {
  uuid: string;
  url: string;
  hmac: string;
  eventTypes: string[];
  state: 'ACTIVE' | 'FAILED' | 'INACTIVE';
}

/**
 * GET /api/admin/setup-webhooks
 * Lists existing Daily.co webhooks
 *
 * This is a simple admin endpoint to help you set up webhooks after deployment.
 * Access it at: https://your-domain.vercel.app/api/admin/setup-webhooks
 */
export async function GET() {
  if (!DAILY_API_KEY) {
    return NextResponse.json(
      { error: 'DAILY_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${DAILY_API_URL}/webhooks`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Failed to list webhooks', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      message: 'Existing webhooks',
      webhooks: data.data || [],
      instructions: 'POST to this endpoint with { "webhookUrl": "your-url" } to create a webhook',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch webhooks', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/setup-webhooks
 * Creates a Daily.co webhook for this deployment
 *
 * Body: { webhookUrl?: string }
 * If webhookUrl is not provided, it will use the current domain
 *
 * Example:
 * curl -X POST https://app.furrie.in/api/admin/setup-webhooks
 */
export async function POST(request: NextRequest) {
  if (!DAILY_API_KEY) {
    return NextResponse.json(
      { error: 'DAILY_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    // Get webhook URL from body or auto-detect from request
    let webhookUrl: string;

    try {
      const body = await request.json();
      webhookUrl = body.webhookUrl;
    } catch {
      // No body provided, use auto-detection
      webhookUrl = '';
    }

    if (!webhookUrl) {
      // Auto-detect from request headers
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      webhookUrl = `${protocol}://${host}/api/daily/webhook`;
    }

    console.log('Creating webhook for:', webhookUrl);

    // First, list existing webhooks
    const listResponse = await fetch(`${DAILY_API_URL}/webhooks`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      const existingWebhooks = listData.data || [];

      // Check if a webhook for this URL already exists
      const existing = existingWebhooks.find((wh: WebhookResponse) =>
        wh.url === webhookUrl
      );

      if (existing) {
        return NextResponse.json({
          message: 'Webhook already exists',
          webhook: existing,
          hmacSecret: existing.hmac,
          instructions: 'Add DAILY_WEBHOOK_SECRET to your Vercel environment variables',
        });
      }

      // Delete any old furrie webhooks
      for (const wh of existingWebhooks) {
        if (wh.url.includes('furrie') || wh.url.includes('api/daily/webhook')) {
          console.log('Deleting old webhook:', wh.url);
          await fetch(`${DAILY_API_URL}/webhooks/${wh.uuid}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${DAILY_API_KEY}`,
            },
          });
        }
      }
    }

    // Create new webhook
    const createResponse = await fetch(`${DAILY_API_URL}/webhooks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        eventTypes: EVENT_TYPES,
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      return NextResponse.json(
        {
          error: 'Failed to create webhook',
          details: error,
          troubleshooting: [
            'Make sure your webhook endpoint is publicly accessible',
            'The endpoint must return 200 status quickly',
            'Check that the URL is correct: ' + webhookUrl,
          ],
        },
        { status: createResponse.status }
      );
    }

    const webhook: WebhookResponse = await createResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Webhook created successfully',
      webhook: {
        uuid: webhook.uuid,
        url: webhook.url,
        state: webhook.state,
        events: webhook.eventTypes,
      },
      hmacSecret: webhook.hmac,
      nextSteps: [
        '1. Go to your Vercel project settings',
        '2. Navigate to Environment Variables',
        '3. Add: DAILY_WEBHOOK_SECRET = ' + webhook.hmac,
        '4. Redeploy your application for the change to take effect',
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to setup webhook', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/setup-webhooks
 * Deletes all Daily.co webhooks for cleanup
 */
export async function DELETE() {
  if (!DAILY_API_KEY) {
    return NextResponse.json(
      { error: 'DAILY_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const listResponse = await fetch(`${DAILY_API_URL}/webhooks`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (!listResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to list webhooks' },
        { status: 500 }
      );
    }

    const listData = await listResponse.json();
    const webhooks = listData.data || [];

    const deleted: string[] = [];
    for (const wh of webhooks) {
      await fetch(`${DAILY_API_URL}/webhooks/${wh.uuid}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
      });
      deleted.push(wh.url);
    }

    return NextResponse.json({
      message: 'All webhooks deleted',
      deleted,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete webhooks', details: String(error) },
      { status: 500 }
    );
  }
}
