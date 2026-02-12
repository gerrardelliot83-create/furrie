import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors when env var is not available
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

export async function sendEmail(options: SendEmailOptions) {
  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: 'Furrie <prescriptions@furrie.in>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Email send exception:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

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
      <div style="background: #770002; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">FURRIE</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Veterinary Teleconsultation</p>
      </div>
      <div style="padding: 32px 24px; background: #ffffff;">
        <p style="font-size: 16px; color: #333; margin: 0 0 16px 0;">Dear ${params.customerName},</p>
        <p style="font-size: 16px; color: #333; margin: 0 0 16px 0;">
          Your prescription for <strong>${params.petName}</strong> is now ready.
        </p>
        <div style="background: #f8f8f8; border-left: 4px solid #770002; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Prescription Number</p>
          <p style="margin: 0; color: #333; font-size: 18px; font-weight: 600;">${params.prescriptionNumber}</p>
        </div>
        <p style="font-size: 16px; color: #333; margin: 0 0 16px 0;">
          Dr. ${params.vetName} has completed your teleconsultation and prescribed the attached medication for ${params.petName}.
        </p>
        <p style="font-size: 16px; color: #333; margin: 0 0 16px 0;">
          The prescription PDF is attached to this email. You can also access it anytime through the Furrie app.
        </p>
        <p style="font-size: 16px; color: #333; margin: 32px 0 0 0;">
          Best regards,<br>
          <strong>The Furrie Team</strong>
        </p>
      </div>
      <div style="background: #f5f5f5; padding: 16px 24px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #999;">
          This is an automated message from Furrie. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.customerEmail,
    subject: `Prescription for ${params.petName} - ${params.prescriptionNumber}`,
    html,
    attachments: [{
      filename: `prescription-${params.prescriptionNumber}.pdf`,
      content: params.pdfBuffer,
    }],
  });
}
