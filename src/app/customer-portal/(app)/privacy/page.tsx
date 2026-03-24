import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Furrie',
};

export default function PrivacyPage() {
  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Privacy Policy</h1>
      <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '2rem' }}>Last updated: March 2026</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>1. Introduction</h2>
        <p style={{ color: '#444' }}>
          Furrie (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the veterinary teleconsultation platform
          at furrie.in. We are committed to protecting your personal information and your right to privacy.
          This Privacy Policy explains what information we collect, how we use it, and your rights regarding
          that information.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>2. Information We Collect</h2>
        <p style={{ color: '#444', marginBottom: '0.75rem' }}>We collect information that you provide directly to us:</p>
        <ul style={{ color: '#444', paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
          <li><strong>Account Information:</strong> Name, email address, phone number when you create an account.</li>
          <li><strong>Pet Information:</strong> Your pet&apos;s name, species, breed, age, weight, medical history, allergies, medications, vaccination records, and photos you upload.</li>
          <li><strong>Consultation Data:</strong> Concerns you describe, symptom selections, video consultation recordings (when enabled), chat messages, and SOAP notes created by veterinarians.</li>
          <li><strong>Payment Information:</strong> Transaction records. We do not store credit/debit card numbers directly; payment processing is handled by our payment partner.</li>
        </ul>
        <p style={{ color: '#444' }}>
          We also automatically collect device information, IP addresses, and usage analytics to improve our service.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>3. How We Use Your Information</h2>
        <ul style={{ color: '#444', paddingLeft: '1.5rem' }}>
          <li>To provide and operate our veterinary teleconsultation service</li>
          <li>To match you with available veterinarians and schedule consultations</li>
          <li>To enable veterinarians to provide accurate assessments of your pet&apos;s health</li>
          <li>To create and manage care plans, prescriptions, and treatment plans</li>
          <li>To send appointment reminders and service notifications via email</li>
          <li>To process payments and manage consultation packs</li>
          <li>To improve our platform, monitor service quality, and fix technical issues</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>4. Third-Party Services</h2>
        <p style={{ color: '#444', marginBottom: '0.75rem' }}>We use trusted third-party services to operate our platform:</p>
        <ul style={{ color: '#444', paddingLeft: '1.5rem' }}>
          <li><strong>Supabase:</strong> Database and authentication services</li>
          <li><strong>Daily.co:</strong> Video consultation infrastructure</li>
          <li><strong>Resend:</strong> Email delivery</li>
          <li><strong>UploadThing:</strong> Secure file and image uploads</li>
          <li><strong>Sentry:</strong> Error monitoring and performance tracking</li>
          <li><strong>Vercel:</strong> Platform hosting</li>
        </ul>
        <p style={{ color: '#444', marginTop: '0.75rem' }}>
          Each of these services has their own privacy policies. We only share the minimum data necessary
          for each service to function.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>5. Data Security</h2>
        <p style={{ color: '#444' }}>
          We implement appropriate technical and organisational security measures to protect your personal
          data, including encrypted connections (HTTPS/TLS), row-level database security policies,
          role-based access controls, and secure authentication. Veterinary records are only accessible
          to you and the veterinarian assigned to your consultation.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>6. Data Retention</h2>
        <p style={{ color: '#444' }}>
          We retain your account and pet information for as long as your account is active. Consultation
          records, SOAP notes, and care plans are retained to maintain continuity of veterinary care.
          You may request deletion of your account and associated data by contacting us.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>7. Your Rights</h2>
        <p style={{ color: '#444', marginBottom: '0.75rem' }}>You have the right to:</p>
        <ul style={{ color: '#444', paddingLeft: '1.5rem' }}>
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your account and personal data</li>
          <li>Withdraw consent for optional data processing</li>
          <li>Receive a copy of your data in a portable format</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>8. Children&apos;s Privacy</h2>
        <p style={{ color: '#444' }}>
          Our service is not directed to individuals under 18. We do not knowingly collect personal
          information from children. If you are under 18, please use our platform with the consent and
          supervision of a parent or guardian.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>9. Changes to This Policy</h2>
        <p style={{ color: '#444' }}>
          We may update this Privacy Policy from time to time. We will notify you of any material changes
          by email or by posting a notice on our platform. Your continued use of the service after changes
          are posted constitutes acceptance of the updated policy.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>10. Contact Us</h2>
        <p style={{ color: '#444' }}>
          If you have any questions about this Privacy Policy or wish to exercise your rights,
          please contact us at <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a>.
        </p>
      </section>
    </div>
  );
}
