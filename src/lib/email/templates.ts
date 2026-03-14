/**
 * Email Templates for Furrie
 *
 * All 14 notification emails wrapped in a consistent branded frame.
 * Logo is loaded from the production domain as an absolute URL.
 */

const LOGO_URL = 'https://app.furrie.in/assets/logo/furrie-logo-dark-blue.png';
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
        This is an automated message from Furrie. Please do not reply unless instructed to in the email above.
      </p>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #999;">
        Furrie &mdash; Veterinary Teleconsultation &mdash; India
      </p>
    </div>
  </div>
</body>
</html>`;
}

// Shared styles
const btnPrimary = 'display: inline-block; padding: 12px 32px; background-color: #770002; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;';
const infoBox = 'background: #f8f8f8; border-left: 4px solid #770002; padding: 16px; margin: 24px 0;';
const textStyle = 'font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 16px 0;';
const labelStyle = 'margin: 0 0 4px 0; color: #666; font-size: 13px;';
const valueStyle = 'margin: 0 0 12px 0; color: #333; font-size: 16px; font-weight: 600;';

/** Generate a personalized greeting, falling back to generic "Hey there," for unknown names */
function emailGreeting(name: string): string {
  if (!name || name === 'there' || name === 'User') {
    return 'Hey there,';
  }
  return `Hey ${name},`;
}

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
    subject: `Welcome to Furrie, ${params.customerName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">${emailGreeting(params.customerName)}</p>
      <p style="${textStyle}">
        Welcome to Furrie. You now have a team of licensed veterinarians a video call away &mdash; anytime your pet needs care, guidance, or just a professional opinion.
      </p>
      <p style="${textStyle}">Here's what you can do:</p>
      <ul style="font-size: 16px; color: #333; margin: 0 0 24px 0; padding-left: 20px; line-height: 1.8;">
        <li><strong>Talk to a vet</strong> &mdash; Book a live video consultation with a licensed veterinarian. Available 24/7, anywhere in India.</li>
        <li><strong>Get a custom care plan</strong> &mdash; Every consultation ends with a plan built specifically for your pet: nutrition, recovery, special care &mdash; whatever they need.</li>
        <li><strong>Ask a vet anything</strong> &mdash; Got a quick question? Our vets are available for async Q&amp;A. No consultation needed.</li>
      </ul>
      <p style="${textStyle}">
        The best place to start is adding your pet's profile. It takes about a minute and helps our vets give better, more personalised care from the very first call.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/pets/new" style="${btnPrimary}">Add Your Pet</a>
      </div>
      <p style="${textStyle}">
        Talk soon,<br><strong>Team Furrie</strong>
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
    subject: `Confirmed — ${params.petName}'s consultation with Dr. ${params.vetName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">${emailGreeting(params.customerName)}</p>
      <p style="${textStyle}">
        You're all set. ${params.petName}'s consultation has been booked.
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Consultation</p>
        <p style="${valueStyle}">${params.consultationNumber}</p>
        <p style="${labelStyle}">Vet</p>
        <p style="${valueStyle}">Dr. ${params.vetName}</p>
        <p style="${labelStyle}">Scheduled</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDateTime(params.scheduledAt)} IST</p>
      </div>
      <p style="${textStyle}">
        We'll send you a reminder 1 hour before and again at 15 minutes with your video call link. No need to download anything &mdash; the call happens right in your browser.
      </p>
      <p style="${textStyle}"><strong>A few things that help:</strong></p>
      <ul style="font-size: 16px; color: #333; margin: 0 0 24px 0; padding-left: 20px; line-height: 1.8;">
        <li>Have ${params.petName} nearby during the call</li>
        <li>Find a quiet spot with stable internet</li>
        <li>If you have any previous health records or photos of symptoms, keep them handy</li>
      </ul>
      <p style="${textStyle}">
        You can view or manage your consultation anytime from your dashboard.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/consultations" style="${btnPrimary}">View Consultation</a>
      </div>
      <p style="${textStyle}">
        See you soon,<br><strong>Team Furrie</strong>
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
    subject: `Payment received — ${params.consultationNumber}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">${emailGreeting(params.customerName)}</p>
      <p style="${textStyle}">Your payment has been received. Here are the details for your records.</p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Consultation</p>
        <p style="${valueStyle}">${params.consultationNumber} (${params.petName})</p>
        <p style="${labelStyle}">Amount</p>
        <p style="${valueStyle}">Rs. ${params.amount}</p>
        <p style="${labelStyle}">Payment ID</p>
        <p style="${valueStyle}">${params.paymentId}</p>
        <p style="${labelStyle}">Date</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDate(params.paidAt)} IST</p>
      </div>
      <p style="${textStyle}">
        This email serves as your digital receipt. Your consultation booking confirmation has been sent separately.
      </p>
      <p style="${textStyle}">
        If anything looks off, just reply to this email and we'll sort it out.
      </p>
      <p style="${textStyle}">
        <strong>Team Furrie</strong>
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
  const priorityBlock = params.isPriority
    ? `<div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 0 0 24px 0;">
        <p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 600;">PLUS SUBSCRIBER &mdash; PRIORITY</p>
      </div>`
    : '';

  return {
    subject: `New consultation assigned — ${params.consultationNumber}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear Dr. ${params.vetName},</p>
      <p style="${textStyle}">
        A new consultation has been assigned to you.
      </p>
      ${priorityBlock}
      <div style="${infoBox}">
        <p style="${labelStyle}">Consultation</p>
        <p style="${valueStyle}">${params.consultationNumber}</p>
        <p style="${labelStyle}">Pet Parent</p>
        <p style="${valueStyle}">${params.customerName}</p>
        <p style="${labelStyle}">Pet</p>
        <p style="${valueStyle}">${params.petName} (${params.petSpecies})</p>
        <p style="${labelStyle}">Scheduled</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDateTime(params.scheduledAt)} IST</p>
      </div>
      <p style="${textStyle}">
        You'll receive a reminder 1 hour before and again at 15 minutes with the consultation link. You can view all upcoming consultations in your dashboard.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${VET_URL}/consultations" style="${btnPrimary}">View Dashboard</a>
      </div>
      <p style="${textStyle}">
        <strong>Team Furrie</strong>
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
    subject: `1 hour to go — ${params.petName}'s consultation with Dr. ${params.vetName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">${emailGreeting(params.customerName)}</p>
      <p style="${textStyle}">
        Quick reminder &mdash; ${params.petName}'s consultation with Dr. ${params.vetName} is in about an hour.
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Time</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDateTime(params.scheduledAt)} IST</p>
      </div>
      <p style="${textStyle}">A couple of things to get ready:</p>
      <ul style="font-size: 16px; color: #333; margin: 0 0 24px 0; padding-left: 20px; line-height: 1.8;">
        <li>Find a quiet spot with stable wifi</li>
        <li>Have ${params.petName} nearby (or at least within reach)</li>
        <li>Keep any health records, medication details, or symptom photos handy</li>
      </ul>
      <p style="${textStyle}">
        We'll send you the video call link 15 minutes before the consultation starts.
      </p>
      <p style="${textStyle}">
        <strong>Team Furrie</strong>
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
    subject: `1 hour to go — consultation for ${params.petName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear Dr. ${params.vetName},</p>
      <p style="${textStyle}">
        Your consultation for ${params.petName} (${params.customerName}) is scheduled in about 1 hour.
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Time</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDateTime(params.scheduledAt)} IST</p>
      </div>
      <p style="${textStyle}">
        You'll receive the consultation link 15 minutes before the session.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${VET_URL}/consultations" style="${btnPrimary}">View Dashboard</a>
      </div>
      <p style="${textStyle}">
        <strong>Team Furrie</strong>
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
    subject: `Starting soon — ${params.petName}'s consultation`,
    html: wrapEmailBody(`
      <p style="${textStyle}">${emailGreeting(params.customerName)}</p>
      <p style="${textStyle}">
        ${params.petName}'s consultation with Dr. ${params.vetName} starts in about 15 minutes.
      </p>
      <p style="${textStyle}">
        When you're ready, tap the button below to join the video call.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/consultations/${params.consultationId}/video" style="${btnPrimary}">Join Video Call</a>
      </div>
      <p style="${textStyle}">
        Make sure ${params.petName} is with you and you're somewhere with a stable connection. Dr. ${params.vetName} will be waiting.
      </p>
      <p style="${textStyle}">
        <strong>Team Furrie</strong>
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
    subject: `Starting soon — consultation for ${params.petName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear Dr. ${params.vetName},</p>
      <p style="${textStyle}">
        Your consultation for ${params.petName} (${params.customerName}) starts in about 15 minutes.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${VET_URL}/consultations/${params.consultationId}" style="${btnPrimary}">Open Consultation</a>
      </div>
      <p style="${textStyle}">
        <strong>Team Furrie</strong>
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
    subject: `${params.petName}'s consultation with Dr. ${params.vetName} — complete`,
    html: wrapEmailBody(`
      <p style="${textStyle}">${emailGreeting(params.customerName)}</p>
      <p style="${textStyle}">
        ${params.petName}'s consultation with Dr. ${params.vetName} is now complete, and the notes from your session are ready.
      </p>
      <p style="${textStyle}">
        You can view the full consultation details &mdash; including Dr. ${params.vetName}'s notes and any recommendations &mdash; in your dashboard.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/consultations/${params.consultationId}" style="${btnPrimary}">View Details</a>
      </div>
      <p style="${textStyle}">
        If Dr. ${params.vetName} has prescribed any medication or created a care plan, you'll find those in your dashboard too. And if a follow-up thread has been opened, you'll receive a separate email about that shortly.
      </p>
      <p style="${textStyle}">
        One last thing &mdash; if you have a moment, we'd appreciate your feedback on the consultation. It helps us keep the care quality high and helps Dr. ${params.vetName} continue to improve.
      </p>
      <p style="${textStyle}">
        Thank you for trusting Furrie with ${params.petName}'s care.
      </p>
      <p style="${textStyle}">
        <strong>Team Furrie</strong>
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
    subject: `Follow-up open — stay in touch with Dr. ${params.vetName} about ${params.petName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">${emailGreeting(params.customerName)}</p>
      <p style="${textStyle}">
        Dr. ${params.vetName} has opened a follow-up thread for ${params.petName}. This means you can continue the conversation &mdash; share progress updates, ask follow-up questions, or flag anything new &mdash; without booking another consultation.
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Follow-up available until</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDate(params.expiresAt)} IST</p>
      </div>
      <p style="${textStyle}">Use this thread for things like:</p>
      <ul style="font-size: 16px; color: #333; margin: 0 0 24px 0; padding-left: 20px; line-height: 1.8;">
        <li>"The medication is working / not working"</li>
        <li>"I noticed something new since our call"</li>
        <li>"Quick question about the care plan"</li>
      </ul>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/consultations/${params.consultationId}" style="${btnPrimary}">Open Follow-Up</a>
      </div>
      <p style="${textStyle}">
        Dr. ${params.vetName} will respond within the follow-up window. If anything feels urgent before then, you can always book a new consultation.
      </p>
      <p style="${textStyle}">
        <strong>Team Furrie</strong>
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
    subject: `We missed you — ${params.petName}'s consultation`,
    html: wrapEmailBody(`
      <p style="${textStyle}">${emailGreeting(params.customerName)}</p>
      <p style="${textStyle}">
        It looks like ${params.petName}'s consultation scheduled for ${formatDateTime(params.scheduledAt)} IST didn't happen &mdash; no one joined the call.
      </p>
      <p style="${textStyle}">
        No worries at all. Things come up.
      </p>
      <p style="${textStyle}">
        If ${params.petName} still needs to see a vet, you can book a new consultation whenever you're ready. Our vets are available 24/7.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/connect" style="${btnPrimary}">Book New Consultation</a>
      </div>
      <p style="${textStyle}">
        If you're having any trouble with the platform or need help with anything, just reply to this email. We're here.
      </p>
      <p style="${textStyle}">
        <strong>Team Furrie</strong>
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
    subject: `Furrie Plus is active for ${params.petName}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">${emailGreeting(params.customerName)}</p>
      <p style="${textStyle}">
        Great news &mdash; Furrie Plus is now active for ${params.petName}.
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Plan</p>
        <p style="${valueStyle}">Furrie Plus</p>
        <p style="${labelStyle}">Active until</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${formatDate(params.expiresAt)} IST</p>
      </div>
      <p style="${textStyle}">Here's what this means for ${params.petName}:</p>
      <ul style="font-size: 16px; color: #333; margin: 0 0 24px 0; padding-left: 20px; line-height: 1.8;">
        <li><strong>Unlimited consultations</strong> &mdash; Talk to a vet as often as you need. No per-consultation charges.</li>
        <li><strong>Priority vet matching</strong> &mdash; You're moved to the front of the queue when booking.</li>
        <li><strong>Extended follow-up</strong> &mdash; Longer follow-up windows with your vet after every consultation.</li>
        <li><strong>Custom care plans</strong> &mdash; Every consultation includes a personalised plan for ${params.petName}.</li>
      </ul>
      <p style="${textStyle}">
        The best way to make the most of Plus is to book a consultation whenever something comes up &mdash; even for small questions. That's what it's for.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/connect" style="${btnPrimary}">Book a Consultation</a>
      </div>
      <p style="${textStyle}">
        Welcome to Plus,<br><strong>Team Furrie</strong>
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
    subject: `Your Furrie Plus plan for ${params.petName} has ended`,
    html: wrapEmailBody(`
      <p style="${textStyle}">${emailGreeting(params.customerName)}</p>
      <p style="${textStyle}">
        Just a heads up &mdash; ${params.petName}'s Furrie Plus subscription ended on ${formatDate(params.expiredAt)} IST.
      </p>
      <p style="${textStyle}">
        This means unlimited consultations and priority matching are no longer active. But you can still book consultations at our standard rate anytime.
      </p>
      <p style="${textStyle}">
        If you'd like to renew Plus, get in touch with us and we'll get you set up again.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/dashboard" style="${btnPrimary}">Go to Dashboard</a>
      </div>
      <p style="${textStyle}">
        We're still here for ${params.petName} whenever you need us.
      </p>
      <p style="${textStyle}">
        <strong>Team Furrie</strong>
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
    subject: `Welcome to Furrie, Dr. ${params.vetName} — your account is ready`,
    html: wrapEmailBody(`
      <p style="${textStyle}">Dear Dr. ${params.vetName},</p>
      <p style="${textStyle}">
        Welcome to Furrie. We're glad to have you on the platform.
      </p>
      <p style="${textStyle}">
        Your vet account has been created. Here are your login credentials:
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Email</p>
        <p style="${valueStyle}">${params.email}</p>
        <p style="${labelStyle}">Temporary Password</p>
        <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600; font-family: monospace;">${params.temporaryPassword}</p>
      </div>
      <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 12px 16px; margin: 0 0 24px 0;">
        <p style="margin: 0; color: #991B1B; font-size: 14px; font-weight: 600;">
          Important: Please change your password immediately after your first login. This temporary password will remain active until you do, and we strongly recommend updating it before your first consultation.
        </p>
      </div>
      <p style="${textStyle}">
        Once you're logged in, you'll be able to view your consultation schedule, conduct video consultations, submit notes, create care plans, and manage prescriptions &mdash; all from your vet dashboard.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${VET_URL}/login" style="${btnPrimary}">Login to Vet Portal</a>
      </div>
      <p style="${textStyle}">
        If you have any questions about the platform or need support getting set up, reply to this email. We're here to help.
      </p>
      <p style="${textStyle}">
        Welcome aboard,<br><strong>Team Furrie</strong>
      </p>
    `),
  };
}

// ─── 15. New Care Plan Created ─────────────────────────────────────────────────
export function carePlanCreatedEmail(params: {
  customerName: string;
  petName: string;
  vetName: string;
  planTitle: string;
  planCategory: string;
  stepCount: number;
  petId: string;
}): { subject: string; html: string } {
  const { customerName, petName, vetName, planTitle, planCategory, stepCount, petId } = params;
  return {
    subject: `${petName}'s new care plan — ${planTitle}`,
    html: wrapEmailBody(`
      <p style="${textStyle}">${emailGreeting(customerName)}</p>
      <p style="${textStyle}">
        Dr. ${vetName} has created a new care plan for ${petName}.
      </p>
      <div style="${infoBox}">
        <p style="${labelStyle}">Plan</p>
        <p style="${valueStyle}">${planTitle}</p>
        <p style="${labelStyle}">Category</p>
        <p style="${valueStyle}">${planCategory.charAt(0).toUpperCase() + planCategory.slice(1)}</p>
        <p style="${labelStyle}">Steps</p>
        <p style="${valueStyle}">${stepCount} step${stepCount !== 1 ? 's' : ''}</p>
      </div>
      <p style="${textStyle}">
        This plan was built specifically for ${petName} based on your consultation. You'll find each step laid out clearly in your dashboard &mdash; what to do, when to do it, and what to watch for.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/pets/${petId}" style="${btnPrimary}">View Care Plan</a>
      </div>
      <p style="${textStyle}">
        If you have questions about any of the steps, you can use your follow-up thread or book a quick consultation with Dr. ${vetName}.
      </p>
      <p style="${textStyle}">
        <strong>Team Furrie</strong>
      </p>
    `),
  };
}
