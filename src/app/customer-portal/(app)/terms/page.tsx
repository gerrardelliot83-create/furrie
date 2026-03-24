import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Furrie',
};

export default function TermsPage() {
  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Terms of Service</h1>
      <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '2rem' }}>Last updated: March 2026</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>1. About Our Service</h2>
        <p style={{ color: '#444' }}>
          Furrie provides an online veterinary teleconsultation platform that connects pet owners with
          licensed veterinarians via video consultations. By using our platform at furrie.in, you agree
          to these Terms of Service. If you do not agree, please do not use our service.
        </p>
      </section>

      <section style={{ marginBottom: '2rem', padding: '1rem', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: '#856404' }}>
          Important: Not for Emergencies
        </h2>
        <p style={{ color: '#856404' }}>
          <strong>Furrie is NOT an emergency veterinary service.</strong> If your pet is experiencing a
          life-threatening emergency — such as difficulty breathing, severe bleeding, poisoning, seizures,
          or trauma — please take your pet to the nearest emergency veterinary clinic immediately.
          Teleconsultation cannot replace hands-on emergency care.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>2. Teleconsultation Limitations</h2>
        <p style={{ color: '#444', marginBottom: '0.75rem' }}>By using Furrie, you acknowledge and understand that:</p>
        <ul style={{ color: '#444', paddingLeft: '1.5rem' }}>
          <li>Teleconsultations are conducted remotely via video. The veterinarian cannot physically examine your pet.</li>
          <li>Diagnoses provided are provisional and based on the information you share and what the veterinarian can observe via video.</li>
          <li>The veterinarian may recommend an in-person visit for a complete physical examination, diagnostic tests, or procedures that cannot be performed remotely.</li>
          <li>Teleconsultation is suitable for general wellness questions, minor concerns, follow-up care, and triage, but may not be appropriate for all conditions.</li>
          <li>You are responsible for providing accurate and complete information about your pet&apos;s health, symptoms, and medical history.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>3. User Accounts</h2>
        <ul style={{ color: '#444', paddingLeft: '1.5rem' }}>
          <li>You must provide accurate information when creating your account.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must be at least 18 years old to create an account, or use the service under parental supervision.</li>
          <li>One account per person. Do not share your account with others.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>4. Consultations</h2>
        <ul style={{ color: '#444', paddingLeft: '1.5rem' }}>
          <li>Consultations are scheduled in 30-minute slots. You must join within 5 minutes before to 45 minutes after the scheduled time.</li>
          <li>Consultations not joined within the join window will be marked as missed.</li>
          <li>Cancelled consultations are subject to our cancellation policy.</li>
          <li>Follow-up consultations are available within 24 hours of the original consultation (or longer for Furrie Plus subscribers).</li>
          <li>Video consultations may be recorded for quality assurance purposes when recording is enabled.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>5. Consultation Packs</h2>
        <p style={{ color: '#444', marginBottom: '0.75rem' }}>
          Consultation packs provide bundled sessions at discounted rates:
        </p>
        <ul style={{ color: '#444', paddingLeft: '1.5rem' }}>
          <li>Packs are non-refundable once purchased.</li>
          <li>Pack credits have an expiration period from the date of purchase.</li>
          <li>Unused credits are forfeited upon expiration.</li>
          <li>Packs are non-transferable between accounts.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>6. Veterinarians</h2>
        <p style={{ color: '#444' }}>
          All veterinarians on the Furrie platform are licensed professionals registered with the
          Veterinary Council of India (VCI) or their respective state veterinary councils. Veterinarians
          are verified by Furrie before being granted access to the platform. However, Furrie acts as a
          technology platform connecting pet owners with veterinarians and is not itself a veterinary
          practice.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>7. Payments</h2>
        <ul style={{ color: '#444', paddingLeft: '1.5rem' }}>
          <li>All prices are displayed in Indian Rupees (INR) and include applicable taxes unless stated otherwise.</li>
          <li>Payments are processed securely through our payment partner.</li>
          <li>Refunds are handled on a case-by-case basis. Consultations that were completed are generally not eligible for refunds.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>8. Content and Intellectual Property</h2>
        <p style={{ color: '#444' }}>
          All content on the Furrie platform, including text, graphics, logos, and software, is the
          property of Furrie or its licensors. You may not reproduce, distribute, or create derivative
          works from our content without written permission. You retain ownership of content you upload
          (pet photos, medical documents) but grant us a licence to use it for providing our services.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>9. Limitation of Liability</h2>
        <p style={{ color: '#444' }}>
          To the maximum extent permitted by law, Furrie shall not be liable for any indirect, incidental,
          special, consequential, or punitive damages arising from your use of the service. Our total
          liability for any claim related to the service shall not exceed the amount you paid to Furrie
          in the 12 months preceding the claim. Furrie is a technology platform and does not provide
          veterinary medical advice directly.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>10. Changes to These Terms</h2>
        <p style={{ color: '#444' }}>
          We may update these Terms of Service from time to time. We will notify you of material changes
          by email or by posting a notice on our platform. Your continued use of the service after changes
          are posted constitutes acceptance of the updated terms.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>11. Governing Law</h2>
        <p style={{ color: '#444' }}>
          These Terms shall be governed by and construed in accordance with the laws of India.
          Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the
          courts in Bengaluru, Karnataka, India.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>12. Contact Us</h2>
        <p style={{ color: '#444' }}>
          If you have any questions about these Terms of Service, please contact us
          at <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a>.
        </p>
      </section>
    </div>
  );
}
