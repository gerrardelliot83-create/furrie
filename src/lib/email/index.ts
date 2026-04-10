import { Resend } from 'resend';
import * as templates from './templates';

// Lazy initialization to avoid build-time errors when env var is not available
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('[EMAIL FATAL] RESEND_API_KEY is not set. All emails will fail.');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

// From addresses
const FROM_NOTIFICATIONS = 'Furrie <notifications@furrie.in>';
const FROM_PRESCRIPTIONS = 'Furrie <prescriptions@furrie.in>';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

export async function sendEmail(options: SendEmailOptions) {
  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: options.from || FROM_NOTIFICATIONS,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    if (error) {
      const resendError = error as { statusCode?: number; name?: string; message: string };
      console.error('[EMAIL ERROR]', {
        to: options.to,
        subject: options.subject,
        statusCode: resendError.statusCode,
        errorName: resendError.name,
        errorMessage: resendError.message,
      });
      return { success: false, error: error.message };
    }

    console.log('[EMAIL SENT]', {
      to: options.to,
      subject: options.subject,
      messageId: data?.id,
    });
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[EMAIL EXCEPTION]', {
      to: options.to,
      subject: options.subject,
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, error: 'Failed to send email' };
  }
}

// =============================================================================
// Treatment Plan Email
// =============================================================================
/**
 * Sends the finalized Treatment Plan PDF to the pet parent.
 * Uses the prescriptions@ address (retained during cosmetic rename).
 *
 * The old `sendPrescriptionEmail` is kept as a thin alias below for
 * back-compat with the legacy /api/prescriptions/generate-pdf route.
 */
export async function sendTreatmentPlanEmail(params: {
  customerEmail: string;
  customerName: string;
  petName: string;
  vetName: string;
  planNumber: string;
  pdfBuffer: Buffer;
}) {
  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #FAFBFD;">
      <div style="background: #1E5081; padding: 28px 24px 20px 24px; text-align: center;">
        <img src="https://app.furrie.in/assets/logo/furrie-logo-dark-blue.png" alt="Furrie" style="height: 42px; width: auto;" />
        <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Veterinary Document</p>
        <h1 style="color: #ffffff; margin: 4px 0 0 0; font-size: 22px; font-weight: 700; letter-spacing: 0.2px;">Treatment Plan</h1>
      </div>
      <div style="height: 4px; background: #c8d69b;"></div>

      <div style="padding: 32px 24px; background: #ffffff;">
        <p style="font-size: 16px; color: #0E1A2B; line-height: 1.6; margin: 0 0 16px 0;">Dear ${params.customerName},</p>
        <p style="font-size: 15px; color: #0E1A2B; line-height: 1.65; margin: 0 0 20px 0;">
          Dr. ${params.vetName} has prepared a detailed treatment plan for <strong>${params.petName}</strong>. The complete plan — including observations, diagnosis, recommended lab tests, medications, diet and home care — is attached to this email as a PDF.
        </p>

        <div style="background: #E8EFF7; border-left: 4px solid #3971B8; padding: 14px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 4px 0; color: #1E5081; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700;">Plan Reference</p>
          <p style="margin: 0; color: #0E1A2B; font-size: 18px; font-weight: 700; font-family: monospace;">${params.planNumber}</p>
        </div>

        <h3 style="font-size: 14px; color: #1E5081; margin: 24px 0 8px 0; letter-spacing: 0.3px;">What to do next</h3>
        <ul style="font-size: 14px; color: #0E1A2B; line-height: 1.7; margin: 0 0 20px 0; padding-left: 20px;">
          <li>Open the attached PDF and read each section carefully.</li>
          <li>Follow the medication schedule exactly — dose, frequency and duration matter.</li>
          <li>Get any recommended lab tests done within the timeframe indicated.</li>
          <li>Watch for the warning signs listed in the plan. If you see any, contact us immediately.</li>
        </ul>

        <p style="font-size: 14px; color: #55637A; line-height: 1.6; margin: 20px 0;">
          You can also access this treatment plan any time from ${params.petName}&apos;s profile in the Furrie app. If anything is unclear, reach out to Dr. ${params.vetName} through your follow-up thread.
        </p>

        <div style="border-top: 1px solid #E2E6EE; margin-top: 24px; padding-top: 16px;">
          <p style="font-size: 12px; color: #8892A5; line-height: 1.55; margin: 0 0 8px 0;">
            <strong style="color: #55637A;">Important:</strong> This treatment plan was prepared based on a teleconsultation. Teleconsultation has inherent limitations. If ${params.petName}&apos;s condition changes, worsens, or does not improve as expected, please seek in-person veterinary care immediately.
          </p>
        </div>

        <p style="font-size: 15px; color: #0E1A2B; line-height: 1.6; margin: 24px 0 0 0;">
          <strong>Team Furrie</strong>
        </p>
      </div>

      <div style="background: #F1F3F8; padding: 16px 24px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #8892A5;">
          This is an automated message from Furrie. Please do not reply unless instructed to in the email above.
        </p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #8892A5;">
          Furrie &mdash; Veterinary Teleconsultation &mdash; India
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.customerEmail,
    subject: `Treatment plan for ${params.petName} — ${params.planNumber}`,
    html,
    from: FROM_PRESCRIPTIONS,
    attachments: [
      {
        filename: `treatment-plan-${params.planNumber}.pdf`,
        content: params.pdfBuffer,
      },
    ],
  });
}

// =============================================================================
// Prescription Email (legacy — kept for /api/prescriptions/generate-pdf)
// =============================================================================
export async function sendPrescriptionEmail(params: {
  customerEmail: string;
  customerName: string;
  petName: string;
  vetName: string;
  prescriptionNumber: string;
  pdfBuffer: Buffer;
}) {
  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
      <div style="background: #1E5081; padding: 24px; text-align: center;">
        <img src="https://app.furrie.in/assets/logo/furrie-logo-dark-blue.png" alt="Furrie" style="height: 40px; width: auto;" />
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Veterinary Teleconsultation</p>
      </div>
      <div style="padding: 32px 24px; background: #ffffff;">
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 16px 0;">Dear ${params.customerName},</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 16px 0;">
          Dr. ${params.vetName} has prepared a treatment plan for ${params.petName}. The complete plan is attached to this email as a PDF.
        </p>
        <div style="background: #f8f8f8; border-left: 4px solid #1E5081; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 4px 0; color: #666; font-size: 13px;">Treatment Plan</p>
          <p style="margin: 0; color: #333; font-size: 18px; font-weight: 600;">${params.prescriptionNumber}</p>
        </div>
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 16px 0;">
          Please review the plan carefully. It includes medication details, dosages, frequency, and any special instructions. If anything is unclear, reach out to Dr. ${params.vetName} through your follow-up thread or book a follow-up consultation.
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 16px 0;">
          You can also access this treatment plan anytime from ${params.petName}'s profile in your Furrie dashboard.
        </p>
        <p style="font-size: 13px; color: #666; line-height: 1.6; margin: 24px 0 0 0; border-top: 1px solid #eee; padding-top: 16px;">
          This treatment plan was prepared by a licensed veterinarian based on a teleconsultation. If your pet's condition changes or worsens, please seek in-person veterinary care immediately.
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 24px 0 0 0;">
          <strong>Team Furrie</strong>
        </p>
      </div>
      <div style="background: #f5f5f5; padding: 16px 24px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #999;">
          This is an automated message from Furrie. Please do not reply unless instructed to in the email above.
        </p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #999;">
          Furrie &mdash; Veterinary Teleconsultation &mdash; India
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.customerEmail,
    subject: `Treatment plan for ${params.petName} — ${params.prescriptionNumber}`,
    html,
    from: FROM_PRESCRIPTIONS,
    attachments: [{
      filename: `treatment-plan-${params.prescriptionNumber}.pdf`,
      content: params.pdfBuffer,
    }],
  });
}

// =============================================================================
// Convenience send functions for each template
// =============================================================================

export async function sendWelcomeEmail(to: string, params: Parameters<typeof templates.welcomeEmail>[0]) {
  const { subject, html } = templates.welcomeEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendBookingConfirmationEmail(to: string, params: Parameters<typeof templates.bookingConfirmationEmail>[0]) {
  const { subject, html } = templates.bookingConfirmationEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendPaymentReceiptEmail(to: string, params: Parameters<typeof templates.paymentReceiptEmail>[0]) {
  const { subject, html } = templates.paymentReceiptEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendVetNewBookingEmail(to: string, params: Parameters<typeof templates.vetNewBookingEmail>[0]) {
  const { subject, html } = templates.vetNewBookingEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendCustomerOneHourReminderEmail(to: string, params: Parameters<typeof templates.customerOneHourReminderEmail>[0]) {
  const { subject, html } = templates.customerOneHourReminderEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendVetOneHourReminderEmail(to: string, params: Parameters<typeof templates.vetOneHourReminderEmail>[0]) {
  const { subject, html } = templates.vetOneHourReminderEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendCustomerFifteenMinReminderEmail(to: string, params: Parameters<typeof templates.customerFifteenMinReminderEmail>[0]) {
  const { subject, html } = templates.customerFifteenMinReminderEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendVetFifteenMinReminderEmail(to: string, params: Parameters<typeof templates.vetFifteenMinReminderEmail>[0]) {
  const { subject, html } = templates.vetFifteenMinReminderEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendConsultationCompletedEmail(to: string, params: Parameters<typeof templates.consultationCompletedEmail>[0]) {
  const { subject, html } = templates.consultationCompletedEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendFollowUpAvailableEmail(to: string, params: Parameters<typeof templates.followUpAvailableEmail>[0]) {
  const { subject, html } = templates.followUpAvailableEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendMissedAppointmentEmail(to: string, params: Parameters<typeof templates.missedAppointmentEmail>[0]) {
  const { subject, html } = templates.missedAppointmentEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendPlusActivatedEmail(to: string, params: Parameters<typeof templates.plusActivatedEmail>[0]) {
  const { subject, html } = templates.plusActivatedEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendSubscriptionExpiredEmail(to: string, params: Parameters<typeof templates.subscriptionExpiredEmail>[0]) {
  const { subject, html } = templates.subscriptionExpiredEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendVetWelcomeEmail(to: string, params: Parameters<typeof templates.vetWelcomeEmail>[0]) {
  const { subject, html } = templates.vetWelcomeEmail(params);
  return sendEmail({ to, subject, html });
}

export async function sendCarePlanCreatedEmail(to: string, params: Parameters<typeof templates.carePlanCreatedEmail>[0]) {
  const { subject, html } = templates.carePlanCreatedEmail(params);
  return sendEmail({ to, subject, html });
}

// =============================================================================
// Consultation Credit Request Emails
// =============================================================================

/**
 * Sent to the customer when their credit request is submitted.
 */
export async function sendCreditRequestReceivedEmail(params: {
  customerEmail: string;
  customerName: string;
  quantity: number;
}) {
  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1E5081; padding: 24px; text-align: center;">
        <img src="https://app.furrie.in/assets/logo/furrie-logo-dark-blue.png" alt="Furrie" style="height: 40px; width: auto;" />
      </div>
      <div style="height: 4px; background: #c8d69b;"></div>
      <div style="padding: 32px 24px; background: #ffffff;">
        <p style="font-size: 16px; color: #0E1A2B; margin: 0 0 16px;">Dear ${params.customerName},</p>
        <p style="font-size: 15px; color: #0E1A2B; line-height: 1.65; margin: 0 0 20px;">
          We received your request for <strong>${params.quantity} consultation${params.quantity === 1 ? '' : 's'}</strong>.
          Our team will reach out to you shortly to coordinate the details.
        </p>
        <p style="font-size: 14px; color: #55637A; line-height: 1.5; margin: 0 0 24px;">
          Once your consultations are activated, you will receive a confirmation email and
          the credits will appear on your dashboard immediately.
        </p>
        <p style="font-size: 15px; color: #0E1A2B; margin: 24px 0 0;"><strong>Team Furrie</strong></p>
      </div>
      <div style="background: #F1F3F8; padding: 16px 24px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #8892A5;">Furrie — Veterinary Teleconsultation — India</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.customerEmail,
    subject: `We received your consultation request`,
    html,
  });
}

/**
 * Sent to the ops team when a new credit request comes in.
 */
export async function sendCreditRequestInternalEmail(params: {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  quantity: number;
  preferredContact: string | null;
  note: string | null;
}) {
  const opsEmail = process.env.OPS_NOTIFICATION_EMAIL;
  if (!opsEmail) {
    console.warn('[EMAIL] OPS_NOTIFICATION_EMAIL not set — skipping internal notification');
    return { success: false, error: 'OPS_NOTIFICATION_EMAIL not configured' };
  }

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1E5081; padding: 16px 24px;">
        <h2 style="color: #fff; margin: 0; font-size: 16px;">New Consultation Request</h2>
      </div>
      <div style="padding: 24px; background: #fff; border: 1px solid #E2E6EE;">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #55637A; width: 130px;">Customer</td><td style="padding: 6px 0; color: #0E1A2B;">${params.customerName}</td></tr>
          <tr><td style="padding: 6px 0; color: #55637A;">Email</td><td style="padding: 6px 0;">${params.customerEmail}</td></tr>
          <tr><td style="padding: 6px 0; color: #55637A;">Phone</td><td style="padding: 6px 0;">${params.customerPhone || '—'}</td></tr>
          <tr><td style="padding: 6px 0; color: #55637A;">Quantity</td><td style="padding: 6px 0; font-weight: 700;">${params.quantity} consultations</td></tr>
          <tr><td style="padding: 6px 0; color: #55637A;">Contact via</td><td style="padding: 6px 0;">${params.preferredContact || '—'}</td></tr>
          ${params.note ? `<tr><td style="padding: 6px 0; color: #55637A; vertical-align: top;">Note</td><td style="padding: 6px 0;">${params.note}</td></tr>` : ''}
        </table>
        <p style="margin: 20px 0 0; font-size: 13px; color: #55637A;">
          Go to Admin Portal → Credit Requests to process this request.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: opsEmail,
    subject: `[Action Required] ${params.customerName} requested ${params.quantity} consultations`,
    html,
  });
}

/**
 * Sent to the customer when admin grants credits.
 */
export async function sendCreditsAddedEmail(params: {
  customerEmail: string;
  customerName: string;
  quantity: number;
}) {
  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1E5081; padding: 24px; text-align: center;">
        <img src="https://app.furrie.in/assets/logo/furrie-logo-dark-blue.png" alt="Furrie" style="height: 40px; width: auto;" />
      </div>
      <div style="height: 4px; background: #c8d69b;"></div>
      <div style="padding: 32px 24px; background: #ffffff;">
        <p style="font-size: 16px; color: #0E1A2B; margin: 0 0 16px;">Dear ${params.customerName},</p>
        <p style="font-size: 15px; color: #0E1A2B; line-height: 1.65; margin: 0 0 20px;">
          <strong>${params.quantity} consultation${params.quantity === 1 ? '' : 's'}</strong>
          ${params.quantity === 1 ? 'has' : 'have'} been added to your account. You can start booking right away!
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://app.furrie.in/connect" style="display: inline-block; padding: 12px 28px; background: #1E5081; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            Book a Consultation
          </a>
        </div>
        <p style="font-size: 15px; color: #0E1A2B; margin: 24px 0 0;"><strong>Team Furrie</strong></p>
      </div>
      <div style="background: #F1F3F8; padding: 16px 24px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #8892A5;">Furrie — Veterinary Teleconsultation — India</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.customerEmail,
    subject: `${params.quantity} consultation${params.quantity === 1 ? '' : 's'} added to your account`,
    html,
  });
}
