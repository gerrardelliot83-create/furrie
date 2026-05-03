import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Privacy Policy - Furrie',
};

const sectionStyle = { marginBottom: '2rem' };
const h2Style = { fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' } as const;
const h3Style = { fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' } as const;
const pStyle = { color: '#444' };
const pSpacedStyle = { color: '#444', marginBottom: '0.75rem' };
const ulStyle = { color: '#444', paddingLeft: '1.5rem' };
const ulSpacedStyle = { color: '#444', paddingLeft: '1.5rem', marginBottom: '0.75rem' };
const indentStyle = { color: '#444', paddingLeft: '1.5rem', marginBottom: '0.25rem' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.9rem' } as const;
const thStyle = { textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #ddd', color: '#333', fontWeight: 600 } as const;
const tdStyle = { padding: '0.5rem', borderBottom: '1px solid #eee', color: '#444', verticalAlign: 'top' } as const;

export default function PrivacyPage() {
  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Privacy Policy</h1>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
        <strong>Furrie</strong> — Veterinary Teleconsultation Platform
      </p>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
        <strong>Operated by:</strong> Pakta Technologies (OPC) Pvt. Ltd., operating under the trade name &quot;Furrie&quot;
      </p>
      <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Effective Date: 10 April 2026</p>
      <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '2rem' }}>Last Updated: 10 April 2026</p>

      {/* Section 1 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>1. Introduction</h2>
        <p style={pSpacedStyle}>
          1.1. Pakta Technologies (OPC) Pvt. Ltd., operating under the trade name &quot;Furrie&quot;
          (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the veterinary teleconsultation platform
          accessible at furrie.in, app.furrie.in, and associated applications (the &quot;Platform&quot;). This
          Privacy Policy explains how we collect, use, store, share, and protect your personal data when you
          use the Platform.
        </p>
        <p style={pSpacedStyle}>
          1.2. We are committed to processing your data in compliance with the Information Technology Act, 2000,
          the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data
          or Information) Rules, 2011, the Digital Personal Data Protection Act, 2023 (&quot;DPDP Act&quot;),
          and other applicable Indian laws.
        </p>
        <p style={pStyle}>
          1.3. By using the Platform, you consent to the collection and processing of your data as described in
          this Privacy Policy. If you do not consent, please do not use the Platform.
        </p>
      </section>

      {/* Section 2 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>2. Data Controller</h2>
        <p style={pSpacedStyle}>
          2.1. For the purposes of applicable data protection legislation, the data controller is:
        </p>
        <div style={{ paddingLeft: '1.5rem', color: '#444', marginBottom: '0.75rem' }}>
          <p style={{ marginBottom: '0.25rem' }}><strong>Pakta Technologies (OPC) Pvt. Ltd.</strong></p>
          <p style={{ marginBottom: '0.25rem' }}>Operating under the trade name &quot;Furrie&quot;</p>
          <p style={{ marginBottom: '0.25rem' }}>Mumbai, Maharashtra, India</p>
          <p>
            Email:{' '}
            <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a>
          </p>
        </div>
      </section>

      {/* Section 3 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>3. Categories of Personal Data We Collect</h2>

        <h3 style={h3Style}>3.1. Data You Provide Directly</h3>
        <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Data Elements</th>
                <th style={thStyle}>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}><strong>Account Data</strong></td>
                <td style={tdStyle}>Full name, email address, phone number, profile photograph</td>
                <td style={tdStyle}>Account creation, authentication, communication</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Pet Health Data</strong></td>
                <td style={tdStyle}>Pet name, species, breed, date of birth, approximate age, weight, gender, allergies, current medications, pre-existing conditions, vaccination records, dietary details, photographs, videos of symptoms</td>
                <td style={tdStyle}>Veterinary consultation, treatment planning, care plan creation</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Consultation Data</strong></td>
                <td style={tdStyle}>Concerns described, symptom selections, uploaded photos/videos of symptoms, video call recordings (when recording is enabled), in-call text chat, follow-up messages</td>
                <td style={tdStyle}>Clinical assessment, treatment documentation, quality assurance</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Treatment Records</strong></td>
                <td style={tdStyle}>SOAP notes (created by Veterinarians), Treatment Plans (observations, diagnosis, lab tests, medications, dietary advice, home care, warning signs, follow-up instructions), Care Plans and step responses</td>
                <td style={tdStyle}>Continuity of veterinary care, medical record keeping</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Payment Data</strong></td>
                <td style={tdStyle}>Pack purchase/request records, transaction amounts, transaction status</td>
                <td style={tdStyle}>Service delivery, billing, accounting</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Communication Data</strong></td>
                <td style={tdStyle}>Emails sent/received, support enquiries, feedback, ratings</td>
                <td style={tdStyle}>Service improvement, dispute resolution</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Invite Data</strong></td>
                <td style={tdStyle}>Invite code, referrer/invitee relationship</td>
                <td style={tdStyle}>Referral programme administration</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 style={h3Style}>3.2. Data Collected Automatically</h3>
        <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Data Elements</th>
                <th style={thStyle}>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}><strong>Device Data</strong></td>
                <td style={tdStyle}>Browser type and version, operating system, screen resolution, device identifiers</td>
                <td style={tdStyle}>Platform compatibility, debugging</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Usage Data</strong></td>
                <td style={tdStyle}>Pages visited, features used, click patterns, session duration, timestamps</td>
                <td style={tdStyle}>Analytics, service improvement</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Network Data</strong></td>
                <td style={tdStyle}>IP address, approximate geolocation (city-level, derived from IP)</td>
                <td style={tdStyle}>Security, fraud prevention, compliance</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Error Data</strong></td>
                <td style={tdStyle}>JavaScript errors, API failures, performance metrics</td>
                <td style={tdStyle}>Bug identification, reliability improvement</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 style={h3Style}>3.3. Data from Third Parties</h3>
        <p style={pSpacedStyle}>We may receive limited data from:</p>
        <ul style={ulStyle}>
          <li><strong>Authentication providers</strong> (Supabase Auth): email confirmation status, session tokens.</li>
          <li><strong>Payment processors</strong> (when enabled): transaction success/failure status, transaction reference ID. We do <strong>not</strong> receive or store your credit/debit card numbers, UPI PINs, or bank account details.</li>
        </ul>
      </section>

      {/* Section 4 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>4. Sensitive Personal Data</h2>
        <p style={pSpacedStyle}>
          4.1. Under Indian law, &quot;sensitive personal data or information&quot; includes medical records and
          history. Your <strong>Pet Health Data</strong> and <strong>Treatment Records</strong> are treated as
          sensitive personal data.
        </p>
        <p style={pSpacedStyle}>
          4.2. We collect and process this sensitive data based on your <strong>explicit consent</strong>, which
          you provide by:
        </p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) creating an account and registering a pet;</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) booking and participating in a consultation;</p>
          <p style={{ marginBottom: '0.25rem' }}>(c) continuing to use the Platform after being presented with this Privacy Policy.</p>
        </div>
        <p style={{ ...pStyle, marginTop: '0.75rem' }}>
          4.3. You may withdraw consent at any time by emailing{' '}
          <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a>.
          Withdrawal of consent may result in our inability to provide certain services (e.g., veterinary
          consultations require access to pet health data).
        </p>
      </section>

      {/* Section 5 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>5. How We Use Your Data</h2>
        <p style={pSpacedStyle}>5.1. We process your personal data for the following purposes:</p>
        <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Purpose</th>
                <th style={thStyle}>Legal Basis</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Providing and operating the teleconsultation service</td>
                <td style={tdStyle}>Performance of service / Consent</td>
              </tr>
              <tr>
                <td style={tdStyle}>Matching you with available Veterinarians</td>
                <td style={tdStyle}>Performance of service</td>
              </tr>
              <tr>
                <td style={tdStyle}>Enabling Veterinarians to assess your pet&apos;s health and create Treatment Plans</td>
                <td style={tdStyle}>Consent (sensitive data)</td>
              </tr>
              <tr>
                <td style={tdStyle}>Creating and managing Care Plans and tracking step completion</td>
                <td style={tdStyle}>Consent</td>
              </tr>
              <tr>
                <td style={tdStyle}>Processing payments and managing consultation credits</td>
                <td style={tdStyle}>Performance of service</td>
              </tr>
              <tr>
                <td style={tdStyle}>Sending appointment reminders, Treatment Plan emails, and service notifications</td>
                <td style={tdStyle}>Consent / Legitimate interest</td>
              </tr>
              <tr>
                <td style={tdStyle}>Administering the invite/referral programme</td>
                <td style={tdStyle}>Performance of service</td>
              </tr>
              <tr>
                <td style={tdStyle}>Monitoring service quality through consultation recordings (when recording is enabled)</td>
                <td style={tdStyle}>Consent (obtained in-session via notice-based continuation)</td>
              </tr>
              <tr>
                <td style={tdStyle}>Improving the Platform through anonymised usage analytics</td>
                <td style={tdStyle}>Legitimate interest</td>
              </tr>
              <tr>
                <td style={tdStyle}>Detecting and preventing fraud, abuse, and security incidents</td>
                <td style={tdStyle}>Legitimate interest / Legal obligation</td>
              </tr>
              <tr>
                <td style={tdStyle}>Complying with applicable laws and responding to lawful government requests</td>
                <td style={tdStyle}>Legal obligation</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={pSpacedStyle}>
          5.2. We do <strong>not</strong> sell, rent, or trade your personal data to any third party for their
          marketing purposes.
        </p>
        <p style={pStyle}>
          5.3. We do <strong>not</strong> use your data for automated decision-making or profiling that produces
          legal effects concerning you.
        </p>
      </section>

      {/* Section 6 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>6. Data Sharing</h2>
        <p style={pSpacedStyle}>
          6.1. We share your data only with the following categories of recipients, and only to the extent
          necessary for the stated purpose:
        </p>

        <h3 style={h3Style}>6.1.1. Veterinarians on the Platform</h3>
        <p style={pSpacedStyle}>
          Your Pet Health Data, consultation media, and contact details are shared with the Veterinarian
          assigned to your consultation so they can provide clinical advice. Veterinarians are bound by
          professional confidentiality obligations under the Indian Veterinary Council Act, 1984.
        </p>

        <h3 style={h3Style}>6.1.2. Third-Party Service Providers</h3>
        <p style={pSpacedStyle}>We use the following trusted service providers to operate the Platform:</p>
        <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Provider</th>
                <th style={thStyle}>Service</th>
                <th style={thStyle}>Data Shared</th>
                <th style={thStyle}>Data Location</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}><strong>Supabase</strong></td>
                <td style={tdStyle}>Database, authentication</td>
                <td style={tdStyle}>Account data, pet data, consultation records</td>
                <td style={tdStyle}>Singapore (AWS ap-southeast-1)</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Daily.co</strong></td>
                <td style={tdStyle}>Video consultation infrastructure</td>
                <td style={tdStyle}>Video/audio streams, participant metadata</td>
                <td style={tdStyle}>Cloud (US/EU)</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>UploadThing</strong></td>
                <td style={tdStyle}>File and image storage</td>
                <td style={tdStyle}>Pet photos, consultation media, Treatment Plan PDFs</td>
                <td style={tdStyle}>Cloud (US)</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Resend</strong></td>
                <td style={tdStyle}>Transactional email delivery</td>
                <td style={tdStyle}>Email addresses, email content (names, plan numbers)</td>
                <td style={tdStyle}>US</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Sentry</strong></td>
                <td style={tdStyle}>Error monitoring</td>
                <td style={tdStyle}>Anonymised error traces, device metadata</td>
                <td style={tdStyle}>US</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Vercel</strong></td>
                <td style={tdStyle}>Platform hosting</td>
                <td style={tdStyle}>Request logs, IP addresses (transient)</td>
                <td style={tdStyle}>Edge network (global)</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Cashfree</strong> (when enabled)</td>
                <td style={tdStyle}>Payment processing</td>
                <td style={tdStyle}>Transaction metadata, amounts</td>
                <td style={tdStyle}>India</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={pSpacedStyle}>
          Each provider processes data under their own privacy policies and is contractually obligated to use
          data only for the services they provide to us.
        </p>

        <h3 style={h3Style}>6.1.3. Legal and Regulatory Authorities</h3>
        <p style={pSpacedStyle}>
          We may disclose personal data if required by law, regulation, legal process, or governmental request,
          including in response to:
        </p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) a court order or subpoena;</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) a request from a law enforcement or regulatory authority;</p>
          <p style={{ marginBottom: '0.25rem' }}>(c) the need to protect the safety of any person or animal.</p>
        </div>

        <h3 style={{ ...h3Style, marginTop: '1rem' }}>6.1.4. Business Transfers</h3>
        <p style={pStyle}>
          In the event of a merger, acquisition, reorganisation, or sale of assets, your personal data may be
          transferred to the successor entity, subject to this Privacy Policy.
        </p>
      </section>

      {/* Section 7 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>7. Data Retention</h2>
        <p style={pSpacedStyle}>7.1. We retain your data for the following periods:</p>
        <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Data Type</th>
                <th style={thStyle}>Retention Period</th>
                <th style={thStyle}>Rationale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Account Data</td>
                <td style={tdStyle}>Duration of active account + 3 years after deletion request</td>
                <td style={tdStyle}>Continuity of service, legal/accounting obligations</td>
              </tr>
              <tr>
                <td style={tdStyle}>Pet Health Data and Treatment Records</td>
                <td style={tdStyle}>Duration of active account + 5 years after deletion</td>
                <td style={tdStyle}>Veterinary record-keeping obligations, continuity of care</td>
              </tr>
              <tr>
                <td style={tdStyle}>Consultation Recordings</td>
                <td style={tdStyle}>90 days from consultation date, or longer if under dispute</td>
                <td style={tdStyle}>Quality assurance, dispute resolution</td>
              </tr>
              <tr>
                <td style={tdStyle}>Follow-up Messages</td>
                <td style={tdStyle}>1 year from thread creation</td>
                <td style={tdStyle}>Service continuity</td>
              </tr>
              <tr>
                <td style={tdStyle}>Payment Records</td>
                <td style={tdStyle}>7 years</td>
                <td style={tdStyle}>Indian tax and accounting regulations</td>
              </tr>
              <tr>
                <td style={tdStyle}>Usage/Analytics Data</td>
                <td style={tdStyle}>2 years (anonymised after 6 months)</td>
                <td style={tdStyle}>Platform improvement</td>
              </tr>
              <tr>
                <td style={tdStyle}>Error Logs</td>
                <td style={tdStyle}>90 days</td>
                <td style={tdStyle}>Debugging</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={pSpacedStyle}>7.2. Upon account deletion request, we will:</p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) delete or anonymise your account data within thirty (30) days;</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) retain pet health records and treatment records for the minimum period required for veterinary and legal record-keeping;</p>
          <p style={{ marginBottom: '0.25rem' }}>(c) delete consultation recordings within ninety (90) days unless subject to an ongoing dispute or legal hold.</p>
        </div>
      </section>

      {/* Section 8 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>8. Data Security</h2>
        <p style={pSpacedStyle}>8.1. We implement the following technical and organisational security measures:</p>
        <ul style={ulSpacedStyle}>
          <li><strong>Encryption in transit:</strong> All data transmitted between your device and our servers is encrypted using TLS 1.2 or higher (HTTPS).</li>
          <li><strong>Encryption at rest:</strong> Database contents are encrypted at rest using AES-256 encryption provided by our database hosting provider.</li>
          <li><strong>Row-Level Security (RLS):</strong> Database access policies ensure that Customers can only access their own data and Veterinarians can only access data for their assigned consultations.</li>
          <li><strong>Role-based access control:</strong> The Platform enforces distinct access levels for Customers, Veterinarians, and Administrators.</li>
          <li><strong>Authentication security:</strong> OTP-based authentication with rate limiting, session management via secure HTTP-only cookies, and JWT verification on every server-side request.</li>
          <li><strong>Security headers:</strong> HTTP Strict Transport Security (HSTS), Content Security Policy (CSP), X-Frame-Options, and other protective headers.</li>
          <li><strong>Error monitoring:</strong> We use Sentry for real-time error detection. Error reports are anonymised and do not contain personal health data.</li>
          <li><strong>Access logging:</strong> Administrative actions are logged in an append-only audit trail.</li>
        </ul>
        <p style={pSpacedStyle}>
          8.2. While we implement reasonable security measures in accordance with the Information Technology
          (Reasonable Security Practices and Procedures) Rules, 2011, no method of electronic transmission or
          storage is completely secure. We cannot guarantee absolute security.
        </p>
        <p style={pStyle}>
          8.3. In the event of a data breach that is likely to result in a risk to your rights, we will notify
          affected users and the relevant authorities in accordance with applicable law.
        </p>
      </section>

      {/* Section 9 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>9. Your Rights</h2>
        <p style={pSpacedStyle}>
          9.1. Under the DPDP Act, 2023 and other applicable laws, you have the following rights as a Data Principal:
        </p>
        <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Right</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>How to Exercise</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}><strong>Right to Access</strong></td>
                <td style={tdStyle}>Obtain confirmation of whether we process your personal data and access to that data</td>
                <td style={tdStyle}>Email <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a></td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Right to Correction</strong></td>
                <td style={tdStyle}>Request correction of inaccurate or incomplete personal data</td>
                <td style={tdStyle}>Edit in-app or email <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a></td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Right to Erasure</strong></td>
                <td style={tdStyle}>Request deletion of your personal data, subject to legal retention obligations</td>
                <td style={tdStyle}>Email <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a></td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Right to Withdraw Consent</strong></td>
                <td style={tdStyle}>Withdraw previously given consent for data processing</td>
                <td style={tdStyle}>Email <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a></td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Right to Nominate</strong></td>
                <td style={tdStyle}>Nominate another individual to exercise your rights in case of death or incapacity (per DPDP Act)</td>
                <td style={tdStyle}>Email <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a></td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Right to Grievance Redressal</strong></td>
                <td style={tdStyle}>Lodge a complaint about our data processing</td>
                <td style={tdStyle}>Email <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={pSpacedStyle}>
          9.2. We will respond to your request within thirty (30) days. In complex cases, we may extend this by
          an additional fifteen (15) days, with written notice to you of the reason for the extension.
        </p>
        <p style={pStyle}>
          9.3. We may request verification of your identity before processing requests to access, correct, or
          delete personal data.
        </p>
      </section>

      {/* Section 10 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>10. Children&apos;s Privacy</h2>
        <p style={pSpacedStyle}>
          10.1. The Platform is not directed to individuals under the age of eighteen (18). We do not knowingly
          collect personal data from individuals under eighteen (18).
        </p>
        <p style={pStyle}>
          10.2. If we become aware that we have collected personal data from an individual under eighteen (18),
          we will delete such data promptly.
        </p>
      </section>

      {/* Section 11 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>11. Cookies and Tracking Technologies</h2>
        <p style={pSpacedStyle}>
          11.1. The Platform uses the following categories of cookies and similar technologies:
        </p>
        <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Purpose</th>
                <th style={thStyle}>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}><strong>Essential cookies</strong></td>
                <td style={tdStyle}>Authentication session management, CSRF protection</td>
                <td style={tdStyle}>Session / 7 days</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Functional cookies</strong></td>
                <td style={tdStyle}>Language preferences, UI state</td>
                <td style={tdStyle}>1 year</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Analytics</strong></td>
                <td style={tdStyle}>Anonymised usage patterns via Vercel Analytics (first-party, privacy-friendly)</td>
                <td style={tdStyle}>24 hours</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={pSpacedStyle}>
          11.2. We do <strong>not</strong> use third-party advertising cookies or cross-site tracking pixels.
        </p>
        <p style={pStyle}>
          11.3. You can manage cookie preferences through your browser settings. Disabling essential cookies
          may prevent the Platform from functioning correctly.
        </p>
      </section>

      {/* Section 12 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>12. Cross-Border Data Transfers</h2>
        <p style={pSpacedStyle}>
          12.1. Some of our third-party service providers (see Section 6.1.2) process data outside of India,
          primarily in the United States and Singapore.
        </p>
        <p style={pSpacedStyle}>12.2. Where data is transferred outside India, we ensure that:</p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) the transfer is necessary for the performance of the service;</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) the recipient provides an adequate level of data protection through contractual commitments or recognised certifications;</p>
          <p style={{ marginBottom: '0.25rem' }}>(c) the transfer complies with the provisions of the DPDP Act, 2023 regarding cross-border data transfers.</p>
        </div>
      </section>

      {/* Section 13 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>13. Changes to This Privacy Policy</h2>
        <p style={pSpacedStyle}>
          13.1. We may update this Privacy Policy from time to time to reflect changes in our practices, legal
          requirements, or the services we offer.
        </p>
        <p style={pSpacedStyle}>13.2. Material changes will be notified via:</p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) email to the address associated with your account; and/or</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) a prominent notice on the Platform.</p>
        </div>
        <p style={{ ...pStyle, marginTop: '0.75rem' }}>
          13.3. Your continued use of the Platform after the updated Policy takes effect constitutes your
          acceptance of the changes.
        </p>
      </section>

      {/* Section 14 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>14. Grievance Officer</h2>
        <p style={pSpacedStyle}>
          14.1. In compliance with the Information Technology Act, 2000 and rules thereunder, we have appointed
          a Grievance Officer:
        </p>
        <div style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem', color: '#444' }}>
          <p style={{ marginBottom: '0.25rem' }}><strong>Name:</strong> Aenesh Angshu Sengupta</p>
          <p style={{ marginBottom: '0.25rem' }}>
            <strong>Email:</strong>{' '}
            <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a>
          </p>
          <p><strong>Response Time:</strong> Acknowledgement within forty-eight (48) hours; resolution within fifteen (15) days.</p>
        </div>
        <p style={pStyle}>
          14.2. If you are not satisfied with the resolution provided by our Grievance Officer, you may escalate
          your complaint to the Data Protection Board of India (once constituted under the DPDP Act) or the
          appropriate consumer forum.
        </p>
      </section>

      {/* Section 15 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>15. Data Protection Officer</h2>
        <p style={pSpacedStyle}>15.1. For data protection enquiries, you may contact:</p>
        <div style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem', color: '#444' }}>
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a>
          </p>
        </div>
        <p style={pStyle}>
          We will designate a formal Data Protection Officer as required once the relevant provisions of the
          DPDP Act, 2023 come into force.
        </p>
      </section>

      {/* Section 16 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>16. Contact</h2>
        <p style={pSpacedStyle}>For any questions, concerns, or requests regarding this Privacy Policy:</p>
        <div style={{ paddingLeft: '1.5rem', color: '#444' }}>
          <p style={{ marginBottom: '0.25rem' }}>
            <strong>Email:</strong>{' '}
            <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a>
          </p>
          <p style={{ marginBottom: '0.25rem' }}>
            <strong>Grievance Officer:</strong> Aenesh Angshu Sengupta (
            <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a>)
          </p>
          <p><strong>Website:</strong> <a href="https://furrie.in" style={{ color: 'var(--color-primary)' }}>https://furrie.in</a></p>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '2rem 0' }} />
      <p style={{ color: '#888', fontSize: '0.875rem', fontStyle: 'italic' }}>
        Pakta Technologies (OPC) Pvt. Ltd., operating under the trade name &quot;Furrie&quot;
      </p>
      <p style={{ color: '#888', fontSize: '0.875rem', fontStyle: 'italic' }}>
        Mumbai, Maharashtra, India
      </p>
    </div>
  );
}
