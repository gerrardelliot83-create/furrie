/**
 * Email Templates for Furrie
 *
 * All 14 notification emails wrapped in a consistent branded frame.
 * Logo is loaded from the production domain as an absolute URL.
 */

const LOGO_URL = 'https://app.furrie.in/assets/furrie-logo.png';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.furrie.in';
const VET_URL = 'https://vet.furrie.in';

function wrapEmailBody(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: system-ui, -apple-system, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: #770002; padding: 24px; text-align: center;">
      <img src="${LOGO_URL}" alt="Furrie" style="height: 40px; width: auto;" />
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Veterinary Teleconsultation</p>
    </div>
    <div style="padding: 32px 24px;">
      ${bodyHtml}
    </div>
    <div style="background: #f5f5f5; padding: 16px 24px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        This is an automated message from Furrie. Please do not reply to this email.
      </p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #999;">
        Furrie Veterinary Teleconsultation &bull; India
      </p>
    </div>
  </div>
</body>
</html>`;
}

// Shared styles
const btnPrimary = 'display: inline-block; padding: 12px 32px; background-color: #770002; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;';
const infoBox = 'background: #f8f8f8; border-left: 4px solid #770002; padding: 16px; margin: 24px 0;';
const textStyle = 'font-size: 16px; color: #333; margin: 0 0 16px 0;';
const labelStyle = 'margin: 0 0 4px 0; color: #666; font-size: 13px;';
const valueStyle = 'margin: 0 0 12px 0; color: #333; font-size: 16px; font-weight: 600;';

function formatDateTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoDate;
  }
}

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

// =============================================================================
// Template 1: Customer Welcome
// =============================================================================
export function welcomeEmail(params: {
  customerName: string;
}): { subject: string; html: string } {
  return {
    subject: 'Welcome to Furrie!',
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear ${params.customerName},</p>
      <p style="${textStyle}">
        Welcome to Furrie! We're glad you've joined India's trusted veterinary teleconsultation platform.
      </p>
      <p style="${textStyle}">With Furrie, you can:</p>
      <ul style="font-size: 16px; color: #333; margin: 0 0 24px 0; padding-left: 20px; line-height: 1.8;">
        <li>Connect with licensed veterinarians via video call</li>
        <li>Get prescriptions delivered digitally</li>
        <li>Manage your pet's health records in one place</li>
        <li>Access follow-up consultations within 7 days</li>
      </ul>
      <p style="${textStyle}">
        Start by adding your pet's profile, then book your first consultation.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/pets/new" style="${btnPrimary}">Add Your Pet</a>
      </div>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 2: Booking Confirmation (Customer)
// =============================================================================
export function bookingConfirmationEmail(params: {
  customerName: string;
  petName: string;
  vetName: string;
  scheduledAt: string;
  consultationNumber: string;
}): { subject: string; html: string } {
  return {
    subject: `Consultation Booked - ${params.consultationNumber}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear ${params.customerName},</p>
      <p style="${textStyle}">
        Your consultation for <strong>${params.petName}</strong> has been successfully booked.
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Consultation Number</p>
        <p style="${valueStyle}">${params.consultationNumber}</p>
        <p style="${labelStyle}">Veterinarian</p>
        <p style="${valueStyle}">Dr. ${params.vetName}</p>
        <p style="${labelStyle}">Scheduled For</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDateTime(params.scheduledAt)}</p>
      </div>
      <p style="${textStyle}">
        You'll receive a reminder 1 hour and 15 minutes before your appointment. You can join the video call 5 minutes before the scheduled time.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/consultations" style="${btnPrimary}">View Consultation</a>
      </div>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 3: Payment Receipt (Customer)
// =============================================================================
export function paymentReceiptEmail(params: {
  customerName: string;
  petName: string;
  consultationNumber: string;
  amount: number;
  paymentId: string;
  paidAt: string;
}): { subject: string; html: string } {
  return {
    subject: `Payment Receipt - ${params.consultationNumber}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear ${params.customerName},</p>
      <p style="${textStyle}">Your payment has been received successfully.</p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Consultation</p>
        <p style="${valueStyle}">${params.consultationNumber} (${params.petName})</p>
        <p style="${labelStyle}">Amount Paid</p>
        <p style="${valueStyle}">Rs. ${params.amount}</p>
        <p style="${labelStyle}">Payment ID</p>
        <p style="${valueStyle}">${params.paymentId}</p>
        <p style="${labelStyle}">Date</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDate(params.paidAt)}</p>
      </div>
      <p style="font-size: 13px; color: #666; margin: 24px 0 0 0;">
        This serves as your digital receipt. For any payment-related queries, please contact support.
      </p>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 4: New Booking Notification (Vet)
// =============================================================================
export function vetNewBookingEmail(params: {
  vetName: string;
  customerName: string;
  petName: string;
  petSpecies: string;
  scheduledAt: string;
  consultationNumber: string;
  isPriority: boolean;
}): { subject: string; html: string } {
  const priorityBadge = params.isPriority
    ? '<span style="display: inline-block; background: #FDB603; color: #333; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 8px;">PLUS</span>'
    : '';

  return {
    subject: `New Consultation Assigned - ${params.consultationNumber}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear Dr. ${params.vetName},</p>
      <p style="${textStyle}">
        A new consultation has been assigned to you.${priorityBadge}
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Consultation Number</p>
        <p style="${valueStyle}">${params.consultationNumber}</p>
        <p style="${labelStyle}">Pet Parent</p>
        <p style="${valueStyle}">${params.customerName}</p>
        <p style="${labelStyle}">Pet</p>
        <p style="${valueStyle}">${params.petName} (${params.petSpecies})</p>
        <p style="${labelStyle}">Scheduled For</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDateTime(params.scheduledAt)}</p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${VET_URL}/consultations" style="${btnPrimary}">View Dashboard</a>
      </div>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 5: 1-Hour Reminder (Customer)
// =============================================================================
export function customerOneHourReminderEmail(params: {
  customerName: string;
  petName: string;
  vetName: string;
  scheduledAt: string;
}): { subject: string; html: string } {
  return {
    subject: `Reminder: Consultation in 1 Hour - ${params.petName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear ${params.customerName},</p>
      <p style="${textStyle}">
        Your consultation for <strong>${params.petName}</strong> with Dr. ${params.vetName} is in <strong>1 hour</strong>.
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Appointment Time</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDateTime(params.scheduledAt)}</p>
      </div>
      <p style="${textStyle}">
        Please ensure you have a stable internet connection and are in a quiet area for the video call.
      </p>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 6: 1-Hour Reminder (Vet)
// =============================================================================
export function vetOneHourReminderEmail(params: {
  vetName: string;
  petName: string;
  customerName: string;
  scheduledAt: string;
}): { subject: string; html: string } {
  return {
    subject: `Reminder: Consultation in 1 Hour - ${params.petName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear Dr. ${params.vetName},</p>
      <p style="${textStyle}">
        You have a consultation for <strong>${params.petName}</strong> (${params.customerName}) in <strong>1 hour</strong>.
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Appointment Time</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDateTime(params.scheduledAt)}</p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${VET_URL}/consultations" style="${btnPrimary}">View Dashboard</a>
      </div>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 7: 15-Minute Reminder + Join Link (Customer)
// =============================================================================
export function customerFifteenMinReminderEmail(params: {
  customerName: string;
  petName: string;
  vetName: string;
  consultationId: string;
}): { subject: string; html: string } {
  return {
    subject: `Starting Soon: Consultation for ${params.petName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear ${params.customerName},</p>
      <p style="${textStyle}">
        Your consultation for <strong>${params.petName}</strong> with Dr. ${params.vetName} starts in <strong>15 minutes</strong>.
      </p>
      <p style="${textStyle}">
        You can join the video call now. Please have any relevant pet documents or photos ready.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/consultations/${params.consultationId}/video" style="${btnPrimary}">Join Video Call</a>
      </div>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 8: 15-Minute Reminder + Join Link (Vet)
// =============================================================================
export function vetFifteenMinReminderEmail(params: {
  vetName: string;
  petName: string;
  customerName: string;
  consultationId: string;
}): { subject: string; html: string } {
  return {
    subject: `Starting Soon: Consultation for ${params.petName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear Dr. ${params.vetName},</p>
      <p style="${textStyle}">
        Your consultation for <strong>${params.petName}</strong> (${params.customerName}) starts in <strong>15 minutes</strong>.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${VET_URL}/consultations/${params.consultationId}" style="${btnPrimary}">Open Consultation</a>
      </div>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 9: Consultation Completed (Customer)
// =============================================================================
export function consultationCompletedEmail(params: {
  customerName: string;
  petName: string;
  vetName: string;
  consultationId: string;
}): { subject: string; html: string } {
  return {
    subject: `Consultation Completed - ${params.petName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear ${params.customerName},</p>
      <p style="${textStyle}">
        Your consultation for <strong>${params.petName}</strong> with Dr. ${params.vetName} has been completed.
      </p>
      <p style="${textStyle}">
        The vet may have generated a prescription which you can access from your dashboard. You can also rate your experience to help us improve.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/consultations/${params.consultationId}" style="${btnPrimary}">View Details</a>
      </div>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 10: Follow-Up Thread Available (Customer)
// =============================================================================
export function followUpAvailableEmail(params: {
  customerName: string;
  petName: string;
  vetName: string;
  expiresAt: string;
  consultationId: string;
}): { subject: string; html: string } {
  return {
    subject: `Follow-Up Available - ${params.petName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear ${params.customerName},</p>
      <p style="${textStyle}">
        A follow-up thread has been created for <strong>${params.petName}</strong>'s recent consultation with Dr. ${params.vetName}.
      </p>
      <p style="${textStyle}">
        You can send follow-up messages to the vet until <strong>${formatDate(params.expiresAt)}</strong>.
        Use this to report on your pet's progress or ask clarifying questions.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/consultations/${params.consultationId}" style="${btnPrimary}">Open Follow-Up</a>
      </div>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 11: Missed Appointment (Customer)
// =============================================================================
export function missedAppointmentEmail(params: {
  customerName: string;
  petName: string;
  scheduledAt: string;
}): { subject: string; html: string } {
  return {
    subject: `Missed Appointment - ${params.petName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear ${params.customerName},</p>
      <p style="${textStyle}">
        Unfortunately, the consultation for <strong>${params.petName}</strong> scheduled for
        <strong>${formatDateTime(params.scheduledAt)}</strong> was missed.
      </p>
      <p style="${textStyle}">
        If you still need veterinary care, please book a new consultation at your convenience.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/connect" style="${btnPrimary}">Book New Consultation</a>
      </div>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 12: Plus Subscription Activated (Customer)
// =============================================================================
export function plusActivatedEmail(params: {
  customerName: string;
  petName: string;
  expiresAt: string;
}): { subject: string; html: string } {
  return {
    subject: `Furrie Plus Activated for ${params.petName}!`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear ${params.customerName},</p>
      <p style="${textStyle}">
        Furrie Plus has been activated for <strong>${params.petName}</strong>!
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Plan</p>
        <p style="${valueStyle}">Furrie Plus</p>
        <p style="${labelStyle}">Valid Until</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDate(params.expiresAt)}</p>
      </div>
      <p style="${textStyle}">Your Furrie Plus benefits include:</p>
      <ul style="font-size: 16px; color: #333; margin: 0 0 24px 0; padding-left: 20px; line-height: 1.8;">
        <li>Unlimited consultations during your subscription</li>
        <li>Priority matching with top-rated veterinarians</li>
        <li>Extended follow-up window</li>
        <li>No per-consultation charges</li>
      </ul>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/connect" style="${btnPrimary}">Book a Consultation</a>
      </div>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 13: Subscription Expired (Customer)
// =============================================================================
export function subscriptionExpiredEmail(params: {
  customerName: string;
  petName: string;
  expiredAt: string;
}): { subject: string; html: string } {
  return {
    subject: `Furrie Plus Expired - ${params.petName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear ${params.customerName},</p>
      <p style="${textStyle}">
        Your Furrie Plus subscription for <strong>${params.petName}</strong> expired on <strong>${formatDate(params.expiredAt)}</strong>.
      </p>
      <p style="${textStyle}">
        You can still book consultations at regular per-session rates. To renew your Plus benefits, please contact our support team.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/dashboard" style="${btnPrimary}">Go to Dashboard</a>
      </div>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}

// =============================================================================
// Template 14: Vet Welcome Email (with temporary credentials)
// =============================================================================
export function vetWelcomeEmail(params: {
  vetName: string;
  email: string;
  temporaryPassword: string;
}): { subject: string; html: string } {
  return {
    subject: 'Welcome to Furrie - Your Vet Account is Ready',
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear Dr. ${params.vetName},</p>
      <p style="${textStyle}">
        Your veterinarian account on Furrie has been created. You can now access the vet portal to manage your consultations.
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Email</p>
        <p style="${valueStyle}">${params.email}</p>
        <p style="${labelStyle}">Temporary Password</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600; font-family: monospace;">${params.temporaryPassword}</p>
      </div>
      <p style="font-size: 14px; color: #c00; margin: 0 0 24px 0; font-weight: 600;">
        Please change your password after your first login.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${VET_URL}/login" style="${btnPrimary}">Login to Vet Portal</a>
      </div>
      <p style="${textStyle}">
        Best regards,<br><strong>The Furrie Team</strong>
      </p>
    `),
  };
}
